import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { openai } from "@ai-sdk/openai";
import { cosineSimilarity, embed, embedMany, generateText } from "ai";
import { PineconeClient } from "@pinecone-database/pinecone";

dotenv.config();

async function main() {
  // Initialize Pinecone
  const pinecone = new PineconeClient();
  await pinecone.init({
    apiKey: process.env.PINECONE_API_KEY,
    environment: process.env.PINECONE_ENVIRONMENT
  });

  const index = pinecone.Index("your-index-name"); // Replace with your Pinecone index name

  const essay = fs.readFileSync(path.join(__dirname, "essay.txt"), "utf8");
  const chunks = essay
    .split(".")
    .map((chunk) => chunk.trim())
    .filter((chunk) => chunk.length > 0 && chunk !== "\n");

  const { embeddings } = await embedMany({
    model: openai.embedding("text-embedding-3-small"),
    values: chunks
  });

  // Store the embeddings in Pinecone
  const vectors = embeddings.map((embedding, i) => ({
    id: `chunk-${i}`,
    values: embedding,
    metadata: { text: chunks[i] }
  }));
  await index.upsert({
    vectors: vectors
  });

  const input = "What were the two main things the author worked on before college?";

  const { embedding: queryEmbedding } = await embed({
    model: openai.embedding("text-embedding-3-small"),
    value: input
  });

  // Query Pinecone for the most similar embeddings
  const queryResponse = await index.query({
    vector: queryEmbedding,
    topK: 3, // Adjust this value as needed
    includeMetadata: true
  });

  const context = queryResponse.matches.map((match) => match.metadata.text).join("\n");

  const { text } = await generateText({
    model: openai("gpt-4o"),
    prompt: `Answer the following question based only on the provided context:
             ${context}

             Question: ${input}`
  });
  console.log(text);
}

main().catch(console.error);
