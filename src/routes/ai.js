// const express = require('express');
// const router = express.Router();
// const tf = require('@tensorflow/tfjs-node');

// // Variabel penampung model
// let classifyModel, forecastModel, whatifModel;

// // Fungsi untuk me-load model TFJS ke memory
// const loadModels = async () => {
//     try {
//         console.log("Loading TensorFlow Models...");
//         classifyModel = await tf.loadLayersModel('file://./src/models/tfjs/classify/model.json');
//         forecastModel = await tf.loadLayersModel('file://./src/models/tfjs/forecast/model.json');
//         whatifModel = await tf.loadLayersModel('file://./src/models/tfjs/whatif/model.json');
//         console.log("Semua model TFJS berhasil dimuat");
//     } catch (error) {
//         console.error("Gagal memuat model TFJS. Pastikan file model.json dan .bin tersedia.", error);
//     }
// };

// // Jalankan load function
// loadModels();

// // ==========================================
// // ENDPOINT CLASSIFY (NLP Transaksi)
// // ==========================================
// router.post('/classify', async (req, res) => {
//     try {
//         const { transactions } = req.body;
//         const results = [];

//         for (const tx of transactions) {
//             const inputTensor = tf.tensor1d([tx.description]);
//             const prediction = classifyModel.predict(inputTensor);
            
//             // Tarik probabilitas
//             const probabilities = await prediction.array();
//             const maxConfidence = Math.max(...probabilities[0]);
//             const classIndex = probabilities[0].indexOf(maxConfidence);

//             // Mapping manual (sesuaikan urutan dengan saat training di Python)
//             const classes = [
//                 'makanan', 'transport', 'hiburan', 'belanja', 'tagihan', 
//                 'kesehatan', 'pendidikan', 'lainnya', 'transfer_keluarga', 
//                 'transfer_sosial', 'tidak_diketahui', 'topup_ewallet', 'transfer_internal'
//             ];

//             let finalCategory = classes[classIndex];
            
//             // Fallback Layer 3: Jika confidence < 0.7, set ke 'lainnya'
//             if (maxConfidence < 0.7) {
//                 finalCategory = 'lainnya';
//             }

//             results.push({
//                 id: tx.id,
//                 category: finalCategory,
//                 confidence: maxConfidence
//             });

//             // Bersihkan memori tensor untuk mencegah memory leak
//             tf.dispose([inputTensor, prediction]); 
//         }

//         res.json({ results });
//     } catch (err) {
//         res.status(500).json({ error: 'TFJS Classify Error', detail: err.message });
//     }
// });

// // ==========================================
// // ENDPOINT FORECAST
// // ==========================================
// router.post('/forecast', async (req, res) => {
//     try {
//         const { monthly_data } = req.body;
        
//         // Ambil data bulan terakhir sebagai input awal
//         const lastData = monthly_data[monthly_data.length - 1];
//         let currentFeatures = [
//             lastData.monthly_income, lastData.total_expense, lastData.expense_housing, 
//             lastData.expense_food, lastData.expense_transport, lastData.expense_entertainment, 
//             lastData.expense_health, lastData.expense_education, lastData.savings_capacity, 
//             lastData.current_total_balance, lastData.expense_to_income_ratio, 
//             lastData.savings_rate, monthly_data.length // bulan_index
//         ];

//         const predicted_expenses = [];

//         // Prediksi rolling 12 bulan
//         for (let i = 0; i < 12; i++) {
//             currentFeatures[12] = monthly_data.length + i + 1; // update bulan_index
            
//             const inputTensor = tf.tensor2d([currentFeatures]);
//             const prediction = forecastModel.predict(inputTensor);
            
//             const predValue = (await prediction.array())[0][0]; // Ambil angka regresi
//             predicted_expenses.append(predValue);

//             // Update fitur untuk iterasi berikutnya
//             currentFeatures[1] = predValue; // update total_expense
//             currentFeatures[8] = currentFeatures[0] - predValue; // update savings_capacity
            
//             tf.dispose([inputTensor, prediction]);
//         }

//         res.json({ success: true, predicted_expenses });
//     } catch (err) {
//         res.status(500).json({ error: 'TFJS Forecast Error', detail: err.message });
//     }
// });

// // ==========================================
// // ENDPOINT WHAT-IF
// // ==========================================
// router.post('/whatif', async (req, res) => {
//     try {
//         const payload = req.body;
        
//         // Hitung derived features
//         const paylater_monthly_payment = (payload.item_price / payload.paylater_tenor_months) * (1 + payload.paylater_interest_rate);
//         const paylater_monthly_burden = paylater_monthly_payment / (payload.monthly_cashflow || 1);
//         const estimated_income = payload.monthly_cashflow / Math.max(1 - payload.current_etr, 0.01);
//         const etr_after = (estimated_income * payload.current_etr + paylater_monthly_payment) / estimated_income;
//         const cashflow_after = payload.monthly_cashflow - paylater_monthly_payment;

//         const PAYLATER_MAP = { 'never': 0, 'occasional': 1, 'frequent': 2, 'problematic': 3 };

//         // Vector 10 fitur
//         const features = [
//             payload.current_etr,
//             payload.monthly_cashflow,
//             payload.pinjol_active ? 1 : 0,
//             PAYLATER_MAP[payload.paylater_usage_history] || 0,
//             payload.item_price,
//             payload.paylater_tenor_months,
//             payload.paylater_interest_rate,
//             paylater_monthly_burden,
//             etr_after,
//             cashflow_after
//         ];

//         const inputTensor = tf.tensor2d([features]);
//         const prediction = whatifModel.predict(inputTensor);
//         const proba = await prediction.array();
        
//         const maxConfidence = Math.max(...proba[0]);
//         const labelIdx = proba[0].indexOf(maxConfidence);
//         const classes = ['just_buy', 'buy_careful', 'dont_buy'];

//         tf.dispose([inputTensor, prediction]);

//         res.json({
//             recommendation: classes[labelIdx],
//             paylater_monthly_burden: Number(paylater_monthly_burden.toFixed(4)),
//             etr_after_purchase: Number(etr_after.toFixed(4)),
//             cashflow_after_purchase: Number(cashflow_after.toFixed(2)),
//             confidence: Number(maxConfidence.toFixed(4))
//         });

//     } catch (err) {
//         res.status(500).json({ error: 'TFJS What-If Error', detail: err.message });
//     }
// });

// module.exports = router;
