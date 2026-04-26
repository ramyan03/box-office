"""
Enriches existing Movie rows (placeholder tmdb_id < 0) with real TMDB data:
poster, genres, accurate release date, real tmdb_id.

Usage:
  py -3 enrich.py                    # enrich all, newest first
  py -3 enrich.py --from 2020        # only movies released 2020+
  py -3 enrich.py --limit 500        # stop after 500 matches
  py -3 enrich.py --dry-run

At ~0.3s/request, 1000 movies takes ~5 min. Full DB (~30k) takes ~3hr.
Run --from 2015 first for the most visible results.

Requires DATABASE_URL and TMDB_ACCESS_TOKEN in .env
"""
import sys
import argparse
import os
import time
import json
import re
import urllib.request
import urllib.parse
from datetime import datetime
from dotenv import load_dotenv
import psycopg2

# Force UTF-8 output so non-ASCII titles (e.g. macron characters) don't crash on Windows CP1252
if sys.stdout.encoding != 'utf-8':
    sys.stdout = open(sys.stdout.fileno(), mode='w', encoding='utf-8', buffering=1)

load_dotenv()

TMDB_BASE = "https://api.themoviedb.org/3"
DELAY = 0.3

GENRE_MAP = {
    28: "Action", 12: "Adventure", 16: "Animation", 35: "Comedy",
    80: "Crime", 99: "Documentary", 18: "Drama", 10751: "Family",
    14: "Fantasy", 36: "History", 27: "Horror", 10402: "Music",
    9648: "Mystery", 10749: "Romance", 878: "Science Fiction",
    10770: "TV Movie", 53: "Thriller", 10752: "War", 37: "Western",
}


def tmdb_get(path: str, params: dict = {}) -> dict:
    token = os.environ["TMDB_ACCESS_TOKEN"]
    qs = urllib.parse.urlencode(params)
    url = f"{TMDB_BASE}{path}?{qs}" if qs else f"{TMDB_BASE}{path}"
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"})
    r = urllib.request.urlopen(req, timeout=10)
    time.sleep(DELAY)
    return json.loads(r.read())


def normalize(s: str) -> str:
    return re.sub(r"[^\w\s]", "", s.lower()).strip()


def search_tmdb(title: str, year: int) -> dict | None:
    data = tmdb_get("/search/movie", {"query": title, "year": str(year), "language": "en-US"})
    results = data.get("results", [])
    if not results:
        # retry without year constraint
        data = tmdb_get("/search/movie", {"query": title, "language": "en-US"})
        results = data.get("results", [])

    for r in results[:3]:
        # Accept if normalized titles match
        if normalize(r.get("title", "")) == normalize(title):
            return r
        # Accept looser match if only one result
        if len(results) == 1:
            return r

    return None


def main():
    ap = argparse.ArgumentParser(description="Enrich movies with TMDB data")
    ap.add_argument("--from", dest="from_year", type=int, default=1982)
    ap.add_argument("--limit", type=int, default=0, help="max movies to process (0=all)")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        raise SystemExit("DATABASE_URL not set")

    conn = psycopg2.connect(db_url, keepalives=1, keepalives_idle=30, keepalives_interval=10)
    cur = conn.cursor()

    # Derive year from first WeeklyChart appearance (release_date is NULL for scraped movies)
    cur.execute("""
        SELECT m.id, m.title, EXTRACT(YEAR FROM MIN(wc.chart_date))::int AS year
        FROM "Movie" m
        LEFT JOIN "WeeklyChart" wc ON wc.movie_id = m.id
        WHERE m.tmdb_id < 0
        GROUP BY m.id, m.title
        HAVING COALESCE(EXTRACT(YEAR FROM MIN(wc.chart_date))::int, 0) >= %s
        ORDER BY MIN(wc.chart_date) DESC NULLS LAST
        %s
    """ % ("%s", f"LIMIT {args.limit}" if args.limit else ""), (args.from_year,))

    movies = cur.fetchall()
    print(f"Found {len(movies)} unenriched movies (from {args.from_year}+)")

    matched = skipped = updated = 0
    for db_id, title, year in movies:
        print(f"  {title} ({year})...", end=" ", flush=True)
        try:
            result = search_tmdb(title, year or 2000)
        except Exception as e:
            print(f"ERR: {e}")
            skipped += 1
            continue

        if not result:
            print("no match")
            skipped += 1
            continue

        matched += 1
        tmdb_id = result["id"]
        poster = result.get("poster_path")
        genres = [GENRE_MAP[gid] for gid in result.get("genre_ids", []) if gid in GENRE_MAP]
        rd_str = result.get("release_date")
        try:
            release_date = datetime.strptime(rd_str, "%Y-%m-%d").date().isoformat() if rd_str else None
        except ValueError:
            release_date = None

        print(f"-> id={tmdb_id} poster={'yes' if poster else 'no'} genres={genres}")

        if not args.dry_run:
            try:
                cur.execute("""
                    UPDATE "Movie" SET
                        tmdb_id          = %s,
                        tmdb_poster_path = %s,
                        genres           = %s,
                        release_date     = COALESCE(%s::date, release_date),
                        updated_at       = now()
                    WHERE id = %s
                      AND NOT EXISTS (SELECT 1 FROM "Movie" WHERE tmdb_id = %s AND id != %s)
                """, (tmdb_id, poster, genres, release_date, db_id, tmdb_id, db_id))
                conn.commit()
                updated += 1
            except Exception as e:
                conn.rollback()
                print(f"    DB error: {e}")
                skipped += 1

    conn.close()
    print(f"\nDone: {matched} matched, {updated} updated, {skipped} skipped")


if __name__ == "__main__":
    main()
