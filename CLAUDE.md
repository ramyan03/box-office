# Box Office App

Web app for box office enthusiasts — weekly charts, yearly leaderboards, movie detail, records, trivia, predictions, upcoming releases. See `instructions/box_office_prompt.md` for the full product brief.

## Dev

```bash
# Web (localhost:5173)
cd apps/web && npm run dev

# API (localhost:4000)
cd packages/api && cp .env.example .env && npm run dev

# Both via Turborepo (from root)
npm run dev
```

Web proxies `/api` → `http://localhost:4000` via Vite config.

## Structure

```
apps/web/          React + Vite frontend
packages/api/      Express + Prisma backend (port 4000)
packages/shared/   Shared TypeScript types
scripts/scraper/   Python historical data scraper (TODO)
```

## Stack

### Web (`apps/web`)
- React 18 + Vite 5, TypeScript
- React Router v6
- Tailwind CSS (dark theme, gold accent)
- TanStack Query v5 — data fetching, 5min stale time default
- Zustand — prediction submissions, user prefs
- Recharts — area charts on movie detail page
- Inter font via Fontsource (self-hosted)

### API (`packages/api`)
- Express + TypeScript, port 4000
- Prisma ORM + PostgreSQL
- Upstash Redis cache (in-memory fallback for local dev)
- Zod — request validation
- node-cron — Monday 9am ET weekly sync job
- TMDB API — movie metadata, posters, upcoming films
- OMDb API — RT scores, Metacritic

## API routes

| Path | Notes |
|------|-------|
| `GET /v1/charts/weekly/latest` | Current weekend top N (1h cache) |
| `GET /v1/charts/weekly?date=` | Any past weekend |
| `GET /v1/charts/yearly/:year` | Full year leaderboard, sortable |
| `GET /v1/charts/years` | All years with data |
| `GET /v1/movies/:id` | Full movie detail + weekly grosses + records |
| `GET /v1/movies/search` | Fuzzy search with filters |
| `GET /v1/records` | Records/milestones, filterable by category |
| `GET /v1/trivia/daily` | Daily question (24h cache, deterministic rotation) |
| `GET /v1/trivia/random` | Random question |
| `GET /v1/predictions/open` | Films open for prediction |
| `POST /v1/predictions` | Submit a prediction |
| `GET /v1/predictions/leaderboard` | Top predictors by accuracy |
| `GET /v1/upcoming` | Next N weeks from TMDB |

## Design system

Dark mode. Gold accent (`#e8b84b`). All gross numbers use tabular-nums.

| Token | Value |
|-------|-------|
| `bg-bg` | `#0a0a0f` |
| `bg-surface` | `#13131a` |
| `bg-elevated` | `#1c1c26` |
| `text-gold` | `#e8b84b` |
| `text-positive` | `#22c55e` |
| `text-negative` | `#ef4444` |
| `text-neutral` | `#94a3b8` |

## Database (Prisma schema in `packages/api/prisma/schema.prisma`)

Tables: `Movie`, `MovieMetadata`, `Gross`, `WeeklyChart`, `Record`, `Trivia`, `Prediction`, `PredictionScore`

Run migrations:
```bash
cd packages/api
npx prisma migrate dev
npx prisma generate
```

## Status (as of 2026-04-21)

Skeleton built — all routes, pages, shared types, Prisma schema. Not yet connected to real data (no DB, no API keys set). Next steps:
1. Set up PostgreSQL + run migrations
2. Get TMDB API key + seed upcoming films
3. Load historical gross data via Python scraper
4. Wire TMDB poster URLs to web app

## Attribution required

- "This product uses the TMDB API but is not endorsed or certified by TMDB."
- OMDb attribution on any page using their data
