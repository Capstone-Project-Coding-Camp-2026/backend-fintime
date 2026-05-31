/**
 * Konten edukasi keuangan
 * GET /api/learning/recommendations
 */
import prisma from '../lib/prisma.js'

export async function getLearningRecommendations(req, res, next) {
  try {
    const { condition, category, limit = 10, page = 1 } = req.query

    // Tentukan condition: dari query param, dari avatar user (jika login), atau default 'all'
    let targetCondition = condition
    if (!targetCondition && req.user?.sub) {
      const avatarState = await prisma.avatarState.findUnique({
        where: { userId: req.user.sub },
        select: { condition: true },
      })
      targetCondition = avatarState?.condition
    }

    // targetCondition: good / normal / bad / all
    const where = {}
    if (targetCondition && ['good', 'normal', 'bad'].includes(targetCondition)) {
      where.OR = [
        { targetCondition },
        { targetCondition: 'all' },
      ]
    }
    if (category) {
      where.category = category
    }

    const skip = (parseInt(page) - 1) * parseInt(limit)

    const [learnings, total] = await Promise.all([
      prisma.learning.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.learning.count({ where }),
    ])

    res.json({
      success: true,
      data: learnings,
      meta: {
        targetCondition: targetCondition || 'all',
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    })
  } catch (e) {
    next(e)
  }
}

/**
 * GET /api/learning/:id — ambil satu konten edukasi
 */
export async function getLearningById(req, res, next) {
  try {
    const { id } = req.params

    const learning = await prisma.learning.findUnique({
      where: { id },
    })

    if (!learning) {
      return res.status(404).json({ success: false, message: 'Learning content not found' })
    }

    res.json({ success: true, data: learning })
  } catch (e) {
    next(e)
  }
}

/**
 * GET /api/learning/categories — daftar kategori yang tersedia
 */
export async function getLearningCategories(req, res, next) {
  try {
    // Kategori sesuai README BAB 8.5
    const categories = ['investasi', 'budgeting', 'utang', 'tabungan', 'pensiun']
    const conditions = ['good', 'normal', 'bad', 'all']

    res.json({
      success: true,
      data: { categories, conditions },
    })
  } catch (e) {
    next(e)
  }
}
