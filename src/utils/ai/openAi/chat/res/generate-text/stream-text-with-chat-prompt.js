const { streamText } = require("ai");
const { openai } = require("@ai-sdk/openai");

const result = await streamText({
  model: openai("gpt-3.5-turbo"),
  maxTokens: 1024,
  system: "You are a helpful chatbot.",
  messages: [
    {
      role: "user",
      content: "Hello!"
    },
    {
      role: "assistant",
      content: "Hello! How can I help you today?"
    },
    {
      role: "user",
      content: "I need help with my computer."
    }
  ]
});

for await (const textPart of result.textStream) {
  console.log(textPart);
}
