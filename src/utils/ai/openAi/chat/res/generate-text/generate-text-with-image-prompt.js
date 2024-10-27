import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import fs from "fs";

const result = await generateText({
  model: openai("gpt-4-turbo"),
  maxTokens: 512,
  messages: [
    {
      role: "user",
      content: [
        {
          type: "text",
          text: "what are the red things in this image?"
        },
        {
          type: "image",
          image: new URL(
            "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/2024_Solar_Eclipse_Prominences.jpg/720px-2024_Solar_Eclipse_Prominences.jpg"
          )
        }
      ]
    }
  ]
});

console.log(result);

const resultWFileBuffer = await generateText({
  model: openai("gpt-4-turbo"),
  maxTokens: 512,
  messages: [
    {
      role: "user",
      content: [
        {
          type: "text",
          text: "what are the red things in this image?"
        },
        {
          type: "image",
          image: fs.readFileSync("./node/attachments/eclipse.jpg")
        }
      ]
    }
  ]
});

console.log(resultWFileBuffer);
