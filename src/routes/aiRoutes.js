import { Router } from 'express';
import { predictWhatIf } from '../controllers/aiController.js'; 

const router = Router();

// Endpoint untuk AI
router.post('/whatif', predictWhatIf);

export default router;