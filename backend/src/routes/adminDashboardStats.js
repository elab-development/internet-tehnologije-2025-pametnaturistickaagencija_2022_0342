const express = require('express')
const router = express.Router()
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

function jsonSafe(value) {
  return JSON.parse(JSON.stringify(value, (_k, v) => (typeof v === 'bigint' ? Number(v) : v)))
}

router.get('/', async (req, res) => {
  try {
    const [
      totalUsers,
      totalSavedOffers,
      totalChats,
      totalMessages,
      recentUsers,
      offerTypeStats,
      dailyStats,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.savedOffer.count(),
      prisma.chat.count(),
      prisma.message.count(),

      prisma.user.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
          createdAt: true,
          _count: {
            select: {
              savedOffers: true,
              chats: true,
            },
          },
        },
      }),

      prisma.savedOffer.groupBy({
        by: ['offerType'],
        _count: true, 
      }),

      // Dnevne statistike za poslednjih 7 dana
      prisma.$queryRaw`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as count
        FROM saved_offer
        WHERE created_at >= NOW() - INTERVAL '7 days'
        GROUP BY DATE(created_at)
        ORDER BY date DESC
      `,
    ])

    const usersByRole = await prisma.user.groupBy({
      by: ['role'],
      _count: true,
    })

    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const activeToday = await prisma.chat.groupBy({
      by: ['userId'],
      where: {
        createdAt: { gte: last24h },
      },
      _count: true,
    })

    return res.json(
      jsonSafe({
        success: true,
        data: {
          totals: {
            users: totalUsers,
            savedOffers: totalSavedOffers,
            chats: totalChats,
            messages: totalMessages,
            activeToday: activeToday.length,
          },
          usersByRole,
          offerTypeStats,
          recentUsers,
          dailyStats: dailyStats || [],
        },
      }),
    )
  } catch (error) {
    console.error('Dashboard stats error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

module.exports = router
