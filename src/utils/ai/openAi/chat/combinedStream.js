const { logger } = require("@config/logging");
const {
  getMainSystemMessageContent,
  getMainAssistantMessageInstructions,
  getFormattingInstructions
} = require("@lib/prompts/createPrompt");
const { performPerplexityCompletion, handleSummarization } = require("./context");
const { handleChatError, checkApiKey } = require("@utils/api");
const { addMessageToSession, getSessionHistory } = require("./chat_history");
const { CallbackManager } = require("@langchain/core/callbacks/manager");
const { ChatOpenAI } = require("@langchain/openai");
const { SystemMessage, AIMessage, HumanMessage } = require("@langchain/core/messages");
const { logChatData } = require("@utils/processing/utils/loggingFunctions");
const { createFormattedPrompt } = require("@utils/ai/prompt-utils");
const { prepareDocuments } = require("@utils/processing/utils/documents");
const { RecursiveCharacterTextSplitter } = require("langchain/text_splitter");
const { handleFileStreaming } = require("@controllers/fileStreaming");
const { createNewSession } = require("./chat_helpers");
const { savePromptBuild, saveChatCompletion } = require("./chat_record");
const { extractAdditionalInfo, getRelevantContext, setupVectorStores } = require("./chat_context");
const {
  getInitializationData,
  initializeOpenAI,
  initializePinecone,
  initializeEmbeddings,
  initializeChatSession
} = require("./chat_initialize");
const { LogStreamHandler } = require("./chat_classes");

const textSplitter = new RecursiveCharacterTextSplitter({ chunkSize: 1000, chunkOverlap: 200 });

const combinedChatStream = async (req, res) => {
  let initializationData;
  if (req.body.newSession) {
    initializationData = getInitializationData(req.body);
    const newSession = await createNewSession(initializationData);
    initializationData = {
      ...initializationData,
      sessionId: newSession._id
    };
  } else {
    initializationData = getInitializationData(req.body);
  }
  if (initializationData.streamType === "file") {
    return handleFileStreaming(req, res);
  }
  try {
    checkApiKey(initializationData.apiKey, "OpenAI");

    // 1 - Initialize or generate chat session
    const chatSession = await initializeChatSession(
      initializationData.sessionId,
      initializationData.workspaceId,
      initializationData.userId,
      initializationData.prompt,
      initializationData.sessionLength
    );
    // 2 - Initialize or generate chat instance
    const chatOpenAI = initializeOpenAI(
      initializationData.apiKey,
      chatSession,
      initializationData.completionModel
    );
    // 3 - Initialize pinecone instance
    const pinecone = initializePinecone();
    // 4 - Initialize or generate embeddings
    const embedder = initializeEmbeddings(initializationData.apiKey);
    // 5 - Initialize vector stores
    const { sessionContextStore, searchContextStore, customDataStore } = await setupVectorStores(
      pinecone,
      embedder,
      initializationData
    );
    // 6 - Retrieve or initialize chat history
    // const chatHistory = initializeHistory(chatSession);
    // 7 - Retrieve messages from history
    const messages = await getSessionHistory(chatSession._id);
    // const messages = await retrieveHistory(chatSession);
    // 8 - Generate summary of history
    const summary = await handleSummarization(messages, chatOpenAI, initializationData.sessionId);
    // 9 - Add user message to session
    const userMessageDoc = await addMessageToSession(chatSession, {
      userId: initializationData.userId,
      workspaceId: initializationData.workspaceId,
      sessionId: chatSession._id,
      role: "user",
      content: initializationData.prompt,
      metadata: {
        createdAt: Date.now(),
        updatedAt: Date.now(),
        sessionId: chatSession._id
      }
    });
    logChatData("userMessageDoc", userMessageDoc);
    const currentPromptHistory = chatSession.promptHistory;
    chatSession.promptHistory = [...currentPromptHistory, initializationData.prompt];
    chatSession.summary = summary;
    await chatSession.save();
    // 10 - Context A: Perform search for prompt-related data
    const searchResults = await performPerplexityCompletion(
      initializationData.prompt,
      initializationData.perplexityApiKey
    );
    await searchContextStore.addDocuments(await textSplitter.splitDocuments([searchResults]));
    // 11 - Context B: Get relevant context based on the prompt and search results
    // logChatData('searchResults', searchResults);
    const context = await getRelevantContext(
      sessionContextStore,
      searchContextStore,
      customDataStore,
      initializationData.prompt
    );
    // 12 - Extract additional information to build context around prompt
    // logChatData('context', context);
    const { keywords, uiLibraries, jsLibraries, componentTypes, documentationContent } =
      await extractAdditionalInfo(initializationData.prompt);
    // 13 - Format prompt with all context and search results
    const formattedPrompt = createFormattedPrompt(
      initializationData,
      context,
      summary,
      searchResults,
      keywords,
      uiLibraries,
      jsLibraries,
      componentTypes,
      documentationContent,
      getFormattingInstructions()
    );

    await savePromptBuild(
      getMainSystemMessageContent(),
      getMainAssistantMessageInstructions(),
      formattedPrompt
    );
    await handleStreamingResponse(
      res,
      formattedPrompt,
      chatSession,
      sessionContextStore,
      initializationData,
      messages
    );
  } catch (error) {
    handleChatError(res, error);
  }
};

const handleStreamingResponse = async (
  res,
  formattedPrompt,
  chatSession,
  sessionContextStore,
  initializationData,
  messages
) => {
  let fullResponse = "";

  const logStreamHandler = new LogStreamHandler(res);

  try {
    const callbackManager = CallbackManager.fromHandlers({
      async handleLLMNewToken(token) {
        // Log and stream each new token using LogStreamHandler
        logStreamHandler.handleLLMNewToken(token);
        fullResponse += token;
      },
      async handleLLMEnd() {
        // Finalize the run and log the end
        await saveChatCompletion(initializationData, chatSession, fullResponse);
        await processChatCompletion(
          chatSession,
          fullResponse,
          sessionContextStore,
          initializationData
        );
        logStreamHandler.handleRunEnd(fullResponse);
      },
      async handleLLMError(error) {
        // Handle and log the error
        logStreamHandler.handleError(error);
      }
      // async handleLLMNewTokenWithRole(message) {
      //   if (message.role === "function") {
      //     const functionCall = message;
      //     await handleFunctionCall(functionCall, sendData);
      //   }
      // },
    });

    const chatOpenAI = new ChatOpenAI({
      openAIApiKey: initializationData.apiKey,
      streaming: true,
      temperature: 0.2,
      callbackManager
    });

    const messageSequence = [
      new SystemMessage(getMainSystemMessageContent()),
      new AIMessage(getMainAssistantMessageInstructions()),
      new HumanMessage(formattedPrompt)
    ];

    logStreamHandler.handleRunStart({
      id: chatSession.id,
      name: "LLM Chat Session",
      type: "llm",
      tags: ["chat"]
    });

    await chatOpenAI.invoke(messageSequence);
  } catch (error) {
    logStreamHandler.handleError(error);
    logStreamHandler.endStream(); // End the stream in case of an error
  }
};

const processChatCompletion = async (
  chatSession,
  fullResponse,
  sessionContextStore,
  initializationData
) => {
  try {
    await saveChatCompletion(initializationData, chatSession, fullResponse);
    const docs = prepareDocuments(initializationData, chatSession, fullResponse);
    const splitDocs = await textSplitter.splitDocuments(docs);
    await sessionContextStore.addDocuments(splitDocs);
    await chatSession.save();
  } catch (error) {
    logger.error(`[ERROR][processChatCompletion]: ${error.message}`);
    throw error;
  }
};

module.exports = { combinedChatStream };
