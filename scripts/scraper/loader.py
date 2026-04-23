"""
Loads scraped BOM JSON data from data/ into PostgreSQL.

Movies get a placeholder negative tmdb_id (hash of title+studio) until an
enrichment pass with the real TMDB API fills in the correct values.

Usage:
  py -3 loader.py                 # load all years in data/
  py -3 loader.py --year 2023     # load one year
  py -3 loader.py --dry-run       # show stats, no DB writes

Requires DATABASE_URL in .env (copy .env.example → .env and fill it in).
"""
import argparse
import hashlib
import json
import os
import re
from datetime import datetime
from pathlib import Path

from dotenv import load_dotenv
import psycopg2
from psycopg2.extras import execute_values

load_dotenv()
DATA_DIR = Path(__file__).parent / "data"


def placeholder_tmdb_id(title: str, studio: str | None) -> int:
    # Stable negative int so the same movie always maps to the same row.
    # Negative range avoids collisions with real TMDB IDs (always positive).
    key = f"{title.lower()}|{(studio or '').lower()}"
    h = int(hashlib.md5(key.encode()).hexdigest(), 16)
    return -(h % 2_000_000_000) - 1


def parse_release_date(s: str | None) -> str | None:
    if not s:
        return None
    for fmt in ("%b %d, %Y", "%B %d, %Y", "%Y-%m-%d", "%b. %d, %Y"):
        try:
            return datetime.strptime(s.strip(), fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue
    return None


def load_year(cur, year: int, dry_run: bool) -> int:
    path = DATA_DIR / f"{year}.json"
    if not path.exists():
        print(f"  {year}: no data file — run scraper.py first")
        return 0

    try:
        rows: list[dict] = json.loads(path.read_text(encoding="utf-8"))
    except UnicodeDecodeError:
        rows = json.loads(path.read_text(encoding="cp1252"))
    if not rows:
        print(f"  {year}: empty, skipping")
        return 0

    # Drop rows where date parsing fell back to week ID (e.g. "1982W48")
    valid_rows = [r for r in rows if re.match(r"\d{4}-\d{2}-\d{2}", r.get("chart_date", ""))]
    if len(valid_rows) < len(rows):
        print(f"  {year}: skipping {len(rows) - len(valid_rows)} rows with unparseable dates")
    rows = valid_rows

    # Collect per-movie info: earliest release_date wins
    movie_info: dict[tuple[str, str | None], dict] = {}
    for r in rows:
        key = (r["title"], r.get("studio"))
        rd = parse_release_date(r.get("release_date"))
        prev = movie_info.get(key, {})
        prev_rd = prev.get("release_date")
        if rd and (not prev_rd or rd < prev_rd):
            movie_info[key] = {"release_date": rd}
        elif key not in movie_info:
            movie_info[key] = {"release_date": None}

    if dry_run:
        charts = len(set(r["chart_date"] for r in rows))
        print(f"  {year}: {len(rows)} rows across {charts} weekends, "
              f"{len(movie_info)} unique movies (dry run)")
        return len(rows)

    # Upsert movies — use placeholder tmdb_id, update title/studio on conflict
    title_to_db_id: dict[str, int] = {}
    for (title, studio), info in movie_info.items():
        tid = placeholder_tmdb_id(title, studio)
        cur.execute("""
            INSERT INTO "Movie" (tmdb_id, title, studio, release_date, created_at, updated_at)
            VALUES (%s, %s, %s, %s::date, now(), now())
            ON CONFLICT (tmdb_id) DO UPDATE SET
                title      = EXCLUDED.title,
                updated_at = now()
            RETURNING id
        """, (tid, title, studio, info.get("release_date")))
        title_to_db_id[title] = cur.fetchone()[0]

    # Insert WeeklyChart rows (top N chart per weekend)
    weekly_rows = [
        (
            r["chart_date"], r["rank"], title_to_db_id[r["title"]],
            r.get("weekend_gross"), r.get("gross_change_pct"),
            r.get("cumulative_gross"), r.get("theaters"), r.get("weeks_in_release"),
        )
        for r in rows if r["title"] in title_to_db_id
    ]
    execute_values(cur, """
        INSERT INTO "WeeklyChart"
            (chart_date, rank, movie_id, weekend_gross, gross_change_pct,
             cumulative_gross, theaters, weeks_in_release)
        VALUES %s
        ON CONFLICT (chart_date, rank) DO UPDATE SET
            weekend_gross    = EXCLUDED.weekend_gross,
            gross_change_pct = EXCLUDED.gross_change_pct,
            cumulative_gross = EXCLUDED.cumulative_gross,
            theaters         = EXCLUDED.theaters
    """, weekly_rows, page_size=200)

    # Insert Gross rows (per-movie weekly breakdown)
    gross_rows = [
        (
            title_to_db_id[r["title"]], r["chart_date"], r["rank"],
            r.get("weekend_gross"), r.get("cumulative_gross"),
            r.get("theaters"), r.get("weeks_in_release"),
        )
        for r in rows if r["title"] in title_to_db_id
    ]
    execute_values(cur, """
        INSERT INTO "Gross"
            (movie_id, week_date, rank, weekend_gross, domestic_cumulative,
             theaters, weeks_in_release)
        VALUES %s
        ON CONFLICT (movie_id, week_date) DO NOTHING
    """, gross_rows, page_size=200)

    charts = len(set(r["chart_date"] for r in rows))
    print(f"  {year}: {len(rows)} rows, {charts} weekends, {len(movie_info)} movies")
    return len(rows)


def main() -> None:
    ap = argparse.ArgumentParser(description="Load scraped BOM data into PostgreSQL")
    ap.add_argument("--year", type=int)
    ap.add_argument("--dry-run", action="store_true", help="print stats, skip DB writes")
    args = ap.parse_args()

    conn = cur = None
    if not args.dry_run:
        db_url = os.environ.get("DATABASE_URL")
        if not db_url:
            raise SystemExit("DATABASE_URL not set — copy .env.example to .env and fill it in")
        conn = psycopg2.connect(
            db_url,
            keepalives=1,
            keepalives_idle=30,
            keepalives_interval=10,
            keepalives_count=5,
        )
        cur = conn.cursor()

    years = (
        [args.year] if args.year
        else sorted(int(f.stem) for f in DATA_DIR.glob("*.json"))
    )
    if not years:
        raise SystemExit("No JSON files in data/ — run scraper.py first")

    total = 0
    for y in years:
        total += load_year(cur, y, dry_run=args.dry_run)
        if conn:
            conn.commit()

    if conn:
        conn.close()

    print(f"\nTotal: {total:,} rows")


if __name__ == "__main__":
    main()
