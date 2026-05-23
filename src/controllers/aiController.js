import {
  classifyTransactionAI,
  forecastAI,
  whatIfAI,
  checkAIHealth,
} from "../services/aiApiService.js";

import { generateForecast } from "../services/forecastService.js";

export async function healthCheck(req, res, next) {
  try {
    const result = await checkAIHealth();

    res.json({
      success: true,
      data: result,
    });
  } catch (e) {
    next(e);
  }
}

export async function classify(req, res, next) {
  try {
    const { description } = req.body;

    if (!description) {
      return res.status(400).json({
        success: false,
        message: "Description required",
      });
    }

    const result =
      await classifyTransactionAI(description);

    res.json({
      success: true,
      message: "Classification success",
      data: result,
    });
  } catch (e) {
    next(e);
  }
}

export async function forecast(req, res, next) {
  try {
    const userId = req.user.sub;

    const result = await generateForecast(userId);

    res.json({
      success: true,
      message: "Forecast generated",
      data: result,
    });
  } catch (e) {
    next(e);
  }
}

export async function whatIf(req, res, next) {
  try {
    const payload = req.body;

    const result = await whatIfAI(payload);

    res.json({
      success: true,
      message: "What-if generated",
      data: result,
    });
  } catch (e) {
    next(e);
  }
}