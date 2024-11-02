// openAIRoutes.js
const express = require('express');
const { handleStreamingChatCompletion } = require('./openAIController');

const router = express.Router();

router.post('/openai/streaming-chat', handleStreamingChatCompletion);

module.exports = router;
