import * as tf from '@tensorflow/tfjs';

// ==========================================
// INISIALISASI & LOAD MODEL
// ==========================================
let classifyModel, forecastModel, whatifModel;

export const loadModels = async () => {
  try {
    console.log("Memuat model TensorFlow.js...");
    // classifyModel = await tf.loadLayersModel('file://./src/models/tfjs/classify/model.json');
    // forecastModel = await tf.loadLayersModel('file://./src/models/tfjs/forecast/model.json');
    whatifModel = await tf.loadLayersModel('file://./src/models/tfjs/whatif/model.json');
    console.log("Model TFJS (Simulasi) siap!");
  } catch (error) {
    console.error("Gagal memuat model:", error);
  }
};

// ==========================================
// CONTROLLER: WHAT-IF DECISION LAB
// ==========================================
export const predictWhatIf = async (req, res) => {
  try {
    const payload = req.body;

    // Validasi
    if (!payload.item_price || !payload.paylater_tenor_months) {
      return res.status(400).json({ error: "Data skenario pembelian tidak lengkap" });
    }

    // Kalkulasi Matematis Finansial
    const paylater_monthly_payment = (payload.item_price / payload.paylater_tenor_months) * (1 + payload.paylater_interest_rate);
    const estimated_income = payload.monthly_cashflow / Math.max(1 - payload.current_etr, 0.01);
    
    const paylater_monthly_burden = paylater_monthly_payment / estimated_income;
    const etr_after = (estimated_income * payload.current_etr + paylater_monthly_payment) / estimated_income;
    const cashflow_after = payload.monthly_cashflow - paylater_monthly_payment;

    // -- Mock Data TFJS Sementara --
    let recommendation = 'buy_careful';
    let confidence = 0.82;

    if (payload.pinjol_active || paylater_monthly_burden > 0.28 || cashflow_after < 0) {
      recommendation = 'dont_buy';
      confidence = 0.95;
    } else if (paylater_monthly_burden < 0.15 && cashflow_after > 0 && !payload.pinjol_active) {
      recommendation = 'just_buy';
      confidence = 0.88;
    }

    return res.status(200).json({
      recommendation: recommendation,
      paylater_monthly_burden: Number(paylater_monthly_burden.toFixed(4)),
      etr_after_purchase: Number(etr_after.toFixed(4)),
      cashflow_after_purchase: Number(cashflow_after.toFixed(2)),
      confidence: confidence
    });

  } catch (error) {
    return res.status(500).json({ error: "Gagal memproses prediksi What-If", detail: error.message });
  }
};