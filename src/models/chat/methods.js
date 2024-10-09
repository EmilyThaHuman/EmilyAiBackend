const createChatSession = async (userId, workspaceId, sessionName = 'New Chat Session') => {
  try {
    const sessionData = {
      userId,
      workspaceId,
      name: sessionName,
      active: true,
    };
    const chatSession = await mongoose.model('ChatSession').createSession(sessionData);
    logger.info(`Chat session created successfully: ${chatSession.name}`);
    return chatSession;
  } catch (error) {
    logger.error(`Error creating chat session: ${error.message}`);
    throw new Error(`Failed to create chat session: ${error.message}`);
  }
};
const addMessageToSession = async (sessionId, userId, content, role = 'user') => {
  try {
    const messageData = {
      sessionId,
      userId,
      content,
      role,
    };
    const message = await mongoose.model('ChatMessage').createMessage(messageData);
    logger.info(`Message added to session ${sessionId}: ${message._id}`);
    return message;
  } catch (error) {
    logger.error(`Error adding message to session: ${error.message}`);
    throw new Error(`Failed to add message to session: ${error.message}`);
  }
};
const getChatSessionMessages = async (sessionId, limit = 50, skip = 0) => {
  try {
    const messages = await mongoose
      .model('ChatMessage')
      .getMessagesBySession(sessionId, limit, skip);
    return messages;
  } catch (error) {
    logger.error(`Error fetching messages for session ${sessionId}: ${error.message}`);
    throw new Error(`Failed to fetch messages for session: ${error.message}`);
  }
};
