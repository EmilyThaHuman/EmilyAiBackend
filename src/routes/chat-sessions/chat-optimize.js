const express = require("express");
const { asyncHandler } = require("@middlewares/asyncHandler");
const { logger } = require("@config/logging");
const { ChatOpenAI } = require("@langchain/openai");
const { ChatMessage, ChatSession } = require("@models/chat");
const { generateObjectId, getEnv } = require("@utils/processing/api");

const router = express.Router();

const openai = new ChatOpenAI({
  apiKey: getEnv("OPENAI_API_PROJECT_KEY")
});

const logAndRespondError = (res, error, message) => {
  const errorMsg = error?.response?.data || error?.message || "Unknown error";
  logger.error(`${message}: ${errorMsg}`);
  res.status(500).json({ message, error: errorMsg });
};

// --- Generate chat title endpoint ---
router.post(
  "/generate-title",
  asyncHandler(async (req, res) => {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ message: "First prompt is required." });
    }

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "user", content: prompt },
          {
            role: "system",
            content: `Generate a concise and descriptive title for this chat session based on the user's first prompt. The title should be no more than five words and encapsulate the main topic or purpose of the conversation.`
          }
        ],
        max_tokens: 10,
        temperature: 0.7
      });

      const title = response?.choices?.[0]?.message?.content?.trim() || "Untitled Session";
      res.json({ title });
    } catch (error) {
      logAndRespondError(res, error, "Failed to generate chat title.");
    }
  })
);

// --- Create chat session endpoint ---
router.post(
  "/create-session",
  asyncHandler(async (req, res) => {
    const { title, firstPrompt, sessionId, workspaceId, regenerate, prompt, userId, clientApiKey } =
      req.body;

    if (!title || !firstPrompt) {
      return res.status(400).json({ message: "Title and first prompt are required." });
    }

    try {
      const message = await ChatMessage.create({
        content: firstPrompt,
        type: "user"
      });

      const newChat = await ChatSession.create({
        sessionId: sessionId || generateObjectId(),
        workspaceId,
        regenerate,
        prompt,
        clientApiKey,
        title,
        userId,
        messages: [message._id],
        path: `/chat/${sessionId}`
      });

      await newChat.populate("messages");
      res.status(201).json({ chatSession: newChat });
    } catch (error) {
      logAndRespondError(res, error, "Failed to create chat session.");
    }
  })
);

module.exports = router;
