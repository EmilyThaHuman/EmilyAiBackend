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
const { LogStreamHandler } = require("@utils/ai/classes");

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
    const { keywords, uiLibraries, jsLibraries, componentTypes } = await extractAdditionalInfo(
      initializationData.prompt
    );
    // 13 - Format prompt with all context and search results
    const formattedPrompt = createFormattedPrompt(
      initializationData,
      context,
      summary,
      searchResults,
      keywords,
      uiLibraries,
      jsLibraries,
      componentTypes
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

/**
 * Handles the streaming response by interacting with OpenAI's Chat API and managing the SSE stream.
 * @param {http.ServerResponse} res - The HTTP response object.
 * @param {string} formattedPrompt - The prompt to send to the AI model.
 * @param {Object} chatSession - The current chat session object.
 * @param {Object} sessionContextStore - The session's context store.
 * @param {Object} initializationData - Initialization data from the request.
 * @param {Array} messages - The chat history messages.
 */
const handleStreamingResponse = async (
  res,
  formattedPrompt,
  chatSession,
  sessionContextStore,
  initializationData,
  messages
) => {
  let dup = "";
  // Initialize the enhanced LogStreamHandler with additional options
  const logStreamHandler = new LogStreamHandler(res, {
    clientId: chatSession._id, // Assign a unique client ID for better traceability
    enableConsoleLogging: false // Enable or disable console logging as needed
  });

  try {
    // Create a CallbackManager with handlers for various events
    const callbackManager = CallbackManager.fromHandlers({
      async handleLLMNewToken(token) {
        if (token && typeof token === "string") {
          logStreamHandler.handleLLMNewToken(token);
        }
      },
      async handleLLMEnd() {
        try {
          // Finalize the chat session upon completion
          const fullResponse = logStreamHandler.getCompleteContent();
          // logStreamHandler.handleRunEnd();
          let formattedData;
          if (typeof fullResponse === "string") {
            formattedData = fullResponse;
          } else if (typeof fullResponse === "object" && fullResponse !== null) {
            formattedData = JSON.stringify(fullResponse);
          } else {
            throw new TypeError(`Invalid data type: ${typeof fullResponse}`);
          }
          if (typeof formattedData !== "string" || formattedData.length === 0) {
            logger.error("Invalid formattedData in handleStreamingResponse");
          } else {
            logger.info("Full response:", formattedData);
            await processChatCompletion(
              chatSession,
              formattedData,
              sessionContextStore,
              initializationData
            );
          }
          res.write(`data: ${formattedData}\n\n`);
          const doneMessage = {
            type: "done",
            content: "[DONE]"
          };
          res.write(`data: ${JSON.stringify(doneMessage)}\n\n`);
          res.end();
          // res.write({
          //   message: "success",
          //   data: {
          //     chatSession,
          //     chatHistory: messages
          //   }
          // });
        } catch (error) {
          // Handle errors that occur during the chat completion process
          logger.error("Error during chat completion:", error);
          // logStreamHandler.handleError(error);
        }
      },
      async handleLLMError(error) {
        try {
          logger.error("LLM Error:", error);
          if (!(error instanceof Error)) {
            error = new Error(typeof error === "string" ? error : JSON.stringify(error));
          }
          logStreamHandler.handleError(error);
        } catch (err) {
          logger.error("Error in handleLLMError:", err);
        }
      }

      // async handleLLMNewToken(token) {
      //   if (token && typeof token === "string") {
      //     logStreamHandler.handleLLMNewToken(token);
      //     dup += token;
      //   }
      // },
      // async handleLLMEnd() {
      //   try {
      //     // Finalize the chat session upon completion
      //     await saveChatCompletion(initializationData, chatSession, fullResponse);
      //     await processChatCompletion(
      //       chatSession,
      //       fullResponse,
      //       sessionContextStore,
      //       initializationData
      //     );
      //     logStreamHandler.handleRunEnd(fullResponse);
      //   } catch (error) {
      //     // Handle errors that occur during the chat completion process
      //     logger.error("Error during chat completion:", error);
      //     logStreamHandler.handleError(error);
      //   }
      // },
      // async handleLLMError(error) {
      //   logger.error("LLM Error:", error);
      //   logStreamHandler.handleError(error instanceof Error ? error.message : String(error));
      // }
    });

    // Initialize the ChatOpenAI instance with streaming and the callback manager
    const chatOpenAI = new ChatOpenAI({
      openAIApiKey: initializationData.apiKey,
      streaming: true,
      temperature: 0.2,
      callbackManager
    });

    // Prepare the message sequence for the AI model
    const messageSequence = [
      new SystemMessage(getMainSystemMessageContent()),
      new AIMessage(getMainAssistantMessageInstructions()),
      new HumanMessage(formattedPrompt)
    ];

    // Log the start of the run
    logStreamHandler.handleRunStart({
      id: chatSession._id,
      name: "LLM Chat Session",
      type: "llm",
      tags: ["chat"]
      // metadata: {
      //   messages: messages
      // }
    });

    // Invoke the ChatOpenAI model with the message sequence
    await chatOpenAI.invoke(messageSequence);
  } catch (error) {
    // Handle any unforeseen errors by logging and ending the stream
    logStreamHandler.handleError(error);
    logStreamHandler.endStream(error?.message || "Unknown error");
  }
};

/**
 * Processes the completed chat by saving the response and updating the context stores.
 * @param {Object} chatSession - The current chat session object.
 * @param {string} fullResponse - The complete response from the AI model.
 * @param {Object} sessionContextStore - The session's context store.
 * @param {Object} initializationData - Initialization data from the request.
 */
const processChatCompletion = async (
  chatSession,
  fullResponse,
  sessionContextStore,
  initializationData
) => {
  try {
    // Save the chat completion to the database
    await saveChatCompletion(initializationData, chatSession, fullResponse);

    // Prepare documents based on the response
    const docs = prepareDocuments(initializationData, chatSession, fullResponse);
    const splitDocs = await textSplitter.splitDocuments(docs);

    // Add the documents to the session's context store
    await sessionContextStore.addDocuments(splitDocs);

    // Save the updated chat session
    await chatSession.save();
  } catch (error) {
    // Log any errors that occur during processing
    logger.error(`[ERROR][processChatCompletion]: ${error.message}`);
    throw error;
  }
};

module.exports = { combinedChatStream };
