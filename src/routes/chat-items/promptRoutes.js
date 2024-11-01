// routes/prompts.js
const express = require("express");
const path = require("path");
const fs = require("node:fs").promises;
const { logger } = require("@config/logging");
const { asyncHandler } = require("@middlewares/asyncHandler");
const { ChatPromptController } = require("@controllers/chat-items");

const router = express.Router();

/* Main Prompts Routes */
router.get("/", async (req, res) => {
  try {
    const { name } = req.query;
    logger.info("Fetching prompt files with name:", name);
    if (name === "prompt_files") {
      const filePath = path.join(__dirname, "..", "public", "static", "prompt_files.json");

      const fileContent = await fs.readFile(filePath, "utf8");
      const promptFiles = JSON.parse(fileContent);
      res.json(promptFiles);
    } else {
      res.status(400).json({ error: "Invalid or missing name parameter" });
    }
  } catch (error) {
    console.error("Error fetching prompt files:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* Chat Prompt CRUD Routes */
router.post("/", asyncHandler(ChatPromptController.create));
router.put("/:id", asyncHandler(ChatPromptController.update));
router.delete("/:id", asyncHandler(ChatPromptController.delete));

module.exports = router;
