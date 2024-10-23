const { User } = require("@models/user");
const { Workspace } = require("@models/workspace");
const { ChatSession } = require("@models/chat");
const { Pinecone } = require("@pinecone-database/pinecone");
const { ChatOpenAI, OpenAIEmbeddings } = require("@langchain/openai");
const { tools } = require("@lib/functions");
const { getEnv } = require("@utils/api");
const { logger } = require("@config/logging");
const { logChatDataError } = require("@utils/processing/utils/loggingFunctions");

const initializeChatSession = async (sessionId, workspaceId, userId, prompt, sessionLength) => {
  try {
    let chatSession = await ChatSession.findById(sessionId);
    if (!chatSession) {
      logger.info(
        `[ATTEMPTING SESSION CREATION] WORKSPACE: ${workspaceId} USER: ${userId} - length: ${sessionLength}`
      );
      try {
        chatSession = new ChatSession({
          name: `${prompt}-${workspaceId}`,
          workspaceId: workspaceId,
          userId: userId,
          topic: prompt,
          active: true,
          model: getEnv("OPENAI_API_CHAT_COMPLETION_MODEL"),
          messages: [],
          systemPrompt: null,
          tools: [],
          files: [],
          summary: "",
          stats: {
            tokenUsage: 0,
            messageCount: 0
          },
          settings: {
            contextCount: 15,
            maxTokens: 300, // max length of the completion
            temperature: 0.5,
            model: getEnv("OPENAI_API_CHAT_COMPLETION_MODEL"),
            topP: 1,
            n: 4,
            debug: false,
            summarizeMode: false
          }
        });
        await chatSession.save();
        logger.info(`Session Creation Successful: ${chatSession._id}`);
        const workspace = await Workspace.findById(workspaceId);
        if (workspace) {
          workspace.chatSessions.push(chatSession._id);
          await workspace.save();
        } else {
          throw new Error("Workspace not found");
        }
        const user = await User.findById(userId);
        if (user) {
          user.chatSessions.push(chatSession._id);
          await user.save();
        } else {
          throw new Error("User not found");
        }
      } catch (error) {
        logger.error(
          `Error initializing chat session:
        [message][${error.message}]
        [error][${error}]
        [sessionId] ${sessionId}
        [userId] ${userId},`,
          error
        );
        throw error;
      }
    } else {
      logger.info(`Chat session found: ${chatSession._id}`);
      // const currentPromptHistory = chatSession.promptHistory;
      // chatSession.promptHistory = [...currentPromptHistory, prompt];
    }
    await chatSession.save();
    return chatSession;
  } catch (error) {
    const chatData = { sessionId, userId, prompt };
    logChatDataError("initializeChatSession", chatData, error);
    throw error;
  }
};

const initializeOpenAI = (apiKey, chatSession, completionModel) => {
  const configs = {
    modelName: completionModel,
    temperature: 0.4,
    maxTokens: 300,
    streaming: true,
    openAIApiKey: apiKey || process.env.OPENAI_API_PROJECT_KEY,
    organization: "reed_tha_human",
    // tools: tools,
    code_interpreter: "auto",
    function_call: "auto"
    // callbacks: {
    //   handleLLMNewToken: (token) => {
    //     logger.info(`New token: ${token}`);
    //   }
    // }
  };
  return new ChatOpenAI(configs);
};

const initializePinecone = () => {
  return new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
};

const initializeEmbeddings = (apiKey) => {
  return new OpenAIEmbeddings({
    modelName: getEnv("PINECONE_EMBEDDING_MODEL_NAME"),
    apiKey: apiKey || getEnv("OPENAI_API_PROJECT_KEY")
  });
};

const getInitializationData = (body) => ({
  // --- main --- //
  apiKey: body.clientApiKey || process.env.OPENAI_API_PROJECT_KEY,
  userId: body.userId,
  workspaceId: body.workspaceId,
  sessionId: body.sessionId,
  prompt: body.regenerate ? null : body.prompt,
  role: body.role,
  sessionLength: body.count || 0,
  streamType: body.streamType,
  temperature: 0.5,
  maxTokens: 1024,
  topP: 1,
  frequencyPenalty: 0.5,
  presencePenalty: 0,
  perplexityApiKey: process.env.PERPLEXITY_API_KEY,
  searchEngineKey: process.env.GOOGLE_SERPER_API_KEY,
  pineconeEnv: process.env.PINECONE_API_KEY,
  pineconeIndex: process.env.PINECONE_INDEX,
  namespace: process.env.PINECONE_NAMESPACE_1,
  dimensions: parseInt(process.env.PINECONE_EMBEDDING_MODEL_DIMENSIONS),
  embeddingModel: process.env.PINECONE_EMBEDDING_MODEL_NAME,
  completionModel: process.env.OPENAI_API_CHAT_COMPLETION_MODEL
});

module.exports = {
  getInitializationData,
  initializeOpenAI,
  initializePinecone,
  initializeEmbeddings,
  initializeChatSession
};
