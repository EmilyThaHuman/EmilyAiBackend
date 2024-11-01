const express = require("express");
const router = express.Router();
const { handleCrawlRequest } = require("@controllers/chat-tools");

router.post("/", handleCrawlRequest);

module.exports = router;
