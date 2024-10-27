// testRouter.js

const { createOpenAI } = require("@ai-sdk/openai");
const { generateText } = require("ai");

const getEnv = (key) => {
  return process.env[key];
};
const openai = createOpenAI({
  baseURL: "https://api.openai.com/v1",
  apiKey: getEnv("OPENAI_API_PROJECT_KEY"),
  organization: getEnv("OPENAI_API_ORG_NAME"),
  project: getEnv("OPENAI_API_PROJECT_NAME"),
  compatibility: "strict"
  // headers: {
  //   "X-Custom-Header": "custom-header-value"
  // },
  // name: "openai-node-client"
});
async function testTextGeneration() {
  
  const prompt = "Hello, how are you?";
  try {
    console.log("Prompt:", prompt);
    const { text } = await generateText({
      model: openai("gpt-4-turbo"),
      prompt: prompt
    });
    console.log("Generated Text:", text);
  } catch (error) {
    console.error("Error generating text:", error);
  }
}
testTextGeneration();
// async function testRouter() {
//   try {
//     const port = "3001"; // Replace with your actual port number
//     // Send a POST request to the route
//     const response = await axios.post(`http://localhost:${port}/api/chat/hosted/generate-text`, {
//       prompt: "Hello, how are you?",
//       max_tokens: 50,
//       temperature: 0.7,
//       top_p: 1,
//       frequency_penalty: 0,
//       presence_penalty: 0
//     });
//     console.log("Response Data:", response.data);
//   } catch (error) {
//     console.error("Error occurred:", error.response ? error.response.data : error.message);
//   } finally {
//     // Close the server after the test
//     console.log("Closing server...");
//   }
// }
// // Run the test function
// testRouter();
