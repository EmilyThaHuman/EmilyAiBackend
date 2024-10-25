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

const router = express.Router();
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
