const express = require("express");
const { asyncHandler } = require("@middlewares/asyncHandler");
const { logger } = require("@config/logging");

const router = express.Router();

// Import CopilotKit and OpenAI Adapter
const { CopilotKit, Agent } = require('copilotkit');
const { OpenAIAdapter } = require('copilotkit/adapters/openai');

// Initialize OpenAI Adapter
const openAIAdapter = new OpenAIAdapter({
  apiKey: getEnv("OPENAI_API_PROJECT_KEY"),
});

// Initialize CopilotKit with OpenAI adapter
const copilotKit = new CopilotKit({
  adapter: openAIAdapter,
});

// Define an agent with a custom prompt
const agent = new Agent({
  name: 'Assistant',
  prompt: 'You are a helpful assistant that answers questions concisely.',
  adapter: openAIAdapter,
});

// API route to handle chat messages
router.post('/api/chat', async (req, res) => {
  const { message } = req.body;

  try {
    // Process the message with the agent
    const response = await agent.process(message);
    res.json({ response });
  } catch (error) {
    console.error('Error handling message:', error);
    res.status(500).json({ error: 'An error occurred while processing your request.' });
  }
});

module.exports = router;
