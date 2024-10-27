// const express = require("express");
// const { asyncHandler } = require("@middlewares/asyncHandler");
// const { logger } = require("@config/logging");
// const { getEnv } = require("@utils/api");
// const { OpenAIAdapter } = require("@copilotkit/runtime");
// const { default: OpenAI } = require("openai");

// const router = express.Router();

// // Initialize OpenAI Adapter
// const openai = new OpenAI({ apiKey: getEnv("OPENAI_API_PROJECT_KEY") });
// const openAIAdapter = new OpenAIAdapter({ openai });

// // API route to handle chat messages

// // Initialize CopilotKit with OpenAI adapter
// // const copilotKit = new CopilotKit({
// //   adapter: openAIAdapter
// // });

// // // Define an agent with a custom prompt
// // const agent = new Agent({
// //   name: "Assistant",
// //   prompt: "You are a helpful assistant that answers questions concisely.",
// //   adapter: openAIAdapter
// // });

// // API route to handle chat messages
// router.post("/message", async (req, res) => {
//   const { message } = req.body;

//   try {
//     const response = await await openai.createCompletion({
//       model: "text-davinci-003",
//       prompt: message,
//       temperature: 0,
//       max_tokens: 100,
//       top_p: 1,
//       frequency_penalty: 0.2,
//       presence_penalty: 0
//     });
//     res.json({ response });
//   } catch (error) {
//     logger.error("Error handling message:", error);
//     res.status(500).json({ error: "An error occurred while processing your request." });
//   }
// });

// module.exports = router;
