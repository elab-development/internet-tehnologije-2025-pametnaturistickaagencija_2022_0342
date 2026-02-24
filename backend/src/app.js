const express = require('express')
const cors = require('cors')

const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./swagger");

const app = express()

app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  }),
)


app.use(express.json())

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.get("/swagger.json", (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.send(swaggerSpec);
});

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Provera rada servera
 *     tags: [System]
 *     responses:
 *       200:
 *         description: Server radi
 */

app.get('/health', (req, res) => res.json({ status: 'ok' }))
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' })
})

const apiRoutes = require('./routes')
app.use('/api', apiRoutes)

const travelRoutes = require('./routes/travel.routes')
app.use('/api', travelRoutes)

const travelChatRoutes = require('./routes/travel.chat.routes')
app.use('/api', travelChatRoutes)

app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ message: 'Server error' })
})

module.exports = app
