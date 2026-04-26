"""
Compute and seed box office records into the Record table from existing DB data.

Usage:
  py -3 seed_records.py            # seed all categories
  py -3 seed_records.py --dry-run  # preview without writing

Categories:
  opening_weekend  - top 25 all-time domestic opening weekends
  domestic_total   - top 25 all-time domestic cumulative grosses
  best_single_week - top 25 best single-weekend grosses (any week)

Requires DATABASE_URL in .env
"""

import argparse
import os
import sys
from dotenv import load_dotenv
import psycopg2
from psycopg2.extras import execute_values

load_dotenv()

CATEGORIES = ("opening_weekend", "domestic_total", "best_single_week")

def ordinal(n: int) -> str:
    if 11 <= (n % 100) <= 13:
        return f"{n}th"
    return f"{n}{['th', 'st', 'nd', 'rd', 'th'][min(n % 10, 4)]}"


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

    # ── Opening Weekend Records ──────────────────────────────────────────────
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
            "opening_weekend",
            movie_id,
            int(gross),
            f"#{ordinal(rn)} All-Time Opening Weekend",
            chart_date,
            rn == 1,
            f"Ranks {ordinal(rn)} among all domestic opening weekends",
        ))
    print(f"Opening weekends:  {len(rows)} records")

    # ── Domestic Total Records ───────────────────────────────────────────────
    dt_start = len(records)
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
            "domestic_total",
            movie_id,
            int(total),
            f"#{ordinal(rn)} All-Time Domestic Gross",
            last_date,
            rn == 1,
            f"Ranks {ordinal(rn)} all-time for total domestic earnings",
        ))
    print(f"Domestic totals:   {len(rows)} records")

    # ── Best Single Weekend ──────────────────────────────────────────────────
    bsw_start = len(records)
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
            "best_single_week",
            movie_id,
            int(gross),
            f"#{ordinal(rn)} Best Single Weekend ({week_label})",
            chart_date,
            rn == 1,
            f"{week_label} gross ranks {ordinal(rn)} all-time",
        ))
    print(f"Best single weeks: {len(rows)} records")

    print(f"\nTotal: {len(records)} records across {len(CATEGORIES)} categories")

    if args.dry_run:
        print("\nTop 3 preview:")
        for r in records[:3]:
            print(f"  [{r[0]}] {r[2]:,} — {r[3]}")
        return

    # Clear and re-seed
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
