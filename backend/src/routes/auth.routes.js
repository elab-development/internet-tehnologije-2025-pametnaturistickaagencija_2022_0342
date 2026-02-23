const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const prisma = require("../prisma");

const router = express.Router();

function signToken(user) {
  return jwt.sign(
    { userId: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
}

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Registracija korisnika
 *     description: Kreira novog korisnika i vraća JWT token.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, firstName, lastName]
 *             properties:
 *               email:
 *                 type: string
 *                 example: user@test.com
 *               password:
 *                 type: string
 *                 example: test123
 *               firstName:
 *                 type: string
 *                 example: Katarina
 *               lastName:
 *                 type: string
 *                 example: Rajic
 *     responses:
 *       201:
 *         description: Uspešna registracija
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: number
 *                       example: 1
 *                     email:
 *                       type: string
 *                       example: user@test.com
 *                     firstName:
 *                       type: string
 *                       example: Katarina
 *                     lastName:
 *                       type: string
 *                       example: Rajic
 *                     role:
 *                       type: string
 *                       example: USER
 *       400:
 *         description: Nedostaju obavezna polja
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: email, password, firstName, lastName su obavezni.
 *       409:
 *         description: Email je već registrovan
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Email je već registrovan.
 *       500:
 *         description: Interna greška servera
 */
router.post("/register", async (req, res) => {
  const { email, password, firstName, lastName } = req.body;

  if (!email || !password || !firstName || !lastName) {
    return res.status(400).json({ message: "email, password, firstName, lastName su obavezni." });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return res.status(409).json({ message: "Email je već registrovan." });
  }

  const hashed = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      email,
      password: hashed,
      firstName,
      lastName,
      role: "USER",
    },
  });

  const token = signToken(user);

  return res.status(201).json({
    token,
    user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role },
  });
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Prijava korisnika
 *     description: Proverava kredencijale i vraća JWT token.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 example: user@test.com
 *               password:
 *                 type: string
 *                 example: test123
 *     responses:
 *       200:
 *         description: Uspešna prijava
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: number
 *                       example: 1
 *                     email:
 *                       type: string
 *                       example: user@test.com
 *                     firstName:
 *                       type: string
 *                       example: Katarina
 *                     lastName:
 *                       type: string
 *                       example: Rajic
 *                     role:
 *                       type: string
 *                       example: USER
 *       400:
 *         description: Nedostaju email ili password
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: email i password su obavezni.
 *       401:
 *         description: Pogrešan email ili lozinka
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Pogrešan email ili lozinka.
 *       500:
 *         description: Interna greška servera
 */
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "email i password su obavezni." });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return res.status(401).json({ message: "Pogrešan email ili lozinka." });
  }

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) {
    return res.status(401).json({ message: "Pogrešan email ili lozinka." });
  }

  const token = signToken(user);

  return res.json({
    token,
    user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role },
  });
});

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Odjava korisnika
 *     description: Logout je logički — token se briše na klijentu.
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Uspešan logout
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Logout uspešan (obrisati token na klijentu).
 */
router.post("/logout", (req, res) => {
  return res.json({ message: "Logout uspešan (obrisati token na klijentu)." });
});

module.exports = router;

