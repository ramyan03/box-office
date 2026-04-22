import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { cacheGet, cacheSet } from "../lib/cache";

const router = Router();
const prisma = new PrismaClient();

// GET /v1/upcoming?weeks=8
router.get("/", async (req, res) => {
  const weeks = parseInt(req.query.weeks as string) || 8;
  const cacheKey = `upcoming:${weeks}`;

  const cached = await cacheGet(cacheKey);
  if (cached) return res.json(cached);

  const now = new Date();
  const until = new Date(now.getTime() + weeks * 7 * 24 * 60 * 60 * 1000);

  const movies = await prisma.movie.findMany({
    where: {
      release_date: { gte: now, lte: until },
    },
    orderBy: { release_date: "asc" },
  });

  const payload = movies.map((m) => ({
    tmdb_id: m.tmdb_id,
    title: m.title,
    release_date: m.release_date,
    studio: m.studio,
    genres: m.genres,
    mpaa_rating: m.mpaa_rating,
    poster_url: m.tmdb_poster_path
      ? `https://image.tmdb.org/t/p/w300${m.tmdb_poster_path}`
      : null,
    budget: m.budget,
    open_for_prediction: true,
  }));

  await cacheSet(cacheKey, payload, 3 * 3600);
  return res.json(payload);
});

export default router;
