"""
Fetches upcoming movies from TMDB and seeds them into the Movie table.

Usage:
  py -3 seed_upcoming.py          # fetch all upcoming pages
  py -3 seed_upcoming.py --pages 2

Requires DATABASE_URL and TMDB_ACCESS_TOKEN in .env
"""
import argparse
import os
import time
import json
import urllib.request
from datetime import datetime
from dotenv import load_dotenv
import psycopg2
from psycopg2.extras import execute_values

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
    qs = "&".join(f"{k}={v}" for k, v in params.items())
    url = f"{TMDB_BASE}{path}?{qs}" if qs else f"{TMDB_BASE}{path}"
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"})
    r = urllib.request.urlopen(req, timeout=10)
    time.sleep(DELAY)
    return json.loads(r.read())


def fetch_all_upcoming(max_pages: int) -> list[dict]:
    movies = []
    for page in range(1, max_pages + 1):
        data = tmdb_get("/movie/upcoming", {"language": "en-US", "page": str(page), "region": "US"})
        results = data.get("results", [])
        if not results:
            break
        movies.extend(results)
        total_pages = data.get("total_pages", 1)
        print(f"  page {page}/{min(max_pages, total_pages)}: {len(results)} movies")
        if page >= total_pages:
            break
    return movies


def seed(movies: list[dict], conn) -> None:
    cur = conn.cursor()
    rows = []
    for m in movies:
        rd = m.get("release_date")
        try:
            release_date = datetime.strptime(rd, "%Y-%m-%d").date().isoformat() if rd else None
        except ValueError:
            release_date = None

        genres = [GENRE_MAP[gid] for gid in m.get("genre_ids", []) if gid in GENRE_MAP]

        rows.append((
            m["id"],
            m.get("title", ""),
            m.get("poster_path"),
            release_date,
            genres,
        ))

    execute_values(cur, """
        INSERT INTO "Movie" (tmdb_id, title, tmdb_poster_path, release_date, genres, created_at, updated_at)
        VALUES %s
        ON CONFLICT (tmdb_id) DO UPDATE SET
            title             = EXCLUDED.title,
            tmdb_poster_path  = EXCLUDED.tmdb_poster_path,
            release_date      = EXCLUDED.release_date,
            genres            = EXCLUDED.genres,
            updated_at        = now()
    """, rows, template="(%s, %s, %s, %s::date, %s, now(), now())")
    conn.commit()
    print(f"  seeded {len(rows)} upcoming movies")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--pages", type=int, default=5)
    args = ap.parse_args()

    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        raise SystemExit("DATABASE_URL not set")

    print(f"Fetching upcoming movies (up to {args.pages} pages)...")
    movies = fetch_all_upcoming(args.pages)
    print(f"Total: {len(movies)} movies fetched")

    conn = psycopg2.connect(db_url, keepalives=1, keepalives_idle=30)
    seed(movies, conn)
    conn.close()


if __name__ == "__main__":
    main()
