import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { cacheGet, cacheSet } from "../lib/cache";

const router = Router();
const prisma = new PrismaClient();

// GET /v1/trivia/daily
router.get("/daily", async (_req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const cacheKey = `trivia:daily:${today}`;

  const cached = await cacheGet(cacheKey);
  if (cached) return res.json(cached);

  const count = await prisma.trivia.count();
  if (!count) return res.status(404).json({ error: "No trivia questions" });

  // Deterministic daily rotation
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  );
  const skip = dayOfYear % count;

  const question = await prisma.trivia.findFirst({ skip });
  if (!question) return res.status(404).json({ error: "Not found" });

  const payload = formatQuestion(question);
  await cacheSet(cacheKey, payload, 86400);
  return res.json(payload);
});

// GET /v1/trivia/random
router.get("/random", async (req, res) => {
  const { category, difficulty } = req.query as Record<string, string>;

  const where: Record<string, unknown> = {};
  if (category) where.category = category;
  if (difficulty) where.difficulty = difficulty;

  const count = await prisma.trivia.count({ where });
  if (!count) return res.status(404).json({ error: "No questions match" });

  const skip = Math.floor(Math.random() * count);
  const question = await prisma.trivia.findFirst({ where, skip });
  if (!question) return res.status(404).json({ error: "Not found" });

  return res.json(formatQuestion(question));
});

// GET /v1/trivia/categories
router.get("/categories", async (_req, res) => {
  const result = await prisma.trivia.findMany({
    distinct: ["category"],
    select: { category: true },
    orderBy: { category: "asc" },
  });
  return res.json(result.map((r) => r.category).filter(Boolean));
});

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function formatQuestion(q: {
  id: number;
  question: string;
  answer: string;
  wrong_options: string[];
  category: string | null;
  difficulty: string | null;
  movie_id: number | null;
  year: number | null;
}) {
  return {
    id: q.id,
    question: q.question,
    options: shuffle([...q.wrong_options, q.answer]),
    answer: q.answer,
    category: q.category ?? "general",
    difficulty: q.difficulty ?? "medium",
    movie_id: q.movie_id,
    year: q.year,
  };
}

export default router;
