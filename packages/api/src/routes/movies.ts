import { Router } from "express";
import { PrismaClient } from "@prisma/client";

const router = Router();
const prisma = new PrismaClient();

// GET /v1/movies/search
router.get("/search", async (req, res) => {
  const { q, genre, year, studio, sort = "gross", limit: lStr, page: pStr } = req.query as Record<string, string>;
  const limit = parseInt(lStr) || 20;
  const page = parseInt(pStr) || 1;

  const where: Record<string, unknown> = {};
  if (q) where.title = { contains: q, mode: "insensitive" };
  if (genre) where.genres = { has: genre };
  if (studio) where.studio = { contains: studio, mode: "insensitive" };
  if (year) {
    where.release_date = {
      gte: new Date(`${year}-01-01`),
      lte: new Date(`${year}-12-31`),
    };
  }

  const [movies, total] = await Promise.all([
    prisma.movie.findMany({
      where,
      take: limit,
      skip: (page - 1) * limit,
      orderBy: { release_date: "desc" },
    }),
    prisma.movie.count({ where }),
  ]);

  return res.json({
    data: movies.map((m) => ({
      id: m.id,
      tmdb_id: m.tmdb_id,
      title: m.title,
      release_date: m.release_date,
      budget: m.budget,
      genres: m.genres,
      studio: m.studio,
      poster_url: m.tmdb_poster_path
        ? `https://image.tmdb.org/t/p/w300${m.tmdb_poster_path}`
        : null,
    })),
    total,
    page,
    limit,
  });
});

// GET /v1/movies/:id
router.get("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const movie = await prisma.movie.findUnique({
    where: { id },
    include: {
      metadata: true,
      grosses: { orderBy: { week_date: "asc" } },
      records: true,
    },
  });

  if (!movie) return res.status(404).json({ error: "Not found" });

  const lastGross = movie.grosses[movie.grosses.length - 1];
  const openingGross = movie.grosses[0];

  return res.json({
    id: movie.id,
    tmdb_id: movie.tmdb_id,
    title: movie.title,
    release_date: movie.release_date,
    budget: movie.budget,
    runtime: movie.runtime,
    mpaa_rating: movie.mpaa_rating,
    genres: movie.genres,
    studio: movie.studio,
    franchise: movie.franchise,
    poster_url: movie.tmdb_poster_path
      ? `https://image.tmdb.org/t/p/w500${movie.tmdb_poster_path}`
      : null,
    metadata: movie.metadata
      ? {
          director: movie.metadata.director,
          cast: movie.metadata.cast,
          rt_score: movie.metadata.rt_score,
          metacritic_score: movie.metadata.metacritic_score,
          imdb_rating: movie.metadata.imdb_rating,
          awards: movie.metadata.awards,
        }
      : null,
    grosses: {
      opening_weekend: openingGross?.weekend_gross ?? null,
      domestic_total: lastGross?.domestic_cumulative ?? null,
      worldwide_total: lastGross?.worldwide_gross ?? null,
      roi:
        movie.budget && lastGross?.worldwide_gross
          ? lastGross.worldwide_gross / movie.budget
          : null,
    },
    weekly: movie.grosses.map((g, i) => ({
      week: i + 1,
      rank: g.rank,
      gross: g.weekend_gross,
      theaters: g.theaters,
      cumulative: g.domestic_cumulative,
      change_pct: null,
    })),
    records: movie.records.map((r) => ({
      id: r.id,
      category: r.category,
      movie_id: r.movie_id,
      title: movie.title,
      value: r.value,
      description: r.description,
      achieved_date: r.achieved_date,
      is_all_time: r.is_all_time,
      context: r.context,
    })),
  });
});

export default router;
