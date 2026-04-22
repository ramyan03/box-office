import "dotenv/config";
import express from "express";
import cors from "cors";

import moviesRouter     from "./routes/movies";
import chartsRouter     from "./routes/charts";
import recordsRouter    from "./routes/records";
import triviaRouter     from "./routes/trivia";
import predictionsRouter from "./routes/predictions";
import upcomingRouter   from "./routes/upcoming";

import { startJobs } from "./jobs/weekly-sync";

const app  = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 4000;

app.use(cors({ origin: process.env.CORS_ORIGIN ?? "*" }));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({
    status:    "ok",
    version:   "1.0.0",
    timestamp: new Date().toISOString(),
    tmdb_key:  !!process.env.TMDB_API_KEY,
    omdb_key:  !!process.env.OMDB_API_KEY,
    database:  !!process.env.DATABASE_URL,
  });
});

app.use("/v1/movies",      moviesRouter);
app.use("/v1/charts",      chartsRouter);
app.use("/v1/records",     recordsRouter);
app.use("/v1/trivia",      triviaRouter);
app.use("/v1/predictions", predictionsRouter);
app.use("/v1/upcoming",    upcomingRouter);

app.listen(PORT, () => {
  console.log(`[api] Listening on port ${PORT}`);
  startJobs();
});
