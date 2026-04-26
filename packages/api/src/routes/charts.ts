import { Router } from "express";
import { PrismaClient, Prisma } from "@prisma/client";
import { cacheGet, cacheSet } from "../lib/cache";

const router = Router();
const prisma = new PrismaClient();

const n = (v: bigint | null | undefined): number | null =>
  v == null ? null : Number(v);

function mapChartEntry(r: any) {
  return {
    rank: r.rank,
    movie_id: r.movie_id,
    title: r.movie.title,
    weekend_gross: n(r.weekend_gross),
    gross_change_pct: r.gross_change_pct,
    cumulative_domestic: n(r.cumulative_gross),
    weeks_in_release: r.weeks_in_release,
    theaters: r.theaters,
    poster_url: r.movie.tmdb_poster_path
      ? `https://image.tmdb.org/t/p/w300${r.movie.tmdb_poster_path}`
      : null,
    genres: r.movie.genres,
    is_record: false,
  };
}

// GET /v1/charts/weekly/latest
router.get("/weekly/latest", async (req, res) => {
  const limit = parseInt(req.query.limit as string) || 10;
  const cacheKey = `charts:weekly:latest:${limit}`;

  const cached = await cacheGet(cacheKey);
  if (cached) return res.json(cached);

  const chart = await prisma.weeklyChart.findFirst({
    orderBy: { chart_date: "desc" },
    select: { chart_date: true },
  });

  if (!chart) return res.status(404).json({ error: "No chart data" });

  const results = await prisma.weeklyChart.findMany({
    where: { chart_date: chart.chart_date },
    orderBy: { rank: "asc" },
    take: limit,
    include: { movie: { select: { title: true, genres: true, tmdb_poster_path: true } } },
  });

  const totalGross = results.reduce((sum, r) => sum + Number(r.weekend_gross ?? 0), 0);

  const payload = {
    chart_date: chart.chart_date,
    total_gross: totalGross,
    results: results.map(mapChartEntry),
  };

  await cacheSet(cacheKey, payload, 3600);
  return res.json(payload);
});

// GET /v1/charts/weekly?date=YYYY-MM-DD
router.get("/weekly", async (req, res) => {
  const { date, limit: limitStr } = req.query as Record<string, string>;
  if (!date) return res.status(400).json({ error: "date required" });
  const limit = parseInt(limitStr) || 10;

  const results = await prisma.weeklyChart.findMany({
    where: { chart_date: new Date(date) },
    orderBy: { rank: "asc" },
    take: limit,
    include: { movie: { select: { title: true, genres: true, tmdb_poster_path: true } } },
  });

  if (!results.length) return res.status(404).json({ error: "No data for that date" });

  const totalGross = results.reduce((sum, r) => sum + Number(r.weekend_gross ?? 0), 0);

  return res.json({
    chart_date: date,
    total_gross: totalGross,
    results: results.map(mapChartEntry),
  });
});

// GET /v1/charts/yearly/:year
router.get("/yearly/:year", async (req, res) => {
  const year = parseInt(req.params.year);
  const sort = (req.query.sort as string) || "gross";
  const limit = parseInt(req.query.limit as string) || 100;
  const page = parseInt(req.query.page as string) || 1;
  const offset = (page - 1) * limit;

  const VALID_SORTS: Record<string, Prisma.Sql> = {
    gross:   Prisma.sql`domestic_total DESC NULLS LAST`,
    opening: Prisma.sql`opening_weekend DESC NULLS LAST`,
    budget:  Prisma.sql`budget DESC NULLS LAST`,
    roi:     Prisma.sql`roi DESC NULLS LAST`,
  };
  const orderBy = VALID_SORTS[sort] ?? VALID_SORTS.gross;

  type Row = {
    movie_id: number;
    title: string;
    studio: string | null;
    release_date: Date | null;
    budget: bigint | null;
    tmdb_poster_path: string | null;
    opening_weekend: bigint | null;
    domestic_total: bigint | null;
    roi: number | null;
  };

  const rows = await prisma.$queryRaw<Row[]>`
    SELECT
      m.id                                                        AS movie_id,
      m.title,
      m.studio,
      m.release_date,
      m.budget,
      m.tmdb_poster_path,
      MAX(CASE WHEN wc.weeks_in_release = 1 THEN wc.weekend_gross END)  AS opening_weekend,
      MAX(wc.cumulative_gross)                                    AS domestic_total,
      CASE
        WHEN m.budget > 0
        THEN ROUND((MAX(wc.cumulative_gross)::numeric / m.budget::numeric), 2)
      END                                                         AS roi
    FROM "Movie" m
    JOIN "WeeklyChart" wc ON wc.movie_id = m.id
    WHERE EXTRACT(YEAR FROM (
      SELECT MIN(wc2.chart_date) FROM "WeeklyChart" wc2 WHERE wc2.movie_id = m.id
    )) = ${year}
    GROUP BY m.id, m.title, m.studio, m.release_date, m.budget, m.tmdb_poster_path
    ORDER BY ${orderBy}
    LIMIT ${limit} OFFSET ${offset}
  `;

  const countResult = await prisma.$queryRaw<[{ count: bigint }]>`
    SELECT COUNT(DISTINCT m.id) AS count
    FROM "Movie" m
    JOIN "WeeklyChart" wc ON wc.movie_id = m.id
    WHERE EXTRACT(YEAR FROM (
      SELECT MIN(wc2.chart_date) FROM "WeeklyChart" wc2 WHERE wc2.movie_id = m.id
    )) = ${year}
  `;

  return res.json({
    data: rows.map((r, i) => ({
      rank: offset + i + 1,
      movie_id: r.movie_id,
      title: r.title,
      studio: r.studio,
      release_date: r.release_date,
      opening_weekend: r.opening_weekend ? Number(r.opening_weekend) : null,
      domestic_total: r.domestic_total ? Number(r.domestic_total) : null,
      worldwide_total: null,
      budget: r.budget ? Number(r.budget) : null,
      roi: r.roi ? Number(r.roi) : null,
      poster_url: r.tmdb_poster_path
        ? `https://image.tmdb.org/t/p/w300${r.tmdb_poster_path}`
        : null,
    })),
    total: Number(countResult[0].count),
    page,
    limit,
  });
});

// GET /v1/charts/years
router.get("/years", async (_req, res) => {
  const result = await prisma.$queryRaw<{ year: number }[]>`
    SELECT DISTINCT EXTRACT(YEAR FROM chart_date)::int AS year
    FROM "WeeklyChart"
    ORDER BY year DESC
  `;
  return res.json(result.map((r) => r.year));
});

export default router;
