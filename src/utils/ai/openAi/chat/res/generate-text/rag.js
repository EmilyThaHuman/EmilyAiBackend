const { streamText, cosineSimilarity, embed, embedMany, generateText } = require("ai");
const { openai } = require("@ai-sdk/openai");
const fs = require("fs");
const path = require("path");

const dotenv = require("dotenv");
const { getPineconeClient, getPineconeIndex } = require("@utils/ai/pinecone");

dotenv.config();

async function main() {
  // Initialize Pinecone
  const pinecone = await getPineconeClient();
  const indexName = getEnv("PINECONE_INDEX");
  const index = await getPineconeIndex(indexName);
  const publicDir = path.join(__dirname, "public");
  const scraped_docsDir = path.join(publicDir, "scraped_docs");
  const mui_scraped_docsDir = path.join(scraped_docsDir, "mui");
  const mui_scraped_docs = fs.readdirSync(mui_scraped_docsDir);
  const mui_scraped_docs_paths = mui_scraped_docs.map((doc) => path.join(mui_scraped_docsDir, doc));
  const mui_scraped_docs_texts = mui_scraped_docs.map((doc) =>
    fs.readFileSync(path.join(mui_scraped_docsDir, doc), "utf8")
  );
  const mui_scraped_docs_embeddings = await embedMany(mui_scraped_docs_texts, {
    model: openai.embedding("text-embedding-3-small")
  });
  const mui_scraped_docs_embeddings_ids = mui_scraped_docs.map((doc) => doc.replace(".txt", ""));
  const docsToAnal = mui_scraped_docs_texts.slice(0, 10);
  const docsToAnalyze = docsToAnal.map((doc) => ({
    id: doc.replace(".txt", ""),
    text: doc
  }));
  const singleDocToAnalyze = readFileSync(
    path.join(mui_scraped_docsDir, "mui-docs-v5.txt"),
    "utf8"
  );
  const chunks = singleDocToAnalyze
    .split("\n")
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
