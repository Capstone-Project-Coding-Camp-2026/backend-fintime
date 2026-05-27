import {
  classifyTransactionAI,
  forecastAI,
  checkAIHealth,
} from "../services/aiApiService.js";

import { generateForecast } from "../services/forecastService.js";
import { runWhatIfAnalysis } from "../services/whatifService.js";
import prisma from "../lib/prisma.js";

export async function getLatestAvatarState(req, res, next) {
  try {
    const userId = req.user.sub;

    const avatarState = await prisma.avatarState.findUnique({
      where: { userId },
    });

    res.json({
      success: true,
      data: avatarState,
    });
  } catch (e) {
    next(e);
  }
}

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

    const result = await classifyTransactionAI(description);

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

export const whatIf = async (req, res, next) => {
  try {
    const userId = req.user.sub;
    const { 
      itemPrice = 0, 
      selectedOption = 'cash', 
      installmentMonths = 1, 
      interestRate = 0 
    } = req.body;

    const result = await runWhatIfAnalysis({
      userId,
      itemPrice: parseFloat(itemPrice) || 0,
      selectedOption,
      installmentMonths: parseInt(installmentMonths) || 1,
      interestRate: parseFloat(interestRate) || 0,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
};
