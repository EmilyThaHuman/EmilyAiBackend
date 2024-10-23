const express = require("express");
const { asyncHandler } = require("@middlewares/asyncHandler");
const {
  getAllSessions,
  getSessionById,
  createSession,
  updateSession,
  deleteSession,
  saveMessagesToChat,
  getMessagesFromChat
} = require("../../controllers/chat-sessions/chat");
const { combinedChatStream } = require("@utils/ai/openAi/chat/combinedStream");
const { ChatOpenAI } = require("@langchain/openai");
const { ChatMessage, ChatSession } = require("@models/chat");
const { generateObjectId, getEnv } = require("@utils/api");
const newrelic = require("newrelic");
const { streamHeaders } = require("@middlewares/setupHeaders");
const { logger } = require("@config/logging");

const router = express.Router();

const openai = new ChatOpenAI({
  apiKey: getEnv("OPENAI_API_PROJECT_KEY")
});

const logAndRespondError = (res, error, message) => {
  // Using optional chaining and fallback values to avoid undefined error properties
  const errorMsg = error?.response?.data || error?.message || "Unknown error";
  logger.error(`${message}: ${errorMsg}`);
  res.status(500).json({ message, error: errorMsg });
};

// --- Chat completion stream endpoint ---
router.post(
  "/chat-completion-stream",
  asyncHandler(async (req, res) => {
    const { message = "Say this is a test", model = "gpt-4" } = req.body || {};

    try {
      const stream = await openai.chat.completions.create({
        stream: true,
        temperature: 0.5,
        messages: [{ role: "user", content: message }],
        model
      });

      res.setHeader("Content-Type", "text/plain");

      for await (const chunk of stream) {
        // Check if chunk and necessary nested properties exist before accessing
        const content = chunk?.choices?.[0]?.delta?.content;

        if (content) {
          res.write(content);
        }
      }

      const { traceId } = newrelic.getTraceMetadata();
      res.write("\n-------- END OF MESSAGE ---------\n");
      res.write(`Use this id to record feedback '${stream.id}'\n`);
      res.end();
    } catch (error) {
      logAndRespondError(res, error, "Error processing chat completion stream.");
    }
  })
);

// --- Feedback route ---
router.post("/feedback", (req, res) => {
  const {
    category = "feedback-test",
    rating = 1,
    message = "Good talk",
    metadata,
    id
  } = req.body || {};
  const { traceId } = responses.get(id);

  if (!traceId) {
    return res.status(404).send(`No trace id found for ${message}`);
  }

  newrelic.recordLlmFeedbackEvent({
    traceId,
    category,
    rating,
    message,
    metadata
  });

  res.send("Feedback recorded");
});

// --- Stream completion endpoint ---
router.post("/stream", streamHeaders, asyncHandler(combinedChatStream));

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

// --- Chat session and messages endpoints ---
router.get("/", asyncHandler(getAllSessions));
router.get("/:sessionId", asyncHandler(getSessionById));
router.get("/:sessionId/messages", asyncHandler(getMessagesFromChat));
router.post("/create", asyncHandler(createSession));
router.post("/:sessionId/messages/save", asyncHandler(saveMessagesToChat));
router.put("/:sessionId", asyncHandler(updateSession));
router.put("/:sessionId/messages", asyncHandler(saveMessagesToChat));
router.delete("/:sessionId", asyncHandler(deleteSession));

module.exports = router;
