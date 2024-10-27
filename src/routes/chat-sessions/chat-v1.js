const express = require("express");
const { asyncHandler } = require("@middlewares/asyncHandler");
const { combinedChatStream } = require("@utils/ai/openAi/chat/combinedStream");
const { streamHeaders } = require("@middlewares/setupHeaders");

const router = express.Router();

// --- Stream completion endpoint ---
router.post("/stream", streamHeaders, asyncHandler(combinedChatStream));

module.exports = router;
