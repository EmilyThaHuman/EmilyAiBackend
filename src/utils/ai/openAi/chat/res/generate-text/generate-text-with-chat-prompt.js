const { generateText } = require("ai");

const result = await generateText({
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

console.log(result.text);
