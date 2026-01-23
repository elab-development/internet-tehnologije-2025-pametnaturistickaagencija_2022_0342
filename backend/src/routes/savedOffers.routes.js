const express = require("express");
const prisma = require("../prisma");
const auth = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");

const router = express.Router();

router.get("/", auth, async (req, res, next) => {
  try {
    const userId = Number(req.user.userId);

    const offers = await prisma.savedOffer.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    res.json(offers);
  } catch (e) {
    next(e);
  }
});

router.post("/", auth, async (req, res, next) => {
  try {
    const { name, price, siteLinks, offerType, date } = req.body;
    if (!name || price === undefined || !siteLinks || !offerType || !date) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const userId = Number(req.user.userId);

    const offer = await prisma.savedOffer.create({
      data: { userId, name, price, siteLinks, offerType, date: new Date(date) },
    });

    res.status(201).json(offer);
  } catch (e) {
    next(e);
  }
});

router.delete("/:id", auth, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const userId = Number(req.user.userId);

    if (req.user.role === "ADMIN") {
      await prisma.savedOffer.delete({ where: { id } });
      return res.status(204).send();
    }

    await prisma.savedOffer.delete({
      where: { id, userId },
    });

    res.status(204).send();
  } catch (e) {
    next(e);
  }
});

module.exports = router;