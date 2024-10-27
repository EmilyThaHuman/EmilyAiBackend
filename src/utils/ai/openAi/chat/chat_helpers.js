const {
  getMainSystemMessageContent,
  getMainAssistantMessageInstructions
} = require("@lib/prompts");
const { addSystemMessageToSession, addAssistantInstructionsToSession } = require("./chat_history");
const { ChatSession } = require("@models/chat");
const { default: mongoose } = require("mongoose");
const { logger } = require("@config/logging");

/**
 * Creates a new chat session and initializes system/assistant messages.
 * Utilizes the refactored ChatSession.createSession method.
 *
 * @param {Object} defaultData - The default data containing user and workspace IDs.
 * @param {Object} res - The Express response object.
 */
const createNewSession = async (defaultData) => {
  const { userId, workspaceId, sessionId, regenerate, prompt, clientApiKey } = defaultData;

  if (!userId || !workspaceId) {
    throw new Error("Missing required parameters: userId and workspaceId.");
  }

  try {
    const newChat = await ChatSession.createSession({
      userId,
      workspaceId,
      sessionId: sessionId || mongoose.Types.ObjectId(),
      regenerate,
      prompt,
      clientApiKey,
      title: prompt,
      name: prompt,
      status: "active",
      path: `/chat/${sessionId || newChat._id}`
    });

    // Add system and assistant messages using helper methods
    const systemPrompt = getMainSystemMessageContent();
    const assistantInstructions = getMainAssistantMessageInstructions();

    await addSystemMessageToSession(newChat, systemPrompt);
    await addAssistantInstructionsToSession(newChat, assistantInstructions);

    return newChat;
  } catch (error) {
    logger.error("Error creating chat session:", error);
    throw new Error("Failed to create chat session.");
  }
};

module.exports = { createNewSession };
