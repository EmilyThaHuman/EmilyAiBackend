const express = require('express');
const { asyncHandler } = require('@/utils/api/sync.js');
const {
  getAllSessions,
  getSessionById,
  createSession,
  updateSession,
  deleteSession,
  saveMessagesToChat,
} = require('../../controllers/chat-sessions/chat');
const { combinedChatStream } = require('@/utils/ai/openAi/chat/combinedStream');
const { logger } = require('@/config/logging');
const { ChatSession } = require('@/models');
const router = express.Router();

// --- Chat stream endpoints ---
router.post('/stream', asyncHandler(combinedChatStream));

// --- Chat session endpoints ---
router.get('/', asyncHandler(getAllSessions));
router.get('/:sessionId', asyncHandler(getSessionById));
router.post('/create', asyncHandler(createSession));
router.put('/:sessionId', asyncHandler(updateSession));
router.put('/:sessionId/messages', asyncHandler(saveMessagesToChat));
router.get(
  '/:sessionId/messages',
  asyncHandler(async (req, res) => {
    logger.info(`Get messages for session: ${req.params.sessionId}`);
    const session = await ChatSession.findById(req.params.sessionId).populate('messages');
    // logger.info(`Session: ${session}`);
    logger.info(`Session MESSAGES: ${JSON.stringify(session.messages)}`);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    res.status(200).json({
      message: 'Messages retrieved successfully',
      messages: session.messages,
    });
  })
);
router.delete('/:sessionId', asyncHandler(deleteSession));
router.post(
  '/session',
  asyncHandler(async (req, res) => {
    const { sessionId } = req.body;
    if (!sessionId) {
      return res.status(400).json({ message: 'sessionId is required' });
    }
    const session = await ChatSession.findById(sessionId).populate('messages');
    if (session) {
      res.status(200).json(session);
    } else {
      res.status(404).json({ message: 'Session not found' });
    }
  })
);
router.post('/:sessionId/messages/save', asyncHandler(saveMessagesToChat));

module.exports = router;
