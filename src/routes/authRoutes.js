import { Router } from 'express'
import { login, profile, register } from '../controllers/authController.js'
import { authMiddleware } from '../middlewares/auth.js'

const r = Router()
r.post('/register', register)
r.post('/login', login)
r.get('/profile', authMiddleware, profile)

export default r
