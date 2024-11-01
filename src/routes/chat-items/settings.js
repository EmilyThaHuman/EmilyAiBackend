// const express = require("express");
// const path = require("path");
// const fs = require("node:fs").promises;
// const { logger } = require("@config/logging");
// const { asyncHandler } = require("@middlewares/asyncHandler");
// const {
//   ChatPresetController,
//   ChatToolController,
//   ChatModelController,
//   ChatPromptController,
//   ChatCollectionController
// } = require("@controllers/chat-items");

// const router = express.Router();

// /* -- MAIN ROUTES -- */
// router.get("/presets", asyncHandler(ChatPresetController.getAll));
// router.get("/tools", async (req, res) => {
//   try {
//     const { name } = req.query;
//     logger.info("Fetching tool files with name:", name);
//     if (name === "tool_files") {
//       // Path to your prompt_files.json
//       const filePath = path.join(
//         __dirname,
//         "..",
//         "..",
//         "..",
//         "public",
//         "static",
//         "tool_files.json"
//       );

//       // Read the file
//       const fileContent = await fs.readFile(filePath, "utf8");

//       // Parse the JSON content
//       const toolFiles = JSON.parse(fileContent);

//       // Send the response
//       res.json(toolFiles);
//     } else {
//       // Handle requests for other prompts or when no name is specified
//       res.status(400).json({ error: "Invalid or missing name parameter" });
//     }
//   } catch (error) {
//     console.error("Error fetching tool files:", error);
//     res.status(500).json({ error: "Internal server error" });
//   }
// });
// router.get("/models", asyncHandler(ChatModelController.getAll));
// router.get("/prompts", async (req, res) => {
//   try {
//     const { name } = req.query;
//     logger.info("Fetching prompt files with name:", name);
//     if (name === "prompt_files") {
//       // Path to your prompt_files.json
//       const filePath = path.join(
//         __dirname,
//         "..",
//         "..",
//         "..",
//         "public",
//         "static",
//         "prompt_files.json"
//       );

//       // Read the file
//       const fileContent = await fs.readFile(filePath, "utf8");

//       // Parse the JSON content
//       const promptFiles = JSON.parse(fileContent);

//       // Send the response
//       res.json(promptFiles);
//     } else {
//       // Handle requests for other prompts or when no name is specified
//       res.status(400).json({ error: "Invalid or missing name parameter" });
//     }
//   } catch (error) {
//     console.error("Error fetching prompt files:", error);
//     res.status(500).json({ error: "Internal server error" });
//   }
// });
// router.get("/collections", asyncHandler(ChatCollectionController.getAll));
// /* -- MAIN ROUTES -- */

// router.get("/presets/:id", asyncHandler(ChatPresetController.getById));
// router.post("/presets", asyncHandler(ChatPresetController.create));
// router.put("/presets/:id", asyncHandler(ChatPresetController.update));
// router.delete("/presets/:id", asyncHandler(ChatPresetController.delete));

// // Chat Tool routes
// router.post("/tools", asyncHandler(ChatToolController.create));
// router.put("/tools/:id", asyncHandler(ChatToolController.update));
// router.delete("/tools/:id", asyncHandler(ChatToolController.delete));

// // Chat Model routes
// router.get("/models/:id", asyncHandler(ChatModelController.getById));
// router.post("/models", asyncHandler(ChatModelController.create));
// router.put("/models/:id", asyncHandler(ChatModelController.update));
// router.delete("/models/:id", asyncHandler(ChatModelController.delete));

// // Chat Prompt routes
// router.post("/prompts", asyncHandler(ChatPromptController.create));
// router.put("/prompts/:id", asyncHandler(ChatPromptController.update));
// router.delete("/prompts/:id", asyncHandler(ChatPromptController.delete));

// // Chat Collection routes
// router.get("/collections/:id", asyncHandler(ChatCollectionController.getById));
// router.post("/collections", asyncHandler(ChatCollectionController.create));
// router.put("/collections/:id", asyncHandler(ChatCollectionController.update));
// router.delete("/collections/:id", asyncHandler(ChatCollectionController.delete));

// module.exports = router;
