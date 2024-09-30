const { ChatMessage } = require('@/models');
const mongoose = require('mongoose');
const ChatSession = mongoose.model('ChatSession');
const Message = mongoose.model('Message');

// ===================================
// ChatSession History Management
// ===================================

async function getSessionHistory(sessionId, limit = 50, skip = 0) {
  const session = await ChatSession.findById(sessionId).populate({
    path: 'messages',
    options: { sort: { createdAt: -1 }, limit: limit, skip: skip },
    populate: { path: 'files' },
  });

  if (!session) throw new Error('Session not found');
  return session.messages;
}

async function addMessageToSession(chatSession, messageData) {
  if (!chatSession) throw new Error('Session not found');

  const message = new ChatMessage({
    ...messageData,
    userId: messageData.userId,
    workspaceId: messageData.workspaceId,
    sessionId: chatSession._id,
    role: messageData.role,
    content: messageData.content,
    type: messageData.role === 'user' ? 'human' : 'ai',
    data: { content: messageData.content, additional_kwargs: messageData.metadata },
    sequenceNumber: chatSession.stats.messageCount + 1,
    metadata: {
      ...messageData.metadata,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      sessionId: chatSession._id,
    },
  });
  await message.save();

  chatSession.messages.push(message._id);
  chatSession.stats.messageCount += 1;
  await chatSession.save();

  return message;
}

async function updateSessionSummary(sessionId) {
  const session = await ChatSession.findById(sessionId);
  if (!session) throw new Error('Session not found');

  const recentMessages = await getSessionHistory(sessionId, 5);
  session.summary = `Session with ${session.stats.messageCount} messages. Recent topics: ${recentMessages.map((m) => m.content.substring(0, 20)).join(', ')}`;
  await session.save();

  return session.summary;
}

async function calculateSessionTokenUsage(sessionId) {
  const session = await ChatSession.findById(sessionId);
  if (!session) throw new Error('Session not found');

  const messages = await Message.find({ sessionId: sessionId });
  session.stats.tokenUsage = messages.reduce((sum, message) => sum + (message.tokens || 0), 0);
  await session.save();

  return session.stats.tokenUsage;
}

// ===================================
// Message Management
// ===================================

async function getMessageById(messageId) {
  const message = await Message.findById(messageId).populate('files');
  if (!message) throw new Error('Message not found');
  return message;
}

async function updateMessageContent(messageId, newContent) {
  const message = await Message.findById(messageId);
  if (!message) throw new Error('Message not found');

  message.content = newContent;
  message.updatedAt = Date.now();
  await message.save();

  return message;
}

async function generateMessageSummary(messageId) {
  const message = await Message.findById(messageId);
  if (!message) throw new Error('Message not found');

  // This is a placeholder. In a real-world scenario, you might use an AI service for summarization.
  message.summary = message.content.substring(0, 100) + '...';
  await message.save();

  return message.summary;
}

async function calculateMessageTokens(messageId) {
  const message = await Message.findById(messageId);
  if (!message) throw new Error('Message not found');

  // This is a simplified token calculation. In practice, you'd use a more sophisticated method.
  message.tokens = message.content.split(' ').length;
  await message.save();

  return message.tokens;
}

// ===================================
// Utility Functions
// ===================================

async function searchSessionMessages(sessionId, query, limit = 10) {
  const messages = await Message.find({
    sessionId: sessionId,
    $text: { $search: query },
  })
    .sort({ score: { $meta: 'textScore' } })
    .limit(limit);

  return messages;
}

async function getSessionStats(sessionId) {
  const session = await ChatSession.findById(sessionId);
  if (!session) throw new Error('Session not found');

  await calculateSessionTokenUsage(sessionId);

  return {
    messageCount: session.stats.messageCount,
    tokenUsage: session.stats.tokenUsage,
    lastUpdated: session.updatedAt,
  };
}

// ===================================
// Export Functions
// ===================================

module.exports = {
  getSessionHistory,
  addMessageToSession,
  updateSessionSummary,
  calculateSessionTokenUsage,
  getMessageById,
  updateMessageContent,
  generateMessageSummary,
  calculateMessageTokens,
  searchSessionMessages,
  getSessionStats,
};
