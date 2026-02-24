const express = require('express')
const router = express.Router()
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

function jsonSafe(value) {
  return JSON.parse(JSON.stringify(value, (_k, v) => (typeof v === 'bigint' ? Number(v) : v)))
}

/**
 * @swagger
 * /api/admin/dashboard-stats:
 *   get:
 *     summary: Admin dashboard statistike (totali, korisnici po rolama, statistike ponuda i aktivnost)
 *     description: Vraća agregirane statistike za admin dashboard (ukupan broj korisnika, ponuda, chatova, poruka, aktivne korisnike u poslednjih 24h, korisnike po rolama, statistike ponuda po tipu, poslednjih 5 korisnika i dnevne statistike za poslednjih 7 dana).
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: Uspešno vraćene dashboard statistike
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     totals:
 *                       type: object
 *                       properties:
 *                         users:
 *                           type: number
 *                           example: 120
 *                         savedOffers:
 *                           type: number
 *                           example: 350
 *                         chats:
 *                           type: number
 *                           example: 210
 *                         messages:
 *                           type: number
 *                           example: 1800
 *                         activeToday:
 *                           type: number
 *                           example: 12
 *                     usersByRole:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           role:
 *                             type: string
 *                             example: USER
 *                           _count:
 *                             oneOf:
 *                               - type: number
 *                                 example: 100
 *                               - type: object
 *                                 example: { "role": 100 }
 *                     offerTypeStats:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           offerType:
 *                             type: string
 *                             example: HOTEL
 *                           _count:
 *                             type: number
 *                             example: 45
 *                     recentUsers:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: number
 *                             example: 1
 *                           firstName:
 *                             type: string
 *                             example: Katarina
 *                           lastName:
 *                             type: string
 *                             example: Rajic
 *                           email:
 *                             type: string
 *                             example: admin@test.com
 *                           role:
 *                             type: string
 *                             example: ADMIN
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                             example: "2026-02-23T10:15:30.000Z"
 *                           _count:
 *                             type: object
 *                             properties:
 *                               savedOffers:
 *                                 type: number
 *                                 example: 3
 *                               chats:
 *                                 type: number
 *                                 example: 5
 *                     dailyStats:
 *                       type: array
 *                       description: Dnevne statistike sačuvanih ponuda za poslednjih 7 dana
 *                       items:
 *                         type: object
 *                         properties:
 *                           date:
 *                             type: string
 *                             format: date
 *                             example: "2026-02-22"
 *                           count:
 *                             type: number
 *                             example: 10
 *       500:
 *         description: Interna greška servera
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Internal server error
 */
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
