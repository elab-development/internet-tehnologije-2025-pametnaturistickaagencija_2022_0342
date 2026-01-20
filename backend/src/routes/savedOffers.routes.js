const express = require("express");
const prisma = require("../prisma");

const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const userId = Number(req.query.userId);
    if (!userId) return res.status(400).json({ message: "userId is required" });

    const offers = await prisma.savedOffer.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    res.json(offers);
  } catch (e) {
    next(e);
  }
});


router.post("/", async (req, res, next) => {
  try {
    const { userId, name, price, siteLinks, offerType, date } = req.body;
    if (!userId || !name || price === undefined || !siteLinks || !offerType || !date) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const offer = await prisma.savedOffer.create({
      data: {
        userId: Number(userId),
        name,
        price,       
        siteLinks,   
        offerType,   
        date: new Date(date),
      },
    });

    res.status(201).json(offer);
  } catch (e) {
    next(e);
  }
});


router.delete("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    await prisma.savedOffer.delete({ where: { id } });
    res.status(204).send();
  } catch (e) {
    next(e);
  }
});

module.exports = router;