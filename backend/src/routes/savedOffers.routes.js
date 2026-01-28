const express = require("express");
const prisma = require("../prisma");
const auth = require("../middleware/auth");

const router = express.Router();


router.use(auth);


router.get("/", async (req, res, next) => {
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


router.post("/", async (req, res, next) => {
  try {
    const userId = Number(req.user.userId);
    const { name, price, siteLinks, offerType, date } = req.body;

    if (!name || price === undefined || !siteLinks || !offerType || !date) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const offer = await prisma.savedOffer.create({
      data: {
        userId,
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
    const userId = Number(req.user.userId);
    const id = Number(req.params.id);

    const existing = await prisma.savedOffer.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return res.status(404).json({ message: "Saved offer not found" });
    }

    await prisma.savedOffer.delete({ where: { id } });
    res.status(204).send();
  } catch (e) {
    next(e);
  }
});

module.exports = router;