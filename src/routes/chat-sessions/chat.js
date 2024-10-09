const express = require('express');
const { asyncHandler } = require('@/utils/api/sync.js');
const {
  getAllSessions,
  getSessionById,
  createSession,
  updateSession,
  deleteSession,
  saveMessagesToChat,
  getMessagesFromChat,
} = require('../../controllers/chat-sessions/chat');
const { combinedChatStream } = require('@/utils/ai/openAi/chat/combinedStream');

const router = express.Router();

// --- Chat completion endpoints ---
router.post('/stream', asyncHandler(combinedChatStream));

// --- Chat session endpoints ---
router.get('/', asyncHandler(getAllSessions));
router.get('/:sessionId', asyncHandler(getSessionById));
router.get('/:sessionId/messages', asyncHandler(getMessagesFromChat));
router.post('/create', asyncHandler(createSession));
router.post('/:sessionId/messages/save', asyncHandler(saveMessagesToChat));
router.put('/:sessionId', asyncHandler(updateSession));
router.put('/:sessionId/messages', asyncHandler(saveMessagesToChat));
router.delete('/:sessionId', asyncHandler(deleteSession));

module.exports = router;
