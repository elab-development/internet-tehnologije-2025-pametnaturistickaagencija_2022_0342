const express = require('express')
const router = express.Router()
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: Admin lista korisnika (paginacija, pretraga, filtriranje, sortiranje)
 *     description: Vraća paginiranu listu korisnika sa statistikama (broj chatova, broj sačuvanih ponuda i poslednja aktivnost).
 *     tags: [Admin]
 *     parameters:
 *       - in: query
 *         name: page
 *         description: Broj strane (1+)
 *         schema:
 *           type: integer
 *           example: 1
 *       - in: query
 *         name: limit
 *         description: Broj rezultata po strani (1-100)
 *         schema:
 *           type: integer
 *           example: 10
 *       - in: query
 *         name: search
 *         description: Tekst pretrage (firstName, lastName, email, phone)
 *         schema:
 *           type: string
 *           example: "katarina"
 *       - in: query
 *         name: role
 *         description: Filter po roli (npr. USER, ADMIN, GUEST)
 *         schema:
 *           type: string
 *           example: "USER"
 *       - in: query
 *         name: sortBy
 *         description: Polje za sortiranje
 *         schema:
 *           type: string
 *           enum: [id, firstName, lastName, email, role, createdAt]
 *           example: createdAt
 *       - in: query
 *         name: sortOrder
 *         description: Smer sortiranja
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           example: desc
 *     responses:
 *       200:
 *         description: Uspešno vraćena lista korisnika
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
 *                     users:
 *                       type: array
 *                       items:
 *                         type: object
 *                         description: Korisnik sa stats poljem
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                           example: 1
 *                         limit:
 *                           type: integer
 *                           example: 10
 *                         total:
 *                           type: integer
 *                           example: 120
 *                         totalPages:
 *                           type: integer
 *                           example: 12
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
  console.log('originalUrl:', req.originalUrl)
  console.log('query:', req.query)

  try {
    const page = parseInt(req.query.page || '1', 10)
    const limit = parseInt(req.query.limit || '10', 10)
    const search = (req.query.search || '').toString()
    const role = (req.query.role || '').toString()
    const sortBy = (req.query.sortBy || 'createdAt').toString()
    const sortOrder = (req.query.sortOrder || 'desc').toString().toLowerCase()

    const safePage = Number.isFinite(page) && page > 0 ? page : 1
    const safeLimit = Number.isFinite(limit) && limit > 0 && limit <= 100 ? limit : 10
    const safeSortOrder = sortOrder === 'asc' ? 'asc' : 'desc'

    const where = {}

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ]
    }

    console.log(where, search, req.query)

    if (role) {
      where.role = role
    }

    const validSortFields = ['id', 'firstName', 'lastName', 'email', 'role', 'createdAt']
    const orderBy = validSortFields.includes(sortBy)
      ? { [sortBy]: safeSortOrder }
      : { createdAt: 'desc' }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip: (safePage - 1) * safeLimit,
        take: safeLimit,
        orderBy,
        include: {
          _count: {
            select: {
              savedOffers: true,
              chats: true,
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ])

    const usersWithStats = await Promise.all(
      users.map(async user => {
        const lastActive = await prisma.chat.findFirst({
          where: { userId: user.id },
          orderBy: { createdAt: 'desc' },
          select: { createdAt: true },
        })

        return {
          ...user,
          stats: {
            totalChats: user._count.chats,
            totalSavedOffers: user._count.savedOffers,
            lastActive: lastActive?.createdAt || null,
          },
        }
      }),
    )

    return res.json({
      success: true,
      data: {
        users: usersWithStats,
        pagination: {
          page: safePage,
          limit: safeLimit,
          total,
          totalPages: Math.ceil(total / safeLimit),
        },
      },
    })
  } catch (error) {
    console.error('Admin users API error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * @swagger
 * /api/admin/users:
 *   delete:
 *     summary: Brisanje korisnika (bulk) - admin
 *     description: Briše korisnike na osnovu niza userIds. Ne dozvoljava brisanje admin korisnika.
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userIds]
 *             properties:
 *               userIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 example: [2, 3, 4]
 *     responses:
 *       200:
 *         description: Uspešno obrisani korisnici
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "3 korisnika je uspešno obrisano"
 *       400:
 *         description: Neispravan zahtev (userIds nije validan)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: userIds must be a non-empty array
 *       403:
 *         description: Zabranjeno (pokušaj brisanja admin korisnika)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Cannot delete admin users
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
router.delete('/', async (req, res) => {
  try {
    const { userIds } = req.body || {}

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ error: 'userIds must be a non-empty array' })
    }

    const ids = userIds.map(x => Number(x)).filter(x => Number.isFinite(x))
    if (ids.length === 0) {
      return res.status(400).json({ error: 'userIds must contain valid numeric ids' })
    }

    const admins = await prisma.user.findMany({
      where: {
        id: { in: ids },
        role: 'ADMIN',
      },
      select: { id: true },
    })

    if (admins.length > 0) {
      return res.status(403).json({ error: 'Cannot delete admin users' })
    }

    await prisma.user.deleteMany({
      where: { id: { in: ids } },
    })

    const ipAddress =
      (req.headers['x-forwarded-for'] &&
        req.headers['x-forwarded-for'].toString().split(',')[0].trim()) ||
      req.ip ||
      'unknown'

    await prisma.adminLog.create({
      data: {
        adminId: req.user.id,
        action: 'DELETE_USERS',
        details: { userIds: ids },
        ipAddress,
      },
    })

    return res.json({
      success: true,
      message: `${ids.length} korisnika je uspešno obrisano`,
    })
  } catch (error) {
    console.error('Admin users DELETE error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

module.exports = router
