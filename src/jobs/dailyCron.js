import cron from "node-cron";
import { runDailySync } from "../services/dailySyncService.js";

export function startDailyCron() {
  // tiap hari jam 1 pagi
  cron.schedule("0 1 * * *", async () => {
    console.log("Running daily cron...");
    await runDailySync();
  });
}