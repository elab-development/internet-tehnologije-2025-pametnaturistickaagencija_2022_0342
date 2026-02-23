const express = require("express");
const prisma = require("../prisma");
const auth = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");
const bcrypt = require("bcrypt");

const router = express.Router();

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Lista svih korisnika (ADMIN)
 *     description: Vraća listu svih korisnika. Dostupno samo administratoru.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista korisnika
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                     example: 1
 *                   email:
 *                     type: string
 *                     example: admin@test.com
 *                   firstName:
 *                     type: string
 *                     example: Katarina
 *                   lastName:
 *                     type: string
 *                     example: Rajic
 *                   role:
 *                     type: string
 *                     example: ADMIN
 *       401:
 *         description: Neautorizovan pristup
 *       403:
 *         description: Zabranjeno – potrebna ADMIN rola
 */
router.get("/", auth, requireRole("ADMIN"), async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, firstName: true, lastName: true, role: true },
      orderBy: { id: "asc" },
    });
    res.json(users);
  } catch (e) {
    next(e);
  }
});

/**
 * @swagger
 * /api/users/{id}:
 *   patch:
 *     summary: Izmena korisnika (ADMIN)
 *     description: Ažurira podatke korisnika. Dostupno samo administratoru.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID korisnika
 *         schema:
 *           type: integer
 *           example: 2
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 example: user@test.com
 *               firstName:
 *                 type: string
 *                 example: Marko
 *               lastName:
 *                 type: string
 *                 example: Markovic
 *               role:
 *                 type: string
 *                 example: USER
 *               password:
 *                 type: string
 *                 example: novaLozinka123
 *     responses:
 *       200:
 *         description: Uspešno ažuriran korisnik
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       401:
 *         description: Neautorizovan pristup
 *       403:
 *         description: Zabranjeno – potrebna ADMIN rola
 *       404:
 *         description: Korisnik nije pronađen
 */
router.patch("/:id", auth, requireRole("ADMIN"), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { email, password, firstName, lastName, role } = req.body;

    const data = {};
    if (email !== undefined) data.email = email;
    if (firstName !== undefined) data.firstName = firstName;
    if (lastName !== undefined) data.lastName = lastName;
    if (role !== undefined) data.role = role;
    if (password !== undefined) data.password = await bcrypt.hash(password, 10);

    const user = await prisma.user.update({
      where: { id },
      data,
      select: { id: true, email: true, firstName: true, lastName: true, role: true },
    });

    res.json(user);
  } catch (e) {
    next(e);
  }
});

/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     summary: Brisanje korisnika (ADMIN)
 *     description: Briše korisnika po ID-u. Dostupno samo administratoru.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID korisnika
 *         schema:
 *           type: integer
 *           example: 3
 *     responses:
 *       204:
 *         description: Korisnik uspešno obrisan
 *       401:
 *         description: Neautorizovan pristup
 *       403:
 *         description: Zabranjeno – potrebna ADMIN rola
 *       404:
 *         description: Korisnik nije pronađen
 */
router.delete("/:id", auth, requireRole("ADMIN"), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    await prisma.user.delete({ where: { id } });
    res.status(204).send();
  } catch (e) {
    next(e);
  }
});

module.exports = router;