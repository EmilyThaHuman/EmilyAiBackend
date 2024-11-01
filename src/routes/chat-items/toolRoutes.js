// routes/tools.js
const express = require("express");
const path = require("path");
const fs = require("node:fs").promises;
const { logger } = require("@config/logging");
const { asyncHandler } = require("@middlewares/asyncHandler");
const { ChatToolController } = require("@controllers/chat-items");

const router = express.Router();

/* Main Tools Routes */
router.get("/", async (req, res) => {
  try {
    const { name } = req.query;
    logger.info("Fetching tool files with name:", name);
    if (name === "tool_files") {
      const filePath = path.join(__dirname, "..", "public", "static", "tool_files.json");

      const fileContent = await fs.readFile(filePath, "utf8");
      const toolFiles = JSON.parse(fileContent);
      res.json(toolFiles);
    } else {
      res.status(400).json({ error: "Invalid or missing name parameter" });
    }
  } catch (error) {
    console.error("Error fetching tool files:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* Chat Tool CRUD Routes */
router.post("/", asyncHandler(ChatToolController.create));
router.put("/:id", asyncHandler(ChatToolController.update));
router.delete("/:id", asyncHandler(ChatToolController.delete));

module.exports = router;
