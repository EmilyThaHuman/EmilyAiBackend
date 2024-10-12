/* eslint-disable no-unused-vars */
const { ChatSession } = require("@models/chat");
const { logger } = require("@config/logging");
const { addMessageToSession } = require("@utils/ai/openAi/chat/chat_history");
const { logChatData } = require("@utils/ai/openAi/chat/chat_helpers");

const handleDatabaseOperation = async (
  operation,
  res,
  successStatus = 200,
  successMessage = null
) => {
  try {
    const result = await operation();
    if (!result && successStatus !== 201) {
      return res.status(404).json({ message: "Resource not found" });
    }
    res.status(successStatus).json(successMessage || result);
  } catch (error) {
    res.status(500).json({ message: "Database operation failed", error: error.message });
  }
};

const getAllSessions = (req, res) => handleDatabaseOperation(() => ChatSession.find(), res);

const getSessionById = (req, res) => {
  handleDatabaseOperation(
    () =>
      ChatSession.findById(req.params.sessionId).populate("messages").populate("files").populate("tools"),
    res
  );
};

const createSession = async (req, res) => {
  try {
    const { name, topic, prompt, userId, workspaceId, model, settings, apiKey } = req.body;

    // Validate required fields
    if (!userId || !workspaceId) {
      return res.status(400).json({
        success: false,
        message: "userId and workspaceId are required"
      });
    }

    // Prepare the session data
    const sessionData = {
      userId,
      workspaceId,
      topic: topic || "No Topic",
      name: name || "Default Chat Session",
      settings: settings || {}
    };

    // Use the static method to create a new session
    const newSession = await ChatSession.createSession(sessionData);

    // Initialize the session with a system message if needed
    if (newSession.messages.length === 0) {
      await newSession.addMessage({
        role: "system",
        content: "Welcome to the new chat session!"
      });
    }

    res.status(201).json({
      success: true,
      message: "Chat session created successfully",
      session: newSession
    });
  } catch (error) {
    logger.error("Error creating chat session:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create chat session",
      error: error.message
    });
  }
};

const updateSession = (req, res) =>
  handleDatabaseOperation(
    () => ChatSession.findByIdAndUpdate(req.params.id, req.body, { new: true }),
    res
  );

const deleteSession = (req, res) =>
  handleDatabaseOperation(() => ChatSession.findByIdAndDelete(req.params.id), res, 200, {
    message: "Session deleted successfully"
  });
const saveMessagesToChat = async (req, res) => {
  try {
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Messages must be an array" });
    }

    const chatSession = await ChatSession.findById(req.params.id);
    if (!chatSession) {
      return res.status(404).json({ error: "Chat session not found" });
    }

    const addedMessages = [];

    await Promise.all(
      messages.map(async (message) => {
        // Check if the message already exists in the chatSession
        const messageExists = chatSession.messages.some(
          (existingMessage) =>
            existingMessage.content === message.content && existingMessage.role === message.role
        );

        if (!messageExists) {
          const messageDoc = await addMessageToSession(chatSession, {
            userId: message.userId || req.body.userId,
            workspaceId: message.workspaceId || req.body.workspaceId,
            sessionId: chatSession._id,
            role: message.role || "user",
            content: message.content || req.body.prompt,
            metadata: {
              createdAt: Date.now(),
              updatedAt: Date.now(),
              sessionId: chatSession._id
            }
          });
          logChatData("messageDoc", messageDoc);
          addedMessages.push(messageDoc);
        }
      })
    );

    res.status(200).json({
      message: "Messages processed successfully",
      addedMessages,
      skippedMessages: messages.length - addedMessages.length
    });
  } catch (error) {
    logger.error("Error saving messages:", error.message);
    res.status(500).json({ error: error.message });
  }
};
const getMessagesFromChat = async (req, res) => {
  try {
    logger.info(`Get messages for session: ${req.params.sessionId}`);
    const session = await ChatSession.findById(req.params.sessionId).populate("messages");
    // logger.info(`Session: ${session}`);
    logger.info(`Session MESSAGES: ${JSON.stringify(session.messages)}`);
    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }
    res.status(200).json({
      message: "Messages retrieved successfully",
      messages: session.messages
    });
  } catch (error) {
    logger.error("Error retrieving messages:", error.message);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getAllSessions,
  getSessionById,
  createSession,
  updateSession,
  deleteSession,
  saveMessagesToChat,
  getMessagesFromChat
  // chatStream,
};
