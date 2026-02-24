const express = require('express')

const authRoutes = require('./auth.routes')
const usersRoutes = require('./users.routes')
const chatsRoutes = require('./chats.routes')
const messagesRoutes = require('./messages.routes')
const savedOffersRoutes = require('./savedOffers.routes')
const adminDashboardStatsRoute = require('./adminDashboardStats')
const adminUsers = require('./adminUsers')
const adminSettingsRoute = require('./adminSettings')

const router = express.Router()

router.use('/auth', authRoutes)

router.use('/users', usersRoutes)
router.use('/chats', chatsRoutes)
router.use('/messages', messagesRoutes)
router.use('/saved-offers', savedOffersRoutes)
router.use('/admin/dashboard-stats', adminDashboardStatsRoute)
router.use('/admin/users', adminUsers)
router.use('/admin/settings', adminSettingsRoute)

module.exports = router