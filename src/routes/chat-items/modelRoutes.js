// routes/models.js
const express = require("express");
const { asyncHandler } = require("@middlewares/asyncHandler");
const { ChatModelController } = require("@controllers/chat-items");

const router = express.Router();

/* Models Routes */
router.get("/", asyncHandler(ChatModelController.getAll));
router.get("/:id", asyncHandler(ChatModelController.getById));
router.post("/", asyncHandler(ChatModelController.create));
router.put("/:id", asyncHandler(ChatModelController.update));
router.delete("/:id", asyncHandler(ChatModelController.delete));

module.exports = router;
