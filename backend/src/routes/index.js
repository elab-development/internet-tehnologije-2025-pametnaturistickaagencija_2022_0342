const express = require("express");

const usersRoutes = require("./users.routes");
const chatsRoutes = require("./chats.routes");
const messagesRoutes = require("./messages.routes");
const savedOffersRoutes = require("./savedOffers.routes");

const router = express.Router();

router.use("/users", usersRoutes);
router.use("/chats", chatsRoutes);
router.use("/messages", messagesRoutes);
router.use("/saved-offers", savedOffersRoutes);

module.exports = router;