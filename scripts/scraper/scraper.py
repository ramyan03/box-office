"""
Scrapes Box Office Mojo weekend charts and saves raw data to data/ as JSON.

Usage:
  py -3 scraper.py                      # scrape 1982–present
  py -3 scraper.py --from 2010          # 2010–present
  py -3 scraper.py --from 2010 --to 2020
  py -3 scraper.py --year 2023          # single year

Output: data/{year}.json per year. Already-scraped years are skipped.
"""
import argparse
import json
import re
import time
from datetime import date
from pathlib import Path

import requests
from bs4 import BeautifulSoup

BASE = "https://www.boxofficemojo.com"
DATA_DIR = Path(__file__).parent / "data"
DELAY = 1.5  # seconds between requests

SESSION = requests.Session()
SESSION.headers.update({
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9",
})

MONTHS = {
    "jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6,
    "jul": 7, "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12,
}


def get(url: str) -> BeautifulSoup:
    r = SESSION.get(url, timeout=20)
    r.raise_for_status()
    time.sleep(DELAY)
    return BeautifulSoup(r.text, "lxml")


def parse_weekend_end_date(text: str, year: int) -> str | None:
    """Convert 'Dec 27-29' or 'Dec 27-Jan 2' to the Sunday date (YYYY-MM-DD)."""
    m = re.match(r"(\w+)\s+(\d+)-(?:(\w+)\s+)?(\d+)", text.strip())
    if not m:
        return None
    start_mo_str, _, end_mo_str, end_day_str = m.groups()
    start_mo = MONTHS.get(start_mo_str[:3].lower())
    end_day = int(end_day_str)
    if end_mo_str:
        end_mo = MONTHS.get(end_mo_str[:3].lower())
        end_yr = year + 1 if (start_mo == 12 and end_mo == 1) else year
    else:
        end_mo = start_mo
        end_yr = year
    if not start_mo or not end_mo:
        return None
    return f"{end_yr:04d}-{end_mo:02d}-{end_day:02d}"


def weekends_for_year(year: int) -> list[dict]:
    """Return [{week_id, chart_date}] for every unique weekend in the year."""
    soup = get(f"{BASE}/weekend/by-year/{year}/")
    table = soup.select_one("table")
    if not table:
        return []
    rows = table.find_all("tr")
    if not rows:
        return []

    headers = [th.get_text(strip=True).lower() for th in rows[0].find_all("th")]
    dates_col = next((i for i, h in enumerate(headers) if "date" in h), 0)

    seen: set[str] = set()
    result: list[dict] = []
    for tr in rows[1:]:
        cells = tr.find_all("td")
        if not cells:
            continue
        week_id = None
        for a in tr.find_all("a", href=True):
            m = re.search(r"/weekend/(\d{4}W\d+)/", a["href"])
            if m:
                week_id = m.group(1)
                break
        if not week_id or week_id in seen:
            continue
        seen.add(week_id)
        date_text = cells[dates_col].get_text(strip=True) if dates_col < len(cells) else ""
        result.append({
            "week_id": week_id,
            "chart_date": parse_weekend_end_date(date_text, year) or week_id,
        })
    return result


def _parse_money(s: str | None) -> int | None:
    if not s:
        return None
    digits = re.sub(r"[^0-9]", "", s)
    return int(digits) if digits else None


def _parse_int(s: str | None) -> int | None:
    if not s:
        return None
    digits = re.sub(r"[^0-9]", "", s)
    return int(digits) if digits else None


def _parse_pct(s: str | None) -> float | None:
    if not s:
        return None
    s = s.strip().replace("–", "-").replace("—", "-")
    if s in ("-", "n/a", "N/A", "NEW", ""):
        return None
    clean = re.sub(r"[^0-9.\-]", "", s.replace("+", ""))
    if not clean or clean == "-":
        return None
    try:
        return float(clean)
    except ValueError:
        return None


def _col_index(raw_headers: list[str]) -> dict[str, int]:
    mapping: dict[str, int] = {}
    for i, h in enumerate(raw_headers):
        # Strip non-word chars (handles '↑', '%', etc) for comparison
        hl = re.sub(r"[^\w\s]", " ", h.lower()).strip()
        words = hl.split()
        if hl in ("#", "rank"):
            mapping.setdefault("rank", i)
        elif hl in ("release", "title", "movie", "name", "film"):
            mapping.setdefault("title", i)
        elif hl == "gross" or hl in ("weekend", "wknd gross", "wknd"):
            mapping.setdefault("gross", i)
        elif "lw" in words and "%" in h:
            mapping.setdefault("pct_change", i)
        elif hl in ("theaters", "thtrs", "thtr", "locs"):
            mapping.setdefault("theaters", i)
        elif "total" in words:
            mapping.setdefault("total_gross", i)
        elif hl in ("distributor", "studio", "dist"):
            mapping.setdefault("studio", i)
        elif hl in ("weeks", "week", "wks"):
            mapping.setdefault("weeks", i)
    return mapping


def scrape_weekend(week_id: str, chart_date: str) -> list[dict]:
    url = f"{BASE}/weekend/{week_id}/"
    soup = get(url)
    table = soup.select_one("table")
    if not table:
        return []

    rows = table.find_all("tr")
    if not rows:
        return []

    col = _col_index([th.get_text(strip=True) for th in rows[0].find_all("th")])

    entries = []
    for tr in rows[1:]:
        cells = tr.find_all("td")
        if not cells:
            continue

        def cell(key: str) -> str | None:
            i = col.get(key)
            return cells[i].get_text(strip=True) or None if (i is not None and i < len(cells)) else None

        rank = _parse_int(cell("rank"))
        title = cell("title")
        if not rank or not title:
            continue

        bom_id = None
        if "title" in col and col["title"] < len(cells):
            a = cells[col["title"]].find("a", href=re.compile(r"/release/"))
            if a:
                m = re.search(r"/release/([^/?#]+)", a["href"])
                if m:
                    bom_id = m.group(1)

        entries.append({
            "chart_date": chart_date,
            "week_id": week_id,
            "rank": rank,
            "title": title,
            "bom_id": bom_id,
            "studio": cell("studio"),
            "weekend_gross": _parse_money(cell("gross")),
            "gross_change_pct": _parse_pct(cell("pct_change")),
            "cumulative_gross": _parse_money(cell("total_gross")),
            "theaters": _parse_int(cell("theaters")),
            "weeks_in_release": _parse_int(cell("weeks")),
        })
    return entries


def scrape_year(year: int) -> None:
    DATA_DIR.mkdir(exist_ok=True)
    out = DATA_DIR / f"{year}.json"
    if out.exists():
        print(f"  {year}: already scraped — delete data/{year}.json to re-scrape")
        return

    print(f"  {year}: fetching weekend list...")
    weekends = weekends_for_year(year)
    if not weekends:
        print(f"  {year}: no weekends found")
        return
    print(f"  {year}: {len(weekends)} weekends")

    rows: list[dict] = []
    for w in weekends:
        print(f"    {w['week_id']} ({w['chart_date']})...", end=" ", flush=True)
        try:
            entries = scrape_weekend(w["week_id"], w["chart_date"])
            print(f"{len(entries)} entries")
            rows.extend(entries)
        except Exception as e:
            print(f"ERROR: {e}")

    out.write_text(json.dumps(rows, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"  {year}: saved {len(rows)} rows -> data/{year}.json\n")


def main() -> None:
    ap = argparse.ArgumentParser(description="Scrape BOM weekend charts to JSON")
    ap.add_argument("--year", type=int, help="scrape a single year")
    ap.add_argument("--from", dest="from_year", type=int, default=1982,
                    help="start year (default: 1982)")
    ap.add_argument("--to", dest="to_year", type=int, default=date.today().year,
                    help="end year inclusive (default: current year)")
    args = ap.parse_args()
    years = [args.year] if args.year else range(args.from_year, args.to_year + 1)
    for y in years:
        scrape_year(y)


if __name__ == "__main__":
    main()
