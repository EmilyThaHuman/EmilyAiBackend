const { MongoDBAtlasVectorSearch } = require("@langchain/mongodb");
const { MongoClient } = require("mongodb");
const { RetrievalQAChain } = require("langchain/chains");
const { PromptTemplate } = require("@langchain/core/prompts");
const { StringOutputParser } = require("@langchain/core/output_parsers");
const { Document } = require("langchain/document");
const { OpenAIEmbeddings } = require("@langchain/openai");
const { getEnv } = require("@utils/processing/api");

// Initialize OpenAI embeddings
const embedding_model = new OpenAIEmbeddings({
  openAIApiKey: getEnv("OPENAI_API_PROJECT_KEY"),
  modelName: getEnv("PINECONE_EMBEDDING_MODEL_NAME")
});

// Connect to MongoDB
const client = new MongoClient("YOUR_MONGODB_ATLAS_CONNECTION_STRING"); // Add your MongoDB Atlas connection string
await client.connect(); // Ensure the client connects to the database
const database = client.db("YOUR_DATABASE_NAME"); // Add your MongoDB Atlas database name
const collection = database.collection("YOUR_COLLECTION_NAME"); // Add your MongoDB Atlas collection name

// Configure the database
const dbConfig = {
  collection: collection,
  indexName: "vector_index", // Add Vector Index name
  textKey: "text", // You can leave this unchanged
  embeddingKey: "embedding" // You can leave this unchanged
};

// Initialize documents
let docs = []; // Initialize an empty array for the documents
// Assuming 'data' is defined elsewhere in your code
docs.push(new Document({ pageContent: JSON.stringify(data), metadata: [] })); // Add the incoming data to the array

// Initialize vector store
const vectorStore = await MongoDBAtlasVectorSearch.fromDocuments(docs, embedding_model, dbConfig);

// Initialize the Perplexity chat model
const llm = new ChatPerplexity({
  model: "llama-3-sonar-small-32k-online", // Choose your desired model
  temperature: 0.7, // Set the temperature for response variability
  pplxApiKey: "YOUR_PERPLEXITY_API_KEY" // Add your Perplexity API key here
});

// Perform a similarity search
const query = "YOUR_QUERY"; // Define your query
const vectorResult = await vectorStore.similaritySearch(query, 5); // Running similarity search for the query

// Define the prompt template
const prompt = PromptTemplate.fromTemplate(
  "You are an agent that will analyze and give statistical responses for the data CONTEXT: {context} USER QUESTION: {question}"
);

// Create the RAG chain
const ragChain = RetrievalQAChain.fromLLM({
  llm,
  prompt,
  outputParser: new StringOutputParser()
});

// Invoke the chain to return a response
const result = await ragChain.invoke({
  question: query,
  context: vectorResult
});

// Output the result
console.log(result);
