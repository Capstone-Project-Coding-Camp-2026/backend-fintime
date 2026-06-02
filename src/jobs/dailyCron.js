import cron from "node-cron";
import { runDailySync } from "../services/dailySyncService.js";

export function startDailyCron() {
  cron.schedule("0 1 * * *", async () => {
    console.log("Running daily cron...");
    await runDailySync();
  });
}