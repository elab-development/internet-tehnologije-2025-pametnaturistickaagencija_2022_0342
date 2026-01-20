const express = require("express");
const prisma = require("../prisma");

const router = express.Router();


router.get("/", async (req, res, next) => {
  try {
    const users = await prisma.user.findMany();
    res.json(users);
  } catch (e) {
    next(e);
  }
});


router.post("/", async (req, res, next) => {
  try {
    const { email, password, firstName, lastName, role } = req.body;

    const user = await prisma.user.create({
      data: { email, password, firstName, lastName, role },
    });

    res.status(201).json(user);
  } catch (e) {
    next(e);
  }
});

module.exports = router;