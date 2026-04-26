"""
Compute and seed box office records into the Record table from existing DB data.

Usage:
  py -3 seed_records.py            # seed all categories
  py -3 seed_records.py --dry-run  # preview without writing

Categories:
  opening_weekend       - top 25 all-time domestic opening weekends
  domestic_total        - top 25 all-time domestic cumulative grosses
  best_single_week      - top 25 best single-weekend grosses (any week)
  best_second_weekend   - top 25 best 2nd weekend grosses
  best_non_opening      - top 25 best non-opening weekend grosses
  fastest_to_100m       - fewest weeks to reach $100M domestic
  fastest_to_500m       - fewest weeks to reach $500M domestic

Requires DATABASE_URL in .env
"""

import argparse
import os
import sys
from dotenv import load_dotenv
import psycopg2
from psycopg2.extras import execute_values

load_dotenv()

CATEGORIES = (
    "opening_weekend",
    "domestic_total",
    "best_single_week",
    "best_second_weekend",
    "best_non_opening",
    "fastest_to_100m",
    "fastest_to_500m",
)

def ordinal(n: int) -> str:
    if 11 <= (n % 100) <= 13:
        return f"{n}th"
    return f"{n}{['th', 'st', 'nd', 'rd', 'th'][min(n % 10, 4)]}"

def fmt(n: int) -> str:
    if n >= 1_000_000_000:
        return f"${n/1_000_000_000:.2f}B"
    return f"${n/1_000_000:.1f}M"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        sys.exit("DATABASE_URL not set")

    conn = psycopg2.connect(db_url)
    cur = conn.cursor()

    records = []

    # ── Opening Weekend ──────────────────────────────────────────────────────
    cur.execute("""
        SELECT wc.movie_id, m.title, wc.weekend_gross::bigint, wc.chart_date
        FROM "WeeklyChart" wc
        JOIN "Movie" m ON m.id = wc.movie_id
        WHERE wc.weeks_in_release = 1
          AND wc.weekend_gross IS NOT NULL
          AND wc.weekend_gross > 0
        ORDER BY wc.weekend_gross DESC
        LIMIT 25
    """)
    rows = cur.fetchall()
    for rn, (movie_id, title, gross, chart_date) in enumerate(rows, 1):
        records.append((
            "opening_weekend", movie_id, int(gross),
            f"#{ordinal(rn)} All-Time Opening Weekend",
            chart_date, rn == 1,
            fmt(gross),
        ))
    print(f"Opening weekends:    {len(rows)} records")

    # ── Domestic Total ───────────────────────────────────────────────────────
    cur.execute("""
        SELECT m.id, m.title,
               MAX(wc.cumulative_gross)::bigint AS total,
               MAX(wc.chart_date) AS last_date
        FROM "Movie" m
        JOIN "WeeklyChart" wc ON wc.movie_id = m.id
        WHERE wc.cumulative_gross IS NOT NULL
          AND wc.cumulative_gross > 0
        GROUP BY m.id, m.title
        ORDER BY total DESC
        LIMIT 25
    """)
    rows = cur.fetchall()
    for rn, (movie_id, title, total, last_date) in enumerate(rows, 1):
        records.append((
            "domestic_total", movie_id, int(total),
            f"#{ordinal(rn)} All-Time Domestic Total",
            last_date, rn == 1,
            fmt(total),
        ))
    print(f"Domestic totals:     {len(rows)} records")

    # ── Best Single Weekend (any week) ───────────────────────────────────────
    cur.execute("""
        SELECT wc.movie_id, m.title, wc.weekend_gross::bigint,
               wc.chart_date, wc.weeks_in_release
        FROM "WeeklyChart" wc
        JOIN "Movie" m ON m.id = wc.movie_id
        WHERE wc.weekend_gross IS NOT NULL
          AND wc.weekend_gross > 0
        ORDER BY wc.weekend_gross DESC
        LIMIT 25
    """)
    rows = cur.fetchall()
    for rn, (movie_id, title, gross, chart_date, week_num) in enumerate(rows, 1):
        week_label = "Opening" if week_num == 1 else f"Week {week_num}"
        records.append((
            "best_single_week", movie_id, int(gross),
            f"#{ordinal(rn)} Best Single Weekend ({week_label})",
            chart_date, rn == 1,
            fmt(gross),
        ))
    print(f"Best single weeks:   {len(rows)} records")

    # ── Best 2nd Weekend ─────────────────────────────────────────────────────
    cur.execute("""
        SELECT wc.movie_id, m.title, wc.weekend_gross::bigint, wc.chart_date
        FROM "WeeklyChart" wc
        JOIN "Movie" m ON m.id = wc.movie_id
        WHERE wc.weeks_in_release = 2
          AND wc.weekend_gross IS NOT NULL
          AND wc.weekend_gross > 0
        ORDER BY wc.weekend_gross DESC
        LIMIT 25
    """)
    rows = cur.fetchall()
    for rn, (movie_id, title, gross, chart_date) in enumerate(rows, 1):
        records.append((
            "best_second_weekend", movie_id, int(gross),
            f"#{ordinal(rn)} Best 2nd Weekend",
            chart_date, rn == 1,
            fmt(gross),
        ))
    print(f"Best 2nd weekends:   {len(rows)} records")

    # ── Best Non-Opening Weekend ─────────────────────────────────────────────
    cur.execute("""
        SELECT wc.movie_id, m.title, wc.weekend_gross::bigint,
               wc.chart_date, wc.weeks_in_release
        FROM "WeeklyChart" wc
        JOIN "Movie" m ON m.id = wc.movie_id
        WHERE wc.weeks_in_release > 1
          AND wc.weekend_gross IS NOT NULL
          AND wc.weekend_gross > 0
        ORDER BY wc.weekend_gross DESC
        LIMIT 25
    """)
    rows = cur.fetchall()
    for rn, (movie_id, title, gross, chart_date, week_num) in enumerate(rows, 1):
        records.append((
            "best_non_opening", movie_id, int(gross),
            f"#{ordinal(rn)} Best Non-Opening Weekend (Week {week_num})",
            chart_date, rn == 1,
            fmt(gross),
        ))
    print(f"Best non-opening:    {len(rows)} records")

    # ── Fastest to $100M ─────────────────────────────────────────────────────
    cur.execute("""
        SELECT movie_id, m.title, MIN(weeks_in_release) AS weeks,
               MIN(chart_date) AS first_date
        FROM "WeeklyChart" wc
        JOIN "Movie" m ON m.id = wc.movie_id
        WHERE wc.cumulative_gross >= 100000000
        GROUP BY movie_id, m.title
        ORDER BY weeks ASC, first_date ASC
        LIMIT 25
    """)
    rows = cur.fetchall()
    for rn, (movie_id, title, weeks, first_date) in enumerate(rows, 1):
        label = f"{weeks} week{'s' if weeks != 1 else ''}"
        records.append((
            "fastest_to_100m", movie_id, int(weeks),
            f"#{ordinal(rn)} Fastest to $100M ({label})",
            first_date, rn == 1,
            label,
        ))
    print(f"Fastest to $100M:    {len(rows)} records")

    # ── Fastest to $500M ─────────────────────────────────────────────────────
    cur.execute("""
        SELECT movie_id, m.title, MIN(weeks_in_release) AS weeks,
               MIN(chart_date) AS first_date
        FROM "WeeklyChart" wc
        JOIN "Movie" m ON m.id = wc.movie_id
        WHERE wc.cumulative_gross >= 500000000
        GROUP BY movie_id, m.title
        ORDER BY weeks ASC, first_date ASC
        LIMIT 25
    """)
    rows = cur.fetchall()
    for rn, (movie_id, title, weeks, first_date) in enumerate(rows, 1):
        label = f"{weeks} week{'s' if weeks != 1 else ''}"
        records.append((
            "fastest_to_500m", movie_id, int(weeks),
            f"#{ordinal(rn)} Fastest to $500M ({label})",
            first_date, rn == 1,
            label,
        ))
    print(f"Fastest to $500M:    {len(rows)} records")

    print(f"\nTotal: {len(records)} records across {len(CATEGORIES)} categories")

    if args.dry_run:
        print("\nTop 3 preview:")
        for r in records[:3]:
            print(f"  [{r[0]}] {r[2]:,} — {r[3]}")
        return

    cur.execute(
        'DELETE FROM "Record" WHERE category = ANY(%s)',
        (list(CATEGORIES),),
    )
    print(f"Cleared {cur.rowcount} existing records")

    execute_values(cur, """
        INSERT INTO "Record"
            (category, movie_id, value, description, achieved_date, is_all_time, context)
        VALUES %s
    """, records)

    conn.commit()
    conn.close()
    print(f"Seeded {len(records)} records successfully.")


if __name__ == "__main__":
    main()
