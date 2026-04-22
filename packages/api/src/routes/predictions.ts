import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";

const router = Router();
const prisma = new PrismaClient();

const SubmitSchema = z.object({
  movie_id: z.number().int().positive(),
  predicted_opening: z.number().positive(),
  session_id: z.string().min(1),
  username: z.string().max(30).optional(),
});

// GET /v1/predictions/open
router.get("/open", async (_req, res) => {
  const now = new Date();
  const upcoming = await prisma.movie.findMany({
    where: { release_date: { gte: now } },
    orderBy: { release_date: "asc" },
    take: 20,
  });
  return res.json(
    upcoming.map((m) => ({
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
    }))
  );
});

// POST /v1/predictions
router.post("/", async (req, res) => {
  const parsed = SubmitSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "validation", message: parsed.error.message });
  }
  const { movie_id, predicted_opening, session_id, username } = parsed.data;

  const prediction = await prisma.prediction.create({
    data: { movie_id, predicted_opening, session_id, username },
  });

  return res.status(201).json(prediction);
});

// GET /v1/predictions/movie/:id
router.get("/movie/:id", async (req, res) => {
  const movieId = parseInt(req.params.id);
  const predictions = await prisma.prediction.findMany({
    where: { movie_id: movieId },
    orderBy: { submitted_at: "desc" },
  });
  return res.json({ predictions, actual: predictions[0]?.actual_opening ?? null });
});

// GET /v1/predictions/leaderboard
router.get("/leaderboard", async (req, res) => {
  const limit = parseInt(req.query.limit as string) || 50;
  const scores = await prisma.predictionScore.findMany({
    where: { total_predictions: { gt: 0 } },
    orderBy: { avg_accuracy_pct: "desc" },
    take: limit,
  });
  return res.json(
    scores.map((s, i) => ({
      rank: i + 1,
      session_id: s.session_id,
      username: s.username,
      total_predictions: s.total_predictions,
      avg_accuracy_pct: s.avg_accuracy_pct,
      best_accuracy_pct: s.best_accuracy_pct,
    }))
  );
});

// GET /v1/predictions/session/:id
router.get("/session/:id", async (req, res) => {
  const predictions = await prisma.prediction.findMany({
    where: { session_id: req.params.id },
    orderBy: { submitted_at: "desc" },
    include: { movie: { select: { title: true } } },
  });
  return res.json(predictions);
});

export default router;
