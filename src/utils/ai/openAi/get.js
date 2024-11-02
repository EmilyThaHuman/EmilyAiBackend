// Import SDK dependencies
const { createOpenAI } = require("@ai-sdk/openai");
const { logger } = require("@config/logging");
const { ChatOpenAI, OpenAIEmbeddings } = require("@langchain/openai");

// Helper to get environment variables
const getEnv = (key) => process.env[key];

// Helper to configure OpenAI proxy
const configOpenAIProxy = (config) => {
  const proxyUrlStr = getEnv("OPENAI_PROXY_URL");
  if (proxyUrlStr) {
    const proxyUrl = new URL(proxyUrlStr);
    config.proxy = {
      host: proxyUrl.hostname,
      port: proxyUrl.port
    };
    config.timeout = 120000; // 2 minutes timeout
  }
};

// Generate OpenAI configuration
const genOpenAIConfig = async () => {
  const token = getEnv("OPENAI_API_PROJECT_KEY");
  const baseUrl = getEnv("OPENAI_BASE_URL") || "https://api.openai.com/v1";

  let config = {
    headers: {
      Authorization: `Bearer ${token}`
    },
    baseURL: baseUrl,
    timeout: 120000 // 2 minutes timeout
  };

  configOpenAIProxy(config);

  return config;
};

// Initialize OpenAI Provider Instance with API key
const openaiProvider = createOpenAI({
  apiKey: getEnv("OPENAI_API_PROJECT_KEY"),
  baseURL: getEnv("OPENAI_BASE_URL") || "https://api.openai.com/v1",
  compatibility: "strict",
  organization: getEnv("OPENAI_API_ORG_ID")
});

// Settings configurations for different models
const chatSettings = {
  logitBias: { 50256: -100 }, // Example: prevent <|endoftext|> token
  logprobs: true,
  parallelToolCalls: true,
  user: "user-1234"
};

const completionSettings = {
  echo: true,
  logitBias: { 50256: -100 },
  logprobs: 5, // Get logprobs for top 5 tokens
  suffix: "End of message",
  user: "user-1234"
};

const embeddingSettings = {
  maxEmbeddingsPerCall: 100,
  supportsParallelCalls: true,
  dimensions: 512,
  user: "user-1234"
};

// Initialize Models
const chatModel = openaiProvider.chat("gpt-4-turbo", chatSettings);
const completionModel = openaiProvider.completion("gpt-3.5-turbo-instruct", completionSettings);
const embeddingModel = openaiProvider.embedding("text-embedding-ada-002", embeddingSettings);

// Initialize LangChain Models
const openaiLC = new ChatOpenAI({
  openAIApiKey: getEnv("OPENAI_API_PROJECT_KEY"),
  modelName: getEnv("OPENAI_API_CHAT_COMPLETION_MODEL") || "gpt-4-turbo"
});

const openaiEmbeddings = new OpenAIEmbeddings({
  openAIApiKey: getEnv("OPENAI_API_PROJECT_KEY"),
  modelName: "text-embedding-3-small"
});

/**
 * Getter functions for OpenAI models
 */
const getOpenaiClient = async ({ proxy = false } = {}) => {
  if (proxy) {
    const config = await genOpenAIConfig();
    return createOpenAI({
      apiKey: getEnv("OPENAI_API_PROJECT_KEY"),
      baseURL: getEnv("OPENAI_BASE_URL") || "https://api.openai.com/v1",
      compatibility: "strict",
      organization: getEnv("OPENAI_API_ORG_ID"),
      fetch: require("node-fetch"), // Ensure you have node-fetch or another fetch implementation
      ...config
    });
  }
  return openaiProvider;
};

const getChatModel = () => chatModel;
const getCompletionModel = () => completionModel;
const getEmbeddingModel = () => embeddingModel;

const getOpenaiLCClient = () => openaiLC;

const getOpenAiEmbeddings = async ({
  text = "",
  key = getEnv("OPENAI_API_PROJECT_KEY"),
  modelName = "text-embedding-3-small"
} = {}) => {
  const embedder = new OpenAIEmbeddings({
    modelName,
    openAIApiKey: key
  });
  const embedding = await embedder.embedQuery(text);
  return embedding;
};

/**
 * Additional Getter for LangChain Embeddings with Proxy Support
 */
const getOpenAiEmbeddingsWithProxy = async ({
  text = "",
  key = getEnv("OPENAI_API_PROJECT_KEY"),
  modelName = "text-embedding-3-small"
} = {}) => {
  const config = await genOpenAIConfig();
  const embedder = new OpenAIEmbeddings({
    modelName,
    openAIApiKey: key,
    ...config
  });
  const embedding = await embedder.embedQuery(text);
  return embedding;
};

// Export all getter functions
module.exports = {
  getOpenaiClient,
  getChatModel,
  getCompletionModel,
  getEmbeddingModel,
  getOpenaiLCClient,
  getOpenAiEmbeddings,
  getOpenAiEmbeddingsWithProxy
};

// const getEmbedding = async (text, key) => {
//   try {
//     logger.info(`Generating embedding for text: ${text}...`);
//     const embedder = new OpenAIEmbeddings({
//       modelName: "text-embedding-3-small",
//       openAIApiKey: key || process.env.OPENAI_API_PROJECT_KEY
//     });
//     const embedding = await embedder.embedQuery(text);
//     logger.info("Embedding generated successfully");
//     return embedding;
//   } catch (error) {
//     console.error(`Error generating embedding for text: ${text} with error: ${error}`);
//     throw error;
//   }
// };
