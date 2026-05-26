// src/routes/mockRoutes.js
import express from 'express';
import { generateMockTransactions, simulateOtp, importTransactions } from '../controllers/mockController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

router.post('/send-otp', simulateOtp);
router.get('/transactions', generateMockTransactions);
router.post('/import-transactions', authMiddleware, importTransactions);

export default router;