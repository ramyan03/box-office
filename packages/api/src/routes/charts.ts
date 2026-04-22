import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { cacheGet, cacheSet } from "../lib/cache";

const router = Router();
const prisma = new PrismaClient();

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

  const totalGross = results.reduce((sum, r) => sum + (r.weekend_gross ?? 0), 0);

  const payload = {
    chart_date: chart.chart_date,
    total_gross: totalGross,
    results: results.map((r) => ({
      rank: r.rank,
      movie_id: r.movie_id,
      title: r.movie.title,
      weekend_gross: r.weekend_gross,
      gross_change_pct: r.gross_change_pct,
      cumulative_domestic: r.cumulative_gross,
      weeks_in_release: r.weeks_in_release,
      theaters: r.theaters,
      poster_url: r.movie.tmdb_poster_path
        ? `https://image.tmdb.org/t/p/w300${r.movie.tmdb_poster_path}`
        : null,
      genres: r.movie.genres,
      is_record: false,
    })),
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

  const totalGross = results.reduce((sum, r) => sum + (r.weekend_gross ?? 0), 0);

  return res.json({
    chart_date: date,
    total_gross: totalGross,
    results: results.map((r) => ({
      rank: r.rank,
      movie_id: r.movie_id,
      title: r.movie.title,
      weekend_gross: r.weekend_gross,
      gross_change_pct: r.gross_change_pct,
      cumulative_domestic: r.cumulative_gross,
      weeks_in_release: r.weeks_in_release,
      theaters: r.theaters,
      poster_url: r.movie.tmdb_poster_path
        ? `https://image.tmdb.org/t/p/w300${r.movie.tmdb_poster_path}`
        : null,
      genres: r.movie.genres,
      is_record: false,
    })),
  });
});

// GET /v1/charts/yearly/:year
router.get("/yearly/:year", async (req, res) => {
  const year = parseInt(req.params.year);
  const sort = (req.query.sort as string) ?? "gross";
  const limit = parseInt(req.query.limit as string) || 100;
  const page = parseInt(req.query.page as string) || 1;

  const orderBy: Record<string, string> = {
    gross: "domestic_cumulative",
    opening: "weekend_gross",
    budget: "budget",
    roi: "worldwide_gross",
  };

  const movies = await prisma.movie.findMany({
    where: {
      release_date: {
        gte: new Date(`${year}-01-01`),
        lte: new Date(`${year}-12-31`),
      },
    },
    include: {
      grosses: { orderBy: { week_date: "asc" }, take: 1 },
    },
    take: limit,
    skip: (page - 1) * limit,
  });

  const total = await prisma.movie.count({
    where: {
      release_date: {
        gte: new Date(`${year}-01-01`),
        lte: new Date(`${year}-12-31`),
      },
    },
  });

  return res.json({
    data: movies.map((m, i) => ({
      rank: (page - 1) * limit + i + 1,
      movie_id: m.id,
      title: m.title,
      studio: m.studio,
      release_date: m.release_date,
      opening_weekend: m.grosses[0]?.weekend_gross ?? null,
      domestic_total: m.grosses[m.grosses.length - 1]?.domestic_cumulative ?? 0,
      worldwide_total: m.grosses[m.grosses.length - 1]?.worldwide_gross ?? null,
      budget: m.budget,
      roi: m.budget && m.grosses[m.grosses.length - 1]?.worldwide_gross
        ? (m.grosses[m.grosses.length - 1].worldwide_gross! / m.budget)
        : null,
      poster_url: m.tmdb_poster_path
        ? `https://image.tmdb.org/t/p/w300${m.tmdb_poster_path}`
        : null,
    })),
    total,
    page,
    limit,
  });
});

// GET /v1/charts/years
router.get("/years", async (_req, res) => {
  const result = await prisma.$queryRaw<{ year: number }[]>`
    SELECT DISTINCT EXTRACT(YEAR FROM release_date)::int AS year
    FROM movies
    WHERE release_date IS NOT NULL
    ORDER BY year DESC
  `;
  return res.json(result.map((r) => r.year));
});

export default router;
