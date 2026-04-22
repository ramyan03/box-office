import cron from "node-cron";
import { cacheDel } from "../lib/cache";

export function startJobs() {
  // Every Monday at 9am ET — after weekend results publish
  cron.schedule("0 9 * * 1", weeklySync, { timezone: "America/New_York" });
  console.log("[jobs] Weekly sync scheduled for Monday 9am ET");
}

async function weeklySync() {
  console.log("[weekly-sync] Starting…");
  try {
    // 1. Trigger Python scraper (via child_process or HTTP call to scraper service)
    // TODO: await runScraper();

    // 2. Sync new movies from TMDB
    // TODO: await syncTmdb();

    // 3. Fetch OMDb data for new movies
    // TODO: await syncOmdb();

    // 4. Auto-detect new records
    // TODO: await detectRecords();

    // 5. Bust cache for latest weekly chart
    await cacheDel("charts:weekly:latest:10");
    await cacheDel("charts:weekly:latest:5");

    // 6. Resolve predictions
    // TODO: await resolvePredictions();

    console.log("[weekly-sync] Done");
  } catch (err) {
    console.error("[weekly-sync] Failed:", err);
  }
}
