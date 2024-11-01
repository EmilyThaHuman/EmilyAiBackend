const { generateText } = require("ai");
const { openai } = require("@ai-sdk/openai");
const fs = require("fs");

const result = await generateText({
  model: openai("gpt-3.5-turbo"),
  prompt: "Why is the sky blue?"
});

console.log(result);
