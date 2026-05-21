import { Router } from 'express';
import { predictWhatIf, classifyTransactions, forecastTransactions } from '../controllers/aiController.js'; 

const router = Router();

// Endpoint untuk AI
router.post('/whatif', predictWhatIf);
router.post('/classify', classifyTransactions);
router.post('/forecast', forecastTransactions);

export default router;