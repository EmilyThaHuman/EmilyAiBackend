const express = require("express");
const { asyncHandler } = require("@utils/api/sync.js");
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
const { generateObjectId } = require("@utils/auth");
const { getEnv } = require("@utils/api");
const { logger } = require("@config/logging");
const { default: OpenAI } = require("openai");

const router = express.Router();

// --- Chat completion endpoints ---
router.post("/stream", asyncHandler(combinedChatStream));
const openai = new ChatOpenAI({
  apiKey: getEnv("OPENAI_API_PROJECT_KEY")
  // model: "gpt-3.5-turbo"
});

/**
 * Generates a chat title based on the first prompt.
 */
router.post(
  "/generate-title",
  asyncHandler(async (req, res) => {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ message: "First prompt is required." });
    }

    const titleGpt = new OpenAI({
      apiKey: getEnv("OPENAI_API_PROJECT_KEY")
      // model: "gpt-3.5-turbo"
    });
    // const llm = new ChatOpenAI({
    //   apiKey: getEnv("OPENAI_API_PROJECT_KEY"),
    //   model: "gpt-4o",
    //   temperature: 0,
    //   maxTokens: undefined,
    //   timeout: undefined,
    //   maxRetries: 2
    // });
    try {
      const response = await titleGpt.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "user", content: prompt },
          {
            role: "system",
            content: `Generate a concise and descriptive title for this chat session based on the user's first prompt. The title should be no more than five words and encapsulate the main topic or purpose of the conversation.

            Examples:
            - 'I need help planning my vacation to Italy.' becomes Vacation Planning GPT ✈️
            - 'Can you assist me in understanding quantum physics?' becomes Quantum Physics GPT 🔬
          `
          }
        ],
        max_tokens: 10,
        temperature: 0.7
      });

      const title = response.data.choices[0].message.content.trim();
      res.json({ title });
    } catch (error) {
      logger.error("Error generating chat title:", error.response?.data || error.message);
      res.status(500).json({ message: "Failed to generate chat title." });
    }
  })
);

/**
 * POST /api/generate-component
 *
 * Request Body:
 * {
 *   "containerPath": "AnalyticsDashboard",
 *   "componentName": "Button",
 *   "dependencies": ["Icon"],
 *   "userStory": "As a user, I want a button to submit the form."
 * }
 *
 * Response: { "componentCode": \`\`\`jsx
 * \// Button.jsx
 * import React from 'react';
 * import Icon from './Icon';
 * import styles from './Button.module.css';
 *
 * const Button = ({ label, icon, onClick }) => {
 *   return (
 *     <button className={styles.button} onClick={onClick}>
 *       {icon && <Icon name={icon} />}
 *       {label}
 *     </button>
 *   );
 * };
 *
 * export default Button;
 * \`\`\` }
 **/

router.post("/generate-component", async (req, res) => {
  const { containerPath, componentName, dependencies, userStory } = req.body;

  if (!containerPath || !componentName || !userStory) {
    return res
      .status(400)
      .json({ error: "containerPath, componentName, and userStory are required." });
  }

  try {
    const dirPath = path.join(process.env.LOCAL_COMPONENTS_DIR, containerPath);

    // Read existing configurations and compositions
    const composition = await readComponentsComposition(dirPath);
    const configurations = await readComponentsConfigurations(dirPath);

    // Find the component configuration
    const componentConfig = configurations.find((config) => config.name === componentName);

    if (!componentConfig) {
      return res
        .status(404)
        .json({ error: `Component configuration for ${componentName} not found.` });
    }

    // Generate prompt
    const prompt = generateComponentPrompt({
      description: userStory,
      componentName,
      dependencies: componentConfig.uiComponents,
      implementations: componentConfig.implementations || [],
      componentConfiguration: componentConfig
    });

    // Generate component code using OpenAI
    const [componentCode] = await componentGenerator.generateComponent({ description: prompt });

    if (!componentCode) {
      return res.status(500).json({ error: "Failed to generate component code." });
    }

    // Save the generated component code to index.js (or index.jsx)
    await saveFile(dirPath, "index.js", componentCode);

    res.status(200).json({ componentCode });
  } catch (error) {
    console.error("Error generating component:", error);
    res.status(500).json({ error: "Internal Server Error." });
  }
});

/**
 * Creates a new chat session.
 */
router.post(
  "/create-session",
  asyncHandler(async (req, res) => {
    const { title, firstPrompt, sessionId, workspaceId, regenerate, prompt, userId, clientApiKey } =
      req.body;

    if (!title || !firstPrompt) {
      return res.status(400).json({ message: "Title and first prompt are required." });
    }

    try {
      // Create a new message
      const message = await ChatMessage.create({
        content: firstPrompt,
        type: "user"
      });

      // Create a new chat session
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

      // Populate messages for response
      await newChat.populate("messages");

      res.status(201).json({ chatSession: newChat });
    } catch (error) {
      logger.error("Error creating chat session:", error.message);
      res.status(500).json({ message: "Failed to create chat session." });
    }
  })
);

// --- Chat session endpoints ---
router.get("/", asyncHandler(getAllSessions));
router.get("/:sessionId", asyncHandler(getSessionById));
router.get("/:sessionId/messages", asyncHandler(getMessagesFromChat));
router.post("/create", asyncHandler(createSession));
router.post("/:sessionId/messages/save", asyncHandler(saveMessagesToChat));
router.put("/:sessionId", asyncHandler(updateSession));
router.put("/:sessionId/messages", asyncHandler(saveMessagesToChat));
router.delete("/:sessionId", asyncHandler(deleteSession));

module.exports = router;
