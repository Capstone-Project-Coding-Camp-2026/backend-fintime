// src/routes/mockRoutes.js
import express from 'express';
import { generateMockTransactions, simulateOtp, importTransactions } from '../controllers/mockController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// POST /api/mock/send-otp
router.post('/send-otp', simulateOtp);

// GET /api/mock/transactions — generate transaksi sintetis tanpa menyimpan ke DB
router.get('/transactions', generateMockTransactions);

// POST /api/mock/import-transactions — import mock ke DB user yang sedang login
router.post('/import-transactions', authMiddleware, importTransactions);

// POST /api/transactions/sync 
// Sync dari Mock API + NLP + cek label_rules → aggregation → forecast → avatar
export default router;
