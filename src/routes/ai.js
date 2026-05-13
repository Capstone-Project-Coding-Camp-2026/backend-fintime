const express = require('express');
const router = express.Router();
const tf = require('@tensorflow/tfjs-node');

// Variabel penampung model
let classifyModel, forecastModel, whatifModel;

// Fungsi untuk me-load model TFJS ke memory
const loadModels = async () => {
    try {
        console.log("Loading TensorFlow Models...");
        classifyModel = await tf.loadLayersModel('file://./src/models/tfjs/classify/model.json');
        forecastModel = await tf.loadLayersModel('file://./src/models/tfjs/forecast/model.json');
        whatifModel = await tf.loadLayersModel('file://./src/models/tfjs/whatif/model.json');
        console.log("Semua model TFJS berhasil dimuat");
    } catch (error) {
        console.error("Gagal memuat model TFJS. Pastikan file model.json dan .bin tersedia.", error);
    }
};

// Jalankan load function
loadModels();

// ==========================================
// ENDPOINT CLASSIFY (NLP Transaksi)
// ==========================================
router.post('/classify', async (req, res) => {
    try {
        const { transactions } = req.body;
        const results = [];

        for (const tx of transactions) {
            const inputTensor = tf.tensor1d([tx.description]);
            const prediction = classifyModel.predict(inputTensor);
            
            // Tarik probabilitas
            const probabilities = await prediction.array();
            const maxConfidence = Math.max(...probabilities[0]);
            const classIndex = probabilities[0].indexOf(maxConfidence);

            // Mapping manual (sesuaikan urutan dengan saat training di Python)
            const classes = [
                'makanan', 'transport', 'hiburan', 'belanja', 'tagihan', 
                'kesehatan', 'pendidikan', 'lainnya', 'transfer_keluarga', 
                'transfer_sosial', 'tidak_diketahui', 'topup_ewallet', 'transfer_internal'
            ];

            let finalCategory = classes[classIndex];
            
            // Fallback Layer 3: Jika confidence < 0.7, set ke 'lainnya'
            if (maxConfidence < 0.7) {
                finalCategory = 'lainnya';
            }

            results.push({
                id: tx.id,
                category: finalCategory,
                confidence: maxConfidence
            });

            // Bersihkan memori tensor untuk mencegah memory leak
            tf.dispose([inputTensor, prediction]); 
        }

        res.json({ results });
    } catch (err) {
        res.status(500).json({ error: 'TFJS Classify Error', detail: err.message });
    }
});

