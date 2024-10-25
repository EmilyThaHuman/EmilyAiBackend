const express = require("express");
const { asyncHandler } = require("@middlewares/asyncHandler");
const { logger } = require("@config/logging");
const { combinedChatStream } = require("@utils/ai/openAi/chat/combinedStream");
const { ChatOpenAI } = require("@langchain/openai");
const { getEnv } = require("@utils/api");
const { streamHeaders } = require("@middlewares/setupHeaders");

const router = express.Router();

// --- Stream completion endpoint ---
router.post("/stream", streamHeaders, asyncHandler(combinedChatStream));

// --- Chat completion endpoint ---
router.post("/stream", streamHeaders, asyncHandler(combinedChatStream));

module.exports = router;
