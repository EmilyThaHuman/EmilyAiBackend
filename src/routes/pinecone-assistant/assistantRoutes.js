// routes/chatRoutes.js

const express = require("express");
const router = express.Router();
const { pineconeAssistantChat } = require("@controllers/pinecone-assistant");

router.post("/", pineconeAssistantChat);

module.exports = router;
