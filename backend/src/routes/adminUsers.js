const express = require('express')
const router = express.Router()
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

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
