// src/routes/mockRoutes.js
import express from 'express';
import { generateMockTransactions, simulateOtp } from '../controllers/mockController.js';

const router = express.Router();

router.post('/send-otp', simulateOtp);
router.get('/transactions', generateMockTransactions);

export default router;