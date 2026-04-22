import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { cacheGet, cacheSet } from "../lib/cache";

const router = Router();
const prisma = new PrismaClient();

// GET /v1/records?category=
router.get("/", async (req, res) => {
  const { category } = req.query as Record<string, string>;
  const cacheKey = `records:${category ?? "all"}`;

  const cached = await cacheGet(cacheKey);
  if (cached) return res.json(cached);

  const records = await prisma.record.findMany({
    where: category ? { category } : undefined,
    include: { movie: { select: { title: true } } },
    orderBy: { value: "desc" },
  });

  const payload = records.map((r) => ({
    id: r.id,
    category: r.category,
    movie_id: r.movie_id,
    title: r.movie.title,
    value: r.value,
    description: r.description,
    achieved_date: r.achieved_date,
    is_all_time: r.is_all_time,
    context: r.context,
  }));

  await cacheSet(cacheKey, payload, 86400);
  return res.json(payload);
});

// GET /v1/records/categories
router.get("/categories", async (_req, res) => {
  const result = await prisma.record.findMany({
    distinct: ["category"],
    select: { category: true },
    orderBy: { category: "asc" },
  });
  return res.json(result.map((r) => r.category));
});

// GET /v1/records/movie/:id
router.get("/movie/:id", async (req, res) => {
  const movieId = parseInt(req.params.id);
  const records = await prisma.record.findMany({
    where: { movie_id: movieId },
    include: { movie: { select: { title: true } } },
  });
  return res.json(
    records.map((r) => ({
      id: r.id,
      category: r.category,
      movie_id: r.movie_id,
      title: r.movie.title,
      value: r.value,
      description: r.description,
      achieved_date: r.achieved_date,
      is_all_time: r.is_all_time,
      context: r.context,
    }))
  );
});

export default router;
