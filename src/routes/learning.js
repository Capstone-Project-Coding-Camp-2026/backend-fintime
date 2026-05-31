//GET /api/learning/recommendations
import { Router } from 'express'
import {
  getLearningRecommendations,
  getLearningById,
  getLearningCategories,
} from '../controllers/learningController.js'
import { authMiddleware } from '../middleware/auth.js'

const router = Router()

// GET /api/learning/recommendations — filter by condition & category
router.get('/recommendations', authMiddleware, getLearningRecommendations)

// GET /api/learning/categories — daftar kategori & kondisi yang tersedia
router.get('/categories', getLearningCategories)

// GET /api/learning/:id — detail satu konten edukasi
router.get('/:id', getLearningById)

export default router
