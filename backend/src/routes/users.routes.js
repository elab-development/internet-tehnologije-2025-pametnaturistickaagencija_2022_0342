const express = require("express");
const prisma = require("../prisma");
const auth = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");
const bcrypt = require("bcrypt");

const router = express.Router();

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