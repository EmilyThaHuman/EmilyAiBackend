const { handleSearchRequest } = require("@controllers/chat-tools");
const express = require("express");
const router = express.Router();

router.get("/", handleSearchRequest);

module.exports = router;
