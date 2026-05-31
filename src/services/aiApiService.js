import axios from "axios";
import { mapCategory } from "../config/utils/categoryMapper.js";
import { AI_TIMEOUT } from "../config/ai.js";

if (!process.env.AI_ENGINE_URL) {
  console.warn(
    "[AI] WARNING: AI_ENGINE_URL is not set. AI classification will be unavailable. " +
    "Set AI_ENGINE_URL in .env to enable AI features."
  );
}

const aiClient = process.env.AI_ENGINE_URL
  ? axios.create({
      baseURL: process.env.AI_ENGINE_URL,
      timeout: AI_TIMEOUT,
    })
  : null;

// Classification Model POST /classify/transaction
export const classifyTransactionAI = async (description, transactionId = null) => {
  if (!aiClient) {
    return {
      success: false,
      predicted_category: "lainnya",
      confidence: 0,
      error: "AI_ENGINE_URL not configured",
    };
  }

  try {
    if (!description || typeof description !== "string") {
      throw new Error("Description is required");
    }

    const response = await aiClient.post("/predict/classify", {
      desc: description,
    });

    const data = response.data;

    const rawCategory =
      data.predicted_category || data.category || data.prediction || "lainnya";

    const mappedCategory = mapCategory(rawCategory);
    const confidence = data.confidence ?? 0;

    return {
      success: true,
      predicted_category: mappedCategory,
      confidence,
      raw: data,
    };
  } catch (err) {
    console.error("[AI] classify failed:", err.response?.data || err.message);

    return {
      success: false,
      predicted_category: "lainnya",
      confidence: 0,
      error: err.response?.data || err.message,
    };
  }
};

// Forecast Model
export const forecastAI = async (payload) => {
  if (!aiClient) {
    throw new Error("AI_ENGINE_URL not configured. Cannot run forecast.");
  }

  try {
    const response = await aiClient.post("/predict/forecast", payload);
    return response.data;
  } catch (err) {
    console.error("[AI] forecast failed:", err.response?.data || err.message);
    throw err;
  }
};

// What-If Model
export const whatIfAI = async (payload) => {
  if (!aiClient) {
    throw new Error("AI_ENGINE_URL not configured. Cannot run what-if.");
  }

  try {
    const response = await aiClient.post("/predict/whatif", payload);
    return response.data;
  } catch (err) {
    console.error("[AI] whatif failed:", err.response?.data || err.message);
    throw err;
  }
};

export const checkAIHealth = async () => {
  if (!aiClient) {
    return { success: false, message: "AI_ENGINE_URL not configured" };
  }

  try {
    const response = await aiClient.get("/health");
    return response.data;
  } catch (err) {
    console.error("[AI] health check failed:", err.response?.data || err.message);
    return { success: false };
  }
};

