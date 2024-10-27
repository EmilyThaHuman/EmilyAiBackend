const { logger } = require("@config/logging");
const { ChatMessage, ChatSession } = require("@models/chat");

// ===================================
// ChatSession History Management
// ===================================

/**
 * Retrieves the history of messages for a given chat session with pagination.
 * Utilizes the static method defined in ChatMessage model.
 *
 * @param {String} sessionId - The ID of the chat session.
 * @param {Number} limit - The number of messages to retrieve.
 * @param {Number} skip - The number of messages to skip (for pagination).
 * @returns {Array} - An array of chat messages.
 */
async function getSessionHistory(sessionId, limit = 50, skip = 0) {
  const messages = await ChatMessage.getMessagesBySession(sessionId, limit, skip);
  return messages;
}

/**
 * Adds a new message to a chat session.
 * Utilizes the static method defined in ChatMessage model, which handles both message creation
 * and session updates within a transaction.
 *
 * @param {ChatSession} chatSession - The chat session instance.
 * @param {Object} messageData - The data for the new message.
 * @returns {Object} - The newly created chat message.
 */
async function addMessageToSession(chatSession, messageData) {
  if (!chatSession) throw new Error("Chat session not found");

  // Prepare message data
  const preparedMessageData = {
    ...messageData,
    userId: messageData.userId,
    sessionId: chatSession._id,
    role: messageData.role,
    content: messageData.content,
    type: messageData.role === "user" ? "human" : "ai",
    data: {
      content: messageData.content,
      additional_kwargs: messageData.metadata
    },
    sequenceNumber: chatSession.stats.messageCount + 1,
    metadata: {
      ...messageData.metadata,
      sessionId: chatSession._id
    }
  };

  // Utilize ChatMessage.createMessage which handles message creation and session update
  const message = await ChatMessage.createMessage(preparedMessageData);

  return message;
}

/**
 * Adds a user message to a chat session.
 *
 * @param {ChatSession} chatSession - The chat session instance.
 * @param {Object} messageData - The data for the new user message.
 * @returns {Object} - The newly created user chat message.
 */
async function addUserMessageToSession(chatSession, messageData) {
  if (!chatSession) throw new Error("Chat session not found");

  const userMessageData = {
    ...messageData,
    role: "user",
    type: "human",
    content: messageData.content,
    metadata: {
      ...messageData.metadata,
      sessionId: chatSession._id
    }
  };

  return addMessageToSession(chatSession, userMessageData);
}

/**
 * Adds an assistant message to a chat session.
 *
 * @param {ChatSession} chatSession - The chat session instance.
 * @param {Object} messageData - The data for the new assistant message.
 * @returns {Object} - The newly created assistant chat message.
 */
async function addAssistantMessageToSession(chatSession, messageData) {
  if (!chatSession) throw new Error("Chat session not found");

  const assistantMessageData = {
    ...messageData,
    role: "assistant",
    type: "ai",
    content: messageData.content,
    metadata: {
      ...messageData.metadata,
      sessionId: chatSession._id
    }
  };

  return addMessageToSession(chatSession, assistantMessageData);
}
/**
 * Adds a system message to the chat session.
 *
 * @param {ChatSession} chatSession - The chat session instance.
 * @param {String} systemPrompt - The system prompt content.
 */
const addSystemMessageToSession = async (chatSession, systemPrompt) => {
  try {
    await addMessageToSession(chatSession, {
      userId: chatSession.userId,
      workspaceId: chatSession.workspaceId,
      role: "system",
      content: systemPrompt,
      metadata: {
        createdAt: Date.now(),
        updatedAt: Date.now(),
        sessionId: chatSession._id
      }
    });
  } catch (error) {
    logger.error("Error adding system message to session:", error);
    throw error;
  }
};

/**
 * Adds assistant instructions to the chat session.
 *
 * @param {ChatSession} chatSession - The chat session instance.
 * @param {String} assistantInstructions - The assistant instructions content.
 */
const addAssistantInstructionsToSession = async (chatSession, assistantInstructions) => {
  try {
    await addMessageToSession(chatSession, {
      userId: chatSession.userId,
      workspaceId: chatSession.workspaceId,
      role: "assistant",
      content: assistantInstructions,
      metadata: {
        createdAt: Date.now(),
        updatedAt: Date.now(),
        sessionId: chatSession._id
      }
    });
  } catch (error) {
    logger.error("Error adding assistant instructions to session:", error);
    throw error;
  }
};

// ===================================
// Session Summary and Token Usage
// ===================================

/**
 * Updates the summary of a chat session based on recent messages.
 *
 * @param {String} sessionId - The ID of the chat session.
 * @returns {String} - The updated session summary.
 */
async function updateSessionSummary(sessionId) {
  const session = await ChatSession.getSession(sessionId);
  if (!session) throw new Error("Chat session not found");

  // Fetch the most recent 5 messages
  const recentMessages = await ChatMessage.getMessagesBySession(sessionId, 5, 0);

  // Generate summary based on recent messages
  session.summary = `Session with ${session.stats.messageCount} messages. Recent topics: ${recentMessages
    .map((m) => m.content.substring(0, 20))
    .join(", ")}`;
  await session.save();

  return session.summary;
}

/**
 * Calculates the total token usage for a chat session.
 *
 * @param {String} sessionId - The ID of the chat session.
 * @returns {Number} - The total token usage.
 */
async function calculateSessionTokenUsage(sessionId) {
  const session = await ChatSession.getSession(sessionId);
  if (!session) throw new Error("Chat session not found");

  const tokenUsage = await session.calculateTokenUsage();
  return tokenUsage;
}

// ===================================
// Message Management
// ===================================

/**
 * Retrieves a chat message by its ID.
 *
 * @param {String} messageId - The ID of the chat message.
 * @returns {Object} - The chat message.
 */
async function getMessageById(messageId) {
  const message = await ChatMessage.findById(messageId).populate("files");
  if (!message) throw new Error("Chat message not found");
  return message;
}

/**
 * Updates the content of a chat message.
 *
 * @param {String} messageId - The ID of the chat message.
 * @param {String} newContent - The new content for the message.
 * @returns {Object} - The updated chat message.
 */
async function updateMessageContent(messageId, newContent) {
  const message = await ChatMessage.findById(messageId);
  if (!message) throw new Error("Chat message not found");

  message.content = newContent;
  await message.save();

  return message;
}

/**
 * Generates a summary for a chat message.
 * Placeholder implementation; replace with actual summarization logic as needed.
 *
 * @param {String} messageId - The ID of the chat message.
 * @returns {String} - The generated summary.
 */
async function generateMessageSummary(messageId) {
  const message = await ChatMessage.findById(messageId);
  if (!message) throw new Error("Chat message not found");

  // Placeholder summarization logic
  message.summary = message.content.substring(0, 100) + "...";
  await message.save();

  return message.summary;
}

/**
 * Calculates the number of tokens in a chat message.
 * Simplified token calculation; replace with actual tokenization logic as needed.
 *
 * @param {String} messageId - The ID of the chat message.
 * @returns {Number} - The number of tokens.
 */
async function calculateMessageTokens(messageId) {
  const message = await ChatMessage.findById(messageId);
  if (!message) throw new Error("Chat message not found");

  // Simplified token calculation
  message.tokens = message.content.split(/\s+/).length;
  await message.save();

  return message.tokens;
}

// ===================================
// Utility Functions
// ===================================

/**
 * Searches for messages within a chat session based on a query string.
 *
 * @param {String} sessionId - The ID of the chat session.
 * @param {String} query - The search query.
 * @param {Number} limit - The maximum number of messages to return.
 * @returns {Array} - An array of matching chat messages.
 */
async function searchSessionMessages(sessionId, query, limit = 10) {
  // Ensure that a text index exists on the 'content' field in ChatMessage model
  // Example:
  // chatMessageSchema.index({ content: 'text' });

  const messages = await ChatMessage.find({
    sessionId: sessionId,
    $text: { $search: query }
  })
    .sort({ score: { $meta: "textScore" } })
    .limit(limit)
    .populate("files")
    .lean(); // Use lean for better performance if document methods are not needed

  return messages;
}

/**
 * Retrieves statistics for a chat session, including message count and token usage.
 *
 * @param {String} sessionId - The ID of the chat session.
 * @returns {Object} - An object containing session statistics.
 */
async function getSessionStats(sessionId) {
  const session = await ChatSession.getSession(sessionId);
  if (!session) throw new Error("Chat session not found");

  // Recalculate token usage to ensure accuracy
  const tokenUsage = await calculateSessionTokenUsage(sessionId);

  return {
    messageCount: session.stats.messageCount,
    tokenUsage: session.stats.tokenUsage,
    lastUpdated: session.updatedAt
  };
}

// ===================================
// Export Functions
// ===================================

module.exports = {
  getSessionHistory,
  addMessageToSession,
  addUserMessageToSession,
  addAssistantMessageToSession,
  addSystemMessageToSession,
  addAssistantInstructionsToSession,
  updateSessionSummary,
  calculateSessionTokenUsage,
  getMessageById,
  updateMessageContent,
  generateMessageSummary,
  calculateMessageTokens,
  searchSessionMessages,
  getSessionStats
};
