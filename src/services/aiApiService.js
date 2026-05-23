import axios from "axios";
import { mapCategory } from "../config/utils/categoryMapper.js";
import { AI_TIMEOUT } from "../config/ai.js";

if (!process.env.AI_ENGINE_URL) {
  throw new Error("AI_ENGINE_URL is not defined");
}

const aiClient = axios.create({
  baseURL: process.env.AI_ENGINE_URL,
  timeout: AI_TIMEOUT,
});

export const classifyTransactionAI = async (description) => {
  try {
    if (!description || typeof description !== "string") {
      throw new Error("Description is required");
    }

    console.log("Calling AI Classify API:", description);

    const response = await aiClient.post("/predict/classify", {
      desc: description,
    });

    const data = response.data;

    const rawCategory =
      data.predicted_category || data.category || data.prediction || "others";

    return {
      success: true,
      predicted_category: mapCategory(rawCategory),
      confidence: data.confidence || 0,
      raw: data,
    };
  } catch (err) {
    console.error("AI classify failed:", err.response?.data || err.message);

    return {
      success: false,
      predicted_category: "others",
      confidence: 0,
      error: err.response?.data || err.message,
    };
  }
};

export const forecastAI = async (payload) => {
  try {
    console.log("Calling AI Forecast API with payload:", payload);
    const response = await aiClient.post("/predict/forecast", payload);

    console.log("AI Forecast Response:", response.data);

    return response.data;
  } catch (err) {
    console.error("AI forecast failed:", err.response?.data || err.message);
    throw err;
  }
};

export const whatIfAI = async (payload) => {
  try {
    console.log("Calling AI What-If API with payload:", payload);
    const response = await aiClient.post("/predict/whatif", payload);

    console.log("AI What-If Response:", response.data);

    return response.data;
  } catch (err) {
    console.error("AI whatif failed:", err.response?.data || err.message);
    throw err;
  }
};

export const checkAIHealth = async () => {
  try {
    const response = await aiClient.get("/health");

    return response.data;
  } catch (err) {
    console.error("AI health check failed:", err.response?.data || err.message);

    return {
      success: false,
    };
  }
};
