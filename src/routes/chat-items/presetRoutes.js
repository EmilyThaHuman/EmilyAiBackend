// routes/presets.js
const express = require("express");
const { asyncHandler } = require("@middlewares/asyncHandler");
const { ChatPresetController } = require("@controllers/chat-items");

const router = express.Router();

/* Preset Routes */
router.get("/", asyncHandler(ChatPresetController.getAll));
router.get("/:id", asyncHandler(ChatPresetController.getById));
router.post("/", asyncHandler(ChatPresetController.create));
router.put("/:id", asyncHandler(ChatPresetController.update));
router.delete("/:id", asyncHandler(ChatPresetController.delete));

module.exports = router;
