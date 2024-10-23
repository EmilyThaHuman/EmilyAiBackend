import { streamText } from "ai";
import { openai } from "@ai-sdk/openai";

const result = await streamText({
  model: openai("gpt-3.5-turbo"),
  maxTokens: 512,
  temperature: 0.3,
  maxRetries: 5,
  prompt: "Invent a new holiday and describe its traditions."
});

for await (const textPart of result.textStream) {
  console.log(textPart);
}

const resultWReader = await streamText({
  model: openai("gpt-3.5-turbo"),
  maxTokens: 512,
  temperature: 0.3,
  maxRetries: 5,
  prompt: "Invent a new holiday and describe its traditions."
});

const reader = resultWReader.textStream.getReader();

while (true) {
  const { done, value } = await reader.read();
  if (done) {
    break;
  }
  console.log(value);
}
