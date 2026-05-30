import express from "express";
import { runDailySync } from "../services/dailySyncService.js";

const router = express.Router();

router.post("/daily-sync", async (req, res) => {
  try {
    await runDailySync();

    res.json({
      success: true,
      message: "Daily sync executed",
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

export default router;