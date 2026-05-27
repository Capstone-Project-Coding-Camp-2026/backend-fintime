import express from "express";

import {
  classify,
  forecast,
  whatIf,
  healthCheck,
  getLatestAvatarState,
} from "../controllers/aiController.js";

import { authMiddleware } from "../middleware/auth.js";

const router = express.Router();

router.get(
  "/health",
  healthCheck
);

router.get(
  "/avatar-state",
  authMiddleware,
  getLatestAvatarState
);

router.post(
  "/classify",
  authMiddleware,
  classify
);

router.post(
  "/forecast",
  authMiddleware,
  forecast
);

router.post(
  "/whatif",
  authMiddleware,
  whatIf
);

export default router;