import * as tf from '@tensorflow/tfjs';
import fs from 'fs';
import prisma from '../lib/prisma.js';
import { loadModel } from '../services/modelLoader.js';
import { initNlpService, classifyTransaction } from '../services/nlpService.js';
import { initForecastService, generateForecast } from '../services/forecastService.js';

let classifyModel = null;
let forecastModel = null;
let whatifModel = null;
let whatifMetadata = null;

const whatifMetadataPath = './src/models/tfjs/whatif/metadata.json';

// ==========================================
// INISIALISASI & LOAD MODEL
// ==========================================
export const loadAllModels = async () => {
  try {
    console.log("Memuat model TensorFlow.js...");

    // Load models using custom modelLoader
    classifyModel = await loadModel('./src/models/tfjs/classify/model.json', 'nlp_transaction_classifier/');
    forecastModel = await loadModel('./src/models/tfjs/forecast/model.json', 'forecasting_model/');
    whatifModel = await loadModel('./src/models/tfjs/whatif/model.json', 'functional_7/');

    // Initialize Services
    initNlpService(classifyModel);
    initForecastService(forecastModel);

    // Load whatif metadata
    if (fs.existsSync(whatifMetadataPath)) {
      whatifMetadata = JSON.parse(fs.readFileSync(whatifMetadataPath, 'utf8'));
    } else {
      console.error("What-If metadata not found:", whatifMetadataPath);
    }

    console.log("Model TFJS (Simulasi) siap!");
  } catch (error) {
    console.error("Gagal memuat model:", error);
  }
};

// ==========================================
// CONTROLLER: NLP CLASSIFY
// ==========================================
export const classifyTransactions = async (req, res) => {
  try {
    const { transactions } = req.body;

    if (!transactions || !Array.isArray(transactions)) {
      return res.status(400).json({ error: "Format transactions tidak valid" });
    }

    const results = [];
    for (const tx of transactions) {
      if (!tx.description) {
        results.push({
          id: tx.id,
          category: 'lainnya',
          confidence: 0.0,
          source: 'fallback'
        });
        continue;
      }

      const result = await classifyTransaction(tx.description);
      results.push({
        id: tx.id,
        category: result.category,
        confidence: Number(result.confidence.toFixed(4)),
        source: result.source
      });
    }

    return res.status(200).json({ results });
  } catch (error) {
    console.error("Error in classifyTransactions controller:", error);
    return res.status(500).json({ error: "Gagal memproses klasifikasi transaksi", detail: error.message });
  }
};

// ==========================================
// CONTROLLER: FORECAST
// ==========================================
export const forecastTransactions = async (req, res) => {
  try {
    const userId = req.body.userId || req.body.user_id;

    if (!userId) {
      return res.status(400).json({ error: "userId required" });
    }

    const result = await generateForecast(userId);
    return res.status(200).json(result);
  } catch (error) {
    console.error("Error in forecastTransactions controller:", error);
    return res.status(500).json({ error: "Gagal memproses forecasting", detail: error.message });
  }
};

// ==========================================
// CONTROLLER: WHAT-IF DECISION LAB
// ==========================================
export const predictWhatIf = async (req, res) => {
  try {
    const payload = req.body;

    // Validasi input wajib
    if (payload.item_price === undefined || payload.paylater_tenor_months === undefined) {
      return res.status(400).json({ error: "Data skenario pembelian tidak lengkap" });
    }

    const userId = payload.userId || payload.user_id;
    let user = null;
    if (userId) {
      user = await prisma.user.findUnique({
        where: { id: userId }
      });
    }

    // Determine total_income and monthly_expenses from payload or user
    // Follow the math from the manual:
    // estimated_income = payload.monthly_cashflow / Math.max(1 - payload.current_etr, 0.01)
    const monthly_cashflow = payload.monthly_cashflow !== undefined ? payload.monthly_cashflow : 1500000;
    const current_etr = payload.current_etr !== undefined ? payload.current_etr : 0.7;

    const total_income = payload.total_income ||
      (payload.monthly_cashflow !== undefined && payload.current_etr !== undefined
        ? (payload.monthly_cashflow / Math.max(1 - payload.current_etr, 0.01))
        : (user ? user.monthlyIncome : null)) || 5000000;

    const monthly_expenses = payload.monthly_expenses ||
      (payload.monthly_cashflow !== undefined && payload.current_etr !== undefined
        ? (total_income * payload.current_etr)
        : (total_income - monthly_cashflow));

    const current_savings = payload.current_savings !== undefined ? payload.current_savings : (user ? user.monthlyIncome * 2 : null) || 10000000;
    const pinjol_active = payload.pinjol_active ? true : false;
    const paylater_usage_history = payload.paylater_usage_history || 'never';
    const impulse_spending_tendency = payload.impulse_spending_tendency || 'medium';

    const item_price = payload.item_price;
    const paylater_tenor_months = payload.paylater_tenor_months;
    const paylater_interest_rate = payload.paylater_interest_rate !== undefined ? payload.paylater_interest_rate : 0.02;

    // Financial math
    const paylater_monthly_payment = (item_price / paylater_tenor_months) * (1 + paylater_interest_rate);
    const paylater_monthly_burden = paylater_monthly_payment / total_income;
    const etr_after = (monthly_expenses + paylater_monthly_payment) / total_income;
    const cashflow_after = monthly_cashflow - paylater_monthly_payment;

    let recommendation = 'buy_careful';
    let confidence = 0.8;

    if (whatifModel && whatifMetadata) {
      // Build 38-feature vector
      const birthYear = user && user.birthDate ? new Date(user.birthDate).getFullYear() : 1999;
      const age = new Date().getFullYear() - birthYear;

      const expense_to_income_ratio = monthly_expenses / (total_income || 1);
      const savings_rate = monthly_cashflow / (total_income || 1);
      const has_emergency_fund = current_savings >= (monthly_expenses * 3) ? 1 : 0;
      const emergency_fund_months = monthly_expenses > 0 ? (current_savings / monthly_expenses) : 0;

      const has_kpr = payload.has_kpr ? 1 : 0;
      const has_vehicle_credit = payload.has_vehicle_credit ? 1 : 0;
      const pinjol_active_val = pinjol_active ? 1 : 0;
      const total_debt = payload.total_debt || 0;
      const debt_to_income_ratio = total_debt / ((total_income || 1) * 12);
      const credit_card_utilization = payload.credit_card_utilization !== undefined ? payload.credit_card_utilization : 0.3;
      const financial_literacy_score = payload.financial_literacy_score !== undefined ? payload.financial_literacy_score : 0.5;

      const item_to_income_ratio = item_price / (total_income || 1);

      // Job type
      const job = user ? user.jobType : 'permanent';
      const employment_type_civil_servant = job === 'civil_servant' ? 1 : 0;
      const employment_type_entrepreneur = job === 'entrepreneur' ? 1 : 0;
      const employment_type_freelance = job === 'freelance' ? 1 : 0;
      const employment_type_gig = job === 'gig' ? 1 : 0;
      const employment_type_not_working = job === 'not_working' ? 1 : 0;
      const employment_type_permanent = (job === 'permanent' || !job) ? 1 : 0;

      // City tier
      const city = payload.city_tier || 'tier_1';
      const city_tier_tier_1 = city === 'tier_1' ? 1 : 0;
      const city_tier_tier_2 = city === 'tier_2' ? 1 : 0;
      const city_tier_tier_3 = city === 'tier_3' ? 1 : 0;

      // Paylater history
      const paylater_usage_history_frequent = paylater_usage_history === 'frequent' ? 1 : 0;
      const paylater_usage_history_never = paylater_usage_history === 'never' ? 1 : 0;
      const paylater_usage_history_occasional = paylater_usage_history === 'occasional' ? 1 : 0;
      const paylater_usage_history_problematic = paylater_usage_history === 'problematic' ? 1 : 0;

      // Impulse spending
      const impulse_spending_tendency_high = impulse_spending_tendency === 'high' ? 1 : 0;
      const impulse_spending_tendency_low = impulse_spending_tendency === 'low' ? 1 : 0;
      const impulse_spending_tendency_medium = impulse_spending_tendency === 'medium' ? 1 : 0;

      const features = [
        age,
        total_income,
        monthly_expenses,
        expense_to_income_ratio,
        monthly_cashflow,
        savings_rate,
        current_savings,
        has_emergency_fund,
        emergency_fund_months,
        has_kpr,
        has_vehicle_credit,
        pinjol_active_val,
        total_debt,
        debt_to_income_ratio,
        credit_card_utilization,
        financial_literacy_score,
        item_price,
        current_savings, // available_cash
        paylater_interest_rate,
        paylater_tenor_months,
        paylater_monthly_burden,
        item_to_income_ratio,
        employment_type_civil_servant,
        employment_type_entrepreneur,
        employment_type_freelance,
        employment_type_gig,
        employment_type_not_working,
        employment_type_permanent,
        city_tier_tier_1,
        city_tier_tier_2,
        city_tier_tier_3,
        paylater_usage_history_frequent,
        paylater_usage_history_never,
        paylater_usage_history_occasional,
        paylater_usage_history_problematic,
        impulse_spending_tendency_high,
        impulse_spending_tendency_low,
        impulse_spending_tendency_medium
      ];

      // Scale features using metadata parameters
      const mean = whatifMetadata.scaler_mean;
      const scale = whatifMetadata.scaler_scale;
      const scaledFeatures = features.map((val, idx) => (val - mean[idx]) / scale[idx]);

      let inputTensor = null;
      let prediction = null;
      try {
        inputTensor = tf.tensor2d([scaledFeatures], [1, 38]);
        prediction = whatifModel.predict(inputTensor);
        const probabilities = await prediction.array();
        const probRow = probabilities[0];

        const maxProb = Math.max(...probRow);
        const classIdx = probRow.indexOf(maxProb);

        recommendation = whatifMetadata.class_names[classIdx];
        confidence = maxProb;
      } catch (err) {
        console.error("What-If prediction model error:", err);
      } finally {
        if (inputTensor) inputTensor.dispose();
        if (prediction) prediction.dispose();
      }
    }

    // Apply manual override rules based on business logic (BAB 10.4 / 5.3)
    if (pinjol_active || paylater_monthly_burden > 0.28 || cashflow_after < 0) {
      recommendation = 'dont_buy';
      confidence = 0.95;
    } else if (paylater_monthly_burden < 0.15 && cashflow_after > 0 && !pinjol_active) {
      recommendation = 'just_buy';
      confidence = 0.88;
    }

    return res.status(200).json({
      recommendation: recommendation,
      paylater_monthly_burden: Number(paylater_monthly_burden.toFixed(4)),
      etr_after_purchase: Number(etr_after.toFixed(4)),
      cashflow_after_purchase: Number(cashflow_after.toFixed(2)),
      confidence: Number(confidence.toFixed(4))
    });

  } catch (error) {
    console.error("Error in predictWhatIf controller:", error);
    return res.status(500).json({ error: "Gagal memproses prediksi What-If", detail: error.message });
  }
};