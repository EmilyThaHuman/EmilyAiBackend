// routes/collections.js
const express = require("express");
const { asyncHandler } = require("@middlewares/asyncHandler");
const { ChatCollectionController } = require("@controllers/chat-items");

const router = express.Router();

/* Collections Routes */
router.get("/", asyncHandler(ChatCollectionController.getAll));
router.get("/:id", asyncHandler(ChatCollectionController.getById));
router.post("/", asyncHandler(ChatCollectionController.create));
router.put("/:id", asyncHandler(ChatCollectionController.update));
router.delete("/:id", asyncHandler(ChatCollectionController.delete));

module.exports = router;
