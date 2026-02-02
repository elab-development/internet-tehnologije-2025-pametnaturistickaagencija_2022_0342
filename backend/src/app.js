const express = require('express')
const cors = require('cors')
const app = express()

app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  }),
)

app.use(express.json())

app.get('/health', (req, res) => res.json({ status: 'ok' }))

const apiRoutes = require('./routes')
app.use('/api', apiRoutes)

app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ message: 'Server error' })
})

module.exports = app
