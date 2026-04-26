"""
Seed box office trivia questions into the Trivia table.

Usage:
  py -3 seed_trivia.py
  py -3 seed_trivia.py --dry-run

Requires DATABASE_URL in .env and the Prisma migration
(20260425000000_add_trivia_wrong_options) to have been applied.
"""

import argparse
import os
import sys
from dotenv import load_dotenv
import psycopg2
from psycopg2.extras import execute_values

load_dotenv()

# (question, answer, wrong_options, category, difficulty, year)
QUESTIONS = [
    # ── Opening Weekends ─────────────────────────────────────────────────────
    (
        "Which film set the record for the highest domestic opening weekend of all time?",
        "Avengers: Endgame",
        ["Avengers: Infinity War", "Spider-Man: No Way Home", "The Dark Knight Rises"],
        "opening_weekends", "easy", 2019,
    ),
    (
        "What was the first film to earn over $100 million in a single domestic opening weekend?",
        "Spider-Man (2002)",
        ["Star Wars: The Phantom Menace", "Mission: Impossible 2", "Harry Potter and the Sorcerer's Stone"],
        "opening_weekends", "medium", 2002,
    ),
    (
        "Approximately how much did Avengers: Endgame earn in its opening weekend domestically?",
        "$357 million",
        ["$257 million", "$289 million", "$421 million"],
        "opening_weekends", "hard", 2019,
    ),
    (
        "Which film currently ranks #2 all-time for domestic opening weekends, having surpassed Avengers: Infinity War in 2021?",
        "Spider-Man: No Way Home",
        ["Doctor Strange in the Multiverse of Madness", "Black Panther: Wakanda Forever", "Thor: Love and Thunder"],
        "opening_weekends", "medium", 2021,
    ),
    (
        "What was the largest December opening weekend in domestic box office history (as of 2024)?",
        "Star Wars: The Force Awakens",
        ["Star Wars: The Last Jedi", "Spider-Man: No Way Home", "Avatar"],
        "opening_weekends", "medium", 2015,
    ),
    (
        "Which R-rated film holds the record for the highest domestic opening weekend?",
        "Deadpool & Wolverine",
        ["Joker", "Deadpool (2016)", "It"],
        "opening_weekends", "medium", 2024,
    ),
    (
        "Which horror film holds the record for the highest domestic opening weekend?",
        "It (2017)",
        ["Halloween (2018)", "Scream (2022)", "A Quiet Place Part II"],
        "opening_weekends", "medium", 2017,
    ),
    # ── Domestic Totals ───────────────────────────────────────────────────────
    (
        "Which film holds the record for the highest domestic total gross of all time (unadjusted)?",
        "Star Wars: The Force Awakens",
        ["Avengers: Endgame", "Avatar", "Titanic"],
        "domestic_totals", "medium", 2015,
    ),
    (
        "Black Panther (2018) grossed approximately how much domestically, making it one of the all-time top earners?",
        "$700 million",
        ["$500 million", "$600 million", "$850 million"],
        "domestic_totals", "hard", 2018,
    ),
    (
        "Which James Cameron film ranks #1 for all-time worldwide gross (including re-releases)?",
        "Avatar",
        ["Titanic", "Avatar: The Way of Water", "Terminator 2: Judgment Day"],
        "domestic_totals", "easy", None,
    ),
    (
        "Avengers: Endgame unseated Titanic as the #2 all-time worldwide grosser — which film is currently #1?",
        "Avatar",
        ["Star Wars: The Force Awakens", "Titanic", "Avengers: Infinity War"],
        "domestic_totals", "medium", None,
    ),
    # ── Box Office History ────────────────────────────────────────────────────
    (
        "Which 1975 film is widely credited with launching the modern Hollywood blockbuster era?",
        "Jaws",
        ["Star Wars", "The Godfather", "Rocky"],
        "history", "easy", 1975,
    ),
    (
        "Jaws (1975) was the first film in Hollywood history to earn over how much in domestic gross?",
        "$100 million",
        ["$50 million", "$200 million", "$75 million"],
        "history", "easy", 1975,
    ),
    (
        "Adjusted for inflation, which 1939 film is considered the highest-grossing movie of all time?",
        "Gone with the Wind",
        ["Casablanca", "The Wizard of Oz", "Snow White and the Seven Dwarfs"],
        "history", "medium", 1939,
    ),
    (
        "Which 1997 film spent a record 15 consecutive weeks at #1 at the US box office?",
        "Titanic",
        ["Men in Black", "As Good as It Gets", "The Full Monty"],
        "history", "easy", 1997,
    ),
    (
        "Which film became the highest-grossing domestic release of the entire 1990s?",
        "Titanic",
        ["Jurassic Park", "Forrest Gump", "The Sixth Sense"],
        "history", "easy", None,
    ),
    (
        "In what year did the domestic box office first surpass $10 billion in annual revenue?",
        "2002",
        ["1999", "2007", "2012"],
        "history", "hard", None,
    ),
    (
        "Which 1993 film broke the opening weekend record at the time with a $47.1M debut?",
        "Jurassic Park",
        ["The Fugitive", "Sleepless in Seattle", "Mrs. Doubtfire"],
        "history", "medium", 1993,
    ),
    # ── Animated Films ────────────────────────────────────────────────────────
    (
        "Which animated film holds the record for the highest domestic opening weekend among animated releases?",
        "The Lion King (2019)",
        ["Incredibles 2", "Frozen II", "Finding Dory"],
        "animated", "medium", 2019,
    ),
    (
        "Which Pixar film holds the record for the highest domestic total gross in Pixar history?",
        "Incredibles 2",
        ["Finding Dory", "Toy Story 4", "Inside Out"],
        "animated", "medium", 2018,
    ),
    (
        "The Lion King (1994) earned approximately how much domestically, making it the highest-grossing film of that year?",
        "$423 million",
        ["$223 million", "$323 million", "$523 million"],
        "animated", "hard", 1994,
    ),
    # ── Franchises ────────────────────────────────────────────────────────────
    (
        "Which Star Wars film holds the record for the highest domestic opening weekend in the franchise?",
        "Star Wars: The Force Awakens",
        ["Star Wars: The Last Jedi", "Rogue One: A Star Wars Story", "Star Wars: Revenge of the Sith"],
        "franchises", "medium", 2015,
    ),
    (
        "How many James Bond films have been released as of 2024?",
        "25",
        ["20", "30", "18"],
        "franchises", "easy", None,
    ),
    (
        "Which film in the Fast & Furious franchise was the first to open to over $100 million domestically?",
        "Furious 7",
        ["Fast Five", "Fast & Furious 6", "The Fate of the Furious"],
        "franchises", "medium", 2015,
    ),
    (
        "Avengers: Endgame was the culmination of what number phase in the Marvel Cinematic Universe?",
        "Phase 3",
        ["Phase 1", "Phase 2", "Phase 4"],
        "franchises", "medium", 2019,
    ),
    (
        "Which is the only MCU film to earn over $700 million domestically as of 2024, outside of Avengers films?",
        "Black Panther",
        ["Captain America: Civil War", "Doctor Strange in the Multiverse of Madness", "Thor: Ragnarok"],
        "franchises", "hard", None,
    ),
    # ── General ───────────────────────────────────────────────────────────────
    (
        "What does the term 'wide release' typically mean in the US box office context?",
        "Opening in 2,000 or more theaters",
        ["Opening exclusively in major cities", "Opening in 500–1,000 theaters", "Opening day-and-date on streaming"],
        "general", "medium", None,
    ),
    (
        "The Super Bowl effect refers to the box office impact in which weekend?",
        "The weekend of the Super Bowl (typically poor performance)",
        ["The weekend after the Super Bowl (typically strong)", "The weekend before the Super Bowl", "The first weekend of February"],
        "general", "hard", None,
    ),
    (
        "Which month has historically been the strongest for domestic box office openings?",
        "July",
        ["December", "May", "March"],
        "general", "medium", None,
    ),
]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        sys.exit("DATABASE_URL not set")

    print(f"Prepared {len(QUESTIONS)} trivia questions")

    if args.dry_run:
        for q in QUESTIONS[:3]:
            print(f"  [{q[3]}/{q[4]}] {q[0][:60]}...")
        return

    conn = psycopg2.connect(db_url)
    cur = conn.cursor()

    cur.execute('DELETE FROM "Trivia"')
    print(f"Cleared {cur.rowcount} existing trivia rows")

    execute_values(cur, """
        INSERT INTO "Trivia" (question, answer, wrong_options, category, difficulty, year)
        VALUES %s
    """, [(q[0], q[1], q[2], q[3], q[4], q[5]) for q in QUESTIONS])

    conn.commit()
    conn.close()
    print(f"Seeded {len(QUESTIONS)} trivia questions successfully.")


if __name__ == "__main__":
    main()
