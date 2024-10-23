const fs = require("node:fs/promises");
const { logger } = require("@config/logging");
const { PineconeStore } = require("@langchain/pinecone");
const {
  initializeOpenAI,
  initializePinecone,
  initializeEmbeddings,
  initializeChatSession
} = require("./initialize");
const { createPineconeIndex } = require("@utils/ai/pinecone/create.js");
const {
  getMainSystemMessageContent,
  getMainAssistantMessageInstructions,
  getFormattingInstructions
} = require("@lib/prompts/createPrompt");
const { performPerplexityCompletion, handleSummarization, extractKeywords } = require("./context");
const { getEnv, handleChatError, checkApiKey } = require("@utils/api");
const {
  identifyLibrariesAndComponents,
  getDocumentationUrl,
  scrapeDocumentation
} = require("../../shared");
const {
  addMessageToSession,
  getSessionHistory,
  addSystemMessageToSession,
  addAssistantInstructionsToSession
} = require("./chat_history");
const { ChatSession } = require("@models/chat");
const { default: mongoose } = require("mongoose");
const { CallbackManager } = require("@langchain/core/callbacks/manager");
const { OpenAIChat, ChatOpenAI } = require("@langchain/openai");
const { SystemMessage, AIMessage, HumanMessage } = require("@langchain/core/messages");
const { logChatData } = require("@utils/processing/utils/loggingFunctions");
const { createFormattedPrompt } = require("@utils/ai/prompt-utils");
const {
  generateUniqueFileName,
  getPublicFilePath,
  writeToFile,
  saveMarkdown,
  saveJson
} = require("@utils/processing/utils/files");
const { extractContent } = require("@utils/processing/utils/parse");
const {
  formatDocumentation,
  formatChatCompletionContent,
  formatChatPromptBuild,
  formatDocumentationFromString
} = require("@utils/processing/utils/format");
const { prepareDocuments } = require("@utils/processing/utils/documents");
const { RecursiveCharacterTextSplitter } = require("langchain/text_splitter");
const { handleFileStreaming } = require("@controllers/fileStreaming");

class LogStreamHandler {
  constructor(res) {
    this.res = res;
    this.logs = []; // Store log entries
    this.startTime = new Date().toISOString(); // Timestamp of the start of the run
    this.accumulatedResponse = ""; // Store the full accumulated response

    this.prevLogLength = 0; // Length of the previous log in characters
  }

  /**
   * Sends data to the client via Server-Sent Events (SSE).
   * @param {Object} data - The data to send.
   */
  sendData(data) {
    this.res.write(`data: ${JSON.stringify(data)}\n\n`);
  }

  /**
   * Logs data to the console, overwriting the previous log entry.
   * Uses logger.info for informational logs and logger.error for errors.
   * @param {Object} data - The log data.
   */
  logToConsole(data) {
    // Clear the previous log from the console
    if (this.prevLogLength > 0) {
      process.stdout.write("\x1B[2K"); // Clear the entire line
      process.stdout.write("\x1B[0G"); // Move cursor to the start of the line
    }

    // Create the log message
    let logMessage;
    if (data.type === "error") {
      logMessage = `[ERROR][LogStreamHandler]: ${data.message}`;
      logger.error(logMessage); // Log to the main logger
    } else if (data.type === "run_start" || data.type === "run_end") {
      logMessage = `[INFO][LogStreamHandler]: ${JSON.stringify(data)}`;
      logger.info(logMessage); // Log to the main logger
    } else {
      // For other types like 'token'
      logMessage = `[INFO][LogStreamHandler]: ${data.content}`;
      logger.info(logMessage); // Log to the main logger
    }

    // Write the new log message to the console
    process.stdout.write(`${logMessage}\n`);

    // Update the previous log length
    this.prevLogLength = logMessage.length;
  }
  /**
   * Logs the accumulated response to the console, overwriting the previous log entry.
   * Uses logger.info for informational logs and logger.error for errors.
   * @param {string} accumulatedResponse - The full accumulated response so far.
   */
  logAccumulatedResponse(accumulatedResponse) {
    // Clear the previous log from the console
    if (this.prevLogLength > 0) {
      process.stdout.write("\x1B[2K"); // Clear the entire line
      process.stdout.write("\x1B[0G"); // Move cursor to the start of the line
      process.stdout.write("\x1B[1A".repeat(this.prevLogLength)); // Move cursor up by the number of lines
      process.stdout.write("\x1B[2K".repeat(this.prevLogLength)); // Clear the previous log content
    }

    // Calculate number of lines for the current log
    const logLines = accumulatedResponse.split("\n").length;

    // Log the accumulated content to the console
    process.stdout.write(`${accumulatedResponse}\n`);

    // Update the previous log length
    this.prevLogLength = logLines;
  }
  /**
   * Handles the start of a run.
   * @param {Object} run - The run details.
   */
  handleRunStart(run) {
    const logEntry = {
      id: run.id,
      name: run.name,
      type: run.type,
      tags: run.tags || [],
      metadata: run.metadata || {},
      start_time: this.startTime,
      streamed_output: [],
      streamed_output_str: []
    };

    this.logs.push(logEntry);

    // Prepare and send the run start data
    const data = { type: "run_start", data: logEntry };
    this.sendData(data);
    this.logToConsole(data);
  }

  /**
   * Handles each new token received during the run.
   * Accumulates the response and logs the updated response in the console.
   * @param {string} token - The new token.
   */
  handleLLMNewToken(token) {
    // Accumulate the token into the full response
    this.accumulatedResponse += token;

    // Log the entire accumulated response
    this.logAccumulatedResponse(this.accumulatedResponse);

    // Prepare and send the token data
    const data = { type: "token", content: token };

    // Send token to the client
    this.sendData(data);
  }

  /**
   * Handles errors that occur during the run.
   * @param {Error} error - The error object.
   */
  handleError(error) {
    // Prepare and log the error data
    const data = { type: "error", message: error.message };
    this.logToConsole(data);

    // Send error message to client
    this.sendData(data);
  }

  /**
   * Handles the completion of the run.
   * @param {string} finalOutput - The final output of the run.
   */
  async handleRunEnd(finalOutput) {
    const endTime = new Date().toISOString();
    const latestLog = this.logs[this.logs.length - 1];

    if (latestLog) {
      latestLog.end_time = endTime;
      latestLog.final_output = finalOutput;
    }

    // Prepare and log the run end data
    const data = { type: "run_end", data: latestLog };
    this.logToConsole(data);

    // Send final log to the client
    this.sendData(data);

    // End the response once everything is done
    this.res.end();
  }

  /**
   * Manually ends the stream in case of unexpected issues.
   */
  endStream() {
    const data = { type: "end", message: "Stream Ended" };
    this.logToConsole(data);
    this.sendData(data);
    this.res.end();
  }
}

module.exports = LogStreamHandler;

const functionDefinitions = [
  {
    type: "function",
    name: "generateResponse",
    description: "Generates a response based on user input.",
    parameters: {
      type: "object",
      properties: {
        content: {
          type: "string",
          description: "The content of the response."
        },
        metadata: {
          type: "object",
          properties: {
            timestamp: {
              type: "string",
              description: "The time the response was generated."
            },
            responseLength: {
              type: "integer",
              description: "The length of the response in characters."
            }
          },
          required: ["timestamp", "responseLength"]
        }
      },
      required: ["content", "metadata"]
    }
  }
];
const textSplitter = new RecursiveCharacterTextSplitter({ chunkSize: 1000, chunkOverlap: 200 });
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
/**
 * Logs streaming data to the console.
 * @param {String} markdown - The markdown content to log.
 */
function liveStreamLogger(markdown) {
  // Clear previous log and print updated markdown
  process.stdout.write("\x1b");
  logger.info(markdown);
}
/**
 * Creates a new chat session and initializes system/assistant messages.
 * Utilizes the refactored ChatSession.createSession method.
 *
 * @param {Object} defaultData - The default data containing user and workspace IDs.
 * @param {Object} res - The Express response object.
 */
const createNewSession = async (defaultData) => {
  const { userId, workspaceId, sessionId, regenerate, prompt, clientApiKey } = defaultData;

  if (!userId || !workspaceId) {
    throw new Error("Missing required parameters: userId and workspaceId.");
  }

  try {
    const newChat = await ChatSession.createSession({
      userId,
      workspaceId,
      sessionId: sessionId || mongoose.Types.ObjectId(),
      regenerate,
      prompt,
      clientApiKey,
      title: prompt,
      name: prompt,
      status: "active",
      path: `/chat/${sessionId || newChat._id}`
    });

    // Add system and assistant messages using helper methods
    const systemPrompt = getMainSystemMessageContent();
    const assistantInstructions = getMainAssistantMessageInstructions();

    await addSystemMessageToSession(newChat, systemPrompt);
    await addAssistantInstructionsToSession(newChat, assistantInstructions);

    return newChat;
  } catch (error) {
    logger.error("Error creating chat session:", error);
    throw new Error("Failed to create chat session.");
  }
};

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
  } finally {
    res.end();
  }
};
const setupVectorStores = async (pinecone, embedder, initializationData) => {
  try {
    const pineconeIndex = await createPineconeIndex(pinecone, initializationData.pineconeIndex);
    const sessionContextStore = await PineconeStore.fromExistingIndex(embedder, {
      pineconeIndex,
      namespace: "chat-history",
      textKey: "text"
    });
    const searchContextStore = await PineconeStore.fromExistingIndex(embedder, {
      pineconeIndex,
      namespace: "perplexity-search-results",
      textKey: "text"
    });
    const customDataStore = await PineconeStore.fromExistingIndex(embedder, {
      pineconeIndex,
      namespace: "library-documents",
      textKey: "text"
    });
    return { sessionContextStore, searchContextStore, customDataStore };
  } catch (error) {
    logger.error(`[ERROR][setupVectorStores]: ${error.message}`);
    throw error; // Always rethrow the error or handle it properly
  }
};
const getRelevantContext = async (
  sessionContextStore,
  searchContextStore,
  customDataStore,
  prompt
) => {
  try {
    const relevantSessionHistory = await sessionContextStore.similaritySearch(prompt, 5);
    const relevantSearchResults = await searchContextStore.similaritySearch(prompt, 5);
    const relevantCustomDataDocs = await customDataStore.similaritySearch(prompt, 5);

    try {
      logger.info(`[getRelevantContext] prompt: ${prompt}`);
      logger.info(
        `[getRelevantContext] relevantSessionHistory: ${JSON.stringify(relevantSessionHistory)}`
      );
    } catch (error) {
      logger.error(
        `[ERROR][getRelevantContext] sessionContextStore.similaritySearch: ${error.message}`
      );
    }
    try {
      logger.info(`[getRelevantContext] prompt: ${prompt}`);
      logger.info(
        `[getRelevantContext] relevantSearchResults: ${JSON.stringify(relevantSearchResults)}`
      );
    } catch (error) {
      logger.error(
        `[ERROR][getRelevantContext] relevantSearchResults.similaritySearch: ${error.message}`
      );
    }
    try {
      logger.info(`[getRelevantContext] prompt: ${prompt}`);
      logger.info(
        `[getRelevantContext] relevantCustomDataDocs: ${JSON.stringify(relevantCustomDataDocs)}`
      );
    } catch (error) {
      logger.error(
        `[ERROR][getRelevantContext] relevantCustomDataDocs.similaritySearch: ${error.message}`
      );
    }
    return {
      sessionContext: relevantSessionHistory.map((doc) => doc.pageContent).join("\n"),
      searchContext: relevantSearchResults.map((doc) => doc.pageContent).join("\n"),
      libraryContext: relevantCustomDataDocs.map((doc) => doc.pageContent).join("\n")
    };
  } catch (error) {
    logger.error(`[ERROR][getRelevantContext]: ${error.message}`);
    throw error;
  }
};
const extractAdditionalInfo = async (prompt) => {
  try {
    const keywords = await extractKeywords(prompt);
    const { uiLibraries, jsLibraries, componentTypes } =
      await identifyLibrariesAndComponents(prompt);
    const documentationContent = await getDocumentationContent(uiLibraries, componentTypes);
    return { keywords, uiLibraries, jsLibraries, componentTypes, documentationContent };
  } catch (error) {
    logger.error(`[ERROR][extractAdditionalInfo]: ${error.message}`);
    throw error;
  }
};
const getDocumentationContent = async (uiLibraries, componentTypes) => {
  try {
    let documentationContent = [];
    if (uiLibraries.length > 0 && componentTypes.length > 0) {
      for (const library of uiLibraries) {
        for (const componentType of componentTypes) {
          const docUrl = await getDocumentationUrl(library, componentType);
          if (docUrl) {
            const content = await scrapeDocumentation(docUrl);
            documentationContent.push({ library, componentType, content });
          }
        }
      }
    } else if (componentTypes.length > 0) {
      const randomLibraries = uiLibraries.sort(() => 0.5 - Math.random()).slice(0, 3);
      for (const library of randomLibraries) {
        for (const componentType of componentTypes) {
          const docUrl = await getDocumentationUrl(library.name, componentType);
          if (docUrl) {
            const content = await scrapeDocumentation(docUrl);
            documentationContent.push({ library: library.name, componentType, content });
          }
        }
      }
    }
    return documentationContent;
  } catch (error) {
    logger.error(`[ERROR][getDocumentationContent]: ${error.message}`);
    throw error;
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
  const DONE_MESSAGE = "DONE";
  const sendData = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  let fullResponse = "";
  let functionCallData = null;

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
      // async handleLLMNewToken(token) {
      //   // Log the content accumulation
      //   logStreamCallbackHandler.onLLMNewToken({ id: chatSession._id, name: "LLM" }, token);

      //   sendData({ type: "message", content: token });
      //   fullResponse += token;
      // },
      // async handleLLMNewTokenWithRole(message) {
      //   if (message.role === "function") {
      //     const functionCall = message;
      //     await handleFunctionCall(functionCall, sendData);
      //   }
      // },
      // async handleLLMEnd() {
      //   logStreamCallbackHandler.onRunUpdate({
      //     id: chatSession._id,
      //     name: "LLM",
      //     final_output: fullResponse
      //   });

      //   await saveChatCompletion(initializationData, chatSession, fullResponse);
      //   await processChatCompletion(
      //     chatSession,
      //     fullResponse,
      //     sessionContextStore,
      //     initializationData
      //   );
      //   sendData({ type: "end", message: DONE_MESSAGE });
      //   res.end();
      // },
      // async handleLLMError(error) {
      //   logger.error(`[ERROR][handleStreamingResponse]: ${error.stack}`);
      //   logStreamCallbackHandler.onRunUpdate({
      //     id: chatSession._id,
      //     name: "LLM",
      //     final_output: "error"
      //   });

      //   sendData({ type: "error", message: error.message });
      //   res.end();
      // }
    });

    const chatOpenAI = new ChatOpenAI({
      openAIApiKey: initializationData.apiKey,
      streaming: true,
      temperature: 0.2,
      callbackManager
    });

    const functions = functionDefinitions;

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

    await chatOpenAI.invoke(messageSequence, {
      functions,
      function_call: "auto"
    });
  } catch (error) {
    logStreamHandler.handleError(error);
    logStreamHandler.endStream(); // End the stream in case of an error
    // logger.error(`[ERROR][handleStreamingResponse]: ${error.stack}`);
    // sendData({ type: "error", message: error.message });
    // res.end();
  }
};

async function handleFunctionCall(functionCall, sendData) {
  try {
    const { name, arguments: args } = functionCall;
    const functionResult = await executeFunction(name, args);

    // Send function result to the client
    sendData({ type: "function_result", name, result: functionResult });
  } catch (error) {
    logger.error(`[ERROR][handleFunctionCall]: ${error.stack}`);
    sendData({ type: "error", message: error.message });
  }
}

const executeFunction = async (functionName, functionArgs) => {
  try {
    const args = JSON.parse(functionArgs);

    if (functionName === "generateResponse") {
      const content = args.content;
      const metadata = args.metadata;

      const responseContent = `${content}\n\nGenerated at: ${metadata.timestamp}\nResponse Length: ${metadata.responseLength}`;

      return { content: responseContent };
    } else {
      throw new Error(`Function ${functionName} not recognized.`);
    }
  } catch (error) {
    logger.error(`[ERROR][executeFunction]: ${error.message}`);
    throw error;
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
async function savePromptBuild(systemContent, assistantInstructions, formattedPrompt) {
  const fileName = generateUniqueFileName("prompt-build");
  const filePath = getPublicFilePath(fileName);
  const promptBuild = formatChatPromptBuild(systemContent, assistantInstructions, formattedPrompt);

  try {
    await writeToFile(filePath, promptBuild);
  } catch (error) {
    logger.error(`[ERROR][savePromptBuild]: ${error.message}`);
    throw error;
  }
}
async function saveChatCompletion(initializationData, chatSession, fullResponse) {
  const fileName = generateUniqueFileName("chat-completion");
  const filePath = getPublicFilePath(fileName);
  await fs.writeFile(filePath, fullResponse);

  try {
    const parsedData = extractContent(fullResponse);
    if (parsedData.content) {
      const chatCompletionContent = formatChatCompletionContent(parsedData.content);
      logger.info(`[INFO][saveChatCompletion]: ${chatCompletionContent}`);
      await writeToFile(filePath, parsedData.content);
      await saveMarkdown(parsedData.content);
      await saveJson(JSON.stringify(parsedData));
    }
    // let formattedContent = formatDocumentationFromString(content.content);
    // const chatCompletionContent = formatChatCompletionContent(parsedData.content);
    // await writeToFile(filePath, parsedData.content);

    try {
      const assistantMessageDoc = await addMessageToSession(chatSession, {
        role: "assistant",
        content: parsedData.content,
        code: parsedData.content,
        userId: initializationData.userId,
        workspaceId: initializationData.workspaceId,
        sessionId: chatSession._id,
        metadata: {
          createdAt: Date.now(),
          updatedAt: Date.now(),
          sessionId: chatSession._id,
          contentType: parsedData?.type,
          references: parsedData?.references
        }
      });
      logChatData("assistantMessageDoc", assistantMessageDoc);
      const tokenizedMessages = await chatSession.tokenizeAllMessages(chatSession._id);
      await chatSession.updateTokenUsage(tokenizedMessages);
      const usage = chatSession.getTokenUsage();
      logger.info(`Token usage: ${usage}`);
    } catch (error) {
      logger.error(`[ERROR][saveChatCompletion]: ${error.message}`);
      throw error;
    }
  } catch (error) {
    logger.error(`[ERROR][saveChatCompletion]: ${error.message}`);
    throw error;
  }
}

module.exports = { combinedChatStream };
/*
const handleMarkdownStreamingResponse = async (
  res,
  chatOpenAI,
  formattedPrompt,
  chatSession,
  userMessageDoc,
  sessionContextStore,
  initializationData,
  messages
) => {
  const sendJSON = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);
  let accumulatedResponse = "";

  try {
    const result = await chatOpenAI.completionWithRetry({
      model: getEnv("OPENAI_API_CHAT_COMPLETION_MODEL"),
      messages: [
        { role: "system", content: getMainSystemMessageContent() },
        { role: "assistant", content: getMainAssistantMessageInstructions() },
        { role: "user", content: formattedPrompt }
      ],
      stream: true,
      stream_usage: true,
      temperature: 0.2,
      functions: functionDefinitions,
      function_call: "auto"
    });

    for await (const chunk of result) {
      const payloads = chunk.toString().split("\n\n");
      for (const payload of payloads) {
        if (!payload.trim()) continue;
        if (payload === "[DONE]") {
          sendJSON({ type: "end" });
          saveMarkdown(accumulatedResponse); // Save the accumulated response to a markdown file
          res.end();
          return;
        }

        const parsed = JSON.parse(payload.replace(/^data: /, ""));
        const { usage, choices } = parsed;

        // Handle usage statistics
        if (usage) {
          sendJSON({ type: "usage", usage });
        }

        // Accumulate content chunks
        const contentChunk = choices?.[0]?.delta?.content || "";
        accumulatedResponse += contentChunk;

        sendJSON({ type: "content", content: contentChunk }); // Stream back to client
      }
    }
  } catch (error) {
    logger.error(`[ERROR][handleStreamingResponse]: ${error.message}`);
    throw error;
  }
};
*/
// Check if the result is an async iterator (stream)
// if (result && typeof result[Symbol.asyncIterator] === "function") {
//   for await (const chunk of result) {
//     const content = chunk.choices?.[0]?.delta?.content || "";
//     fullResponse += content;
//     responseChunks.push(content);

//     // Send each chunk to the client
//     sendData({ content });

//     // Flush the response if possible
//     if (typeof res.flush === "function") {
//       res.flush();
//     }

//     // Log the accumulated response
//     liveLogResponse();
//   }
// } else {
//   logger.error("Invalid result from completionWithRetry");
//   throw new Error("Invalid response stream");
// }

// // Optionally handle usage data
// if (result.usage) {
//   const { prompt_tokens, completion_tokens, total_tokens } = result.usage;
//   await recordTokenUsage(prompt_tokens, completion_tokens, total_tokens);
// } else {
//   logger.warn("Token usage data not available in the response.");
// }

// Save and process the full response
//   await saveChatCompletion(initializationData, chatSession, fullResponse);
//   await processChatCompletion(chatSession, fullResponse, sessionContextStore, initializationData);

//   // Send the DONE message and end the response
//   sendData({ type: "end", message: DONE_MESSAGE });
//   res.end();
// } catch (error) {
//   logger.error(`[ERROR][handleStreamingResponse]: ${error.message}`);
//   sendData({ type: "error", message: error.message });
//   res.end();
// }
//   sendData({ content: DONE_MESSAGE });
//   res.end();
//   return fullResponse;
// } catch (error) {
//   const chatData = { chatSession, userMessageDoc, messages };
//   logChatDataError("handleStreamingResponse", chatData, error);
//   sendData({ error: error.message });
//   res.end();
//   throw error;
// }
// };
// else {
//           const text = choice.delta.content;
//           if (text) {
//             // Accumulate the text content
//             accumulatedResponse.content = (accumulatedResponse.content || "") + text;
//             // Optionally, update metadata here if needed
//             sendJSON({ type: "message", content: accumulatedResponse });
//             liveLogResponse();
//           }
//         }
// Stream the data chunks
//   result.data.on("data", (chunk) => {
//     const payloads = chunk.toString().split("\n\n");
//     for (const payload of payloads) {
//       if (payload.trim() === "") continue;
//       if (payload === "[DONE]") {
//         sendJSON({ type: "end" });
//         res.end();
//         return;
//       }

//       try {
//         const parsed = JSON.parse(payload.replace(/^data: /, ""));
//         const { usage, choices } = parsed;

//         // If stream_options is true, an additional chunk with usage stats is sent
//         if (usage) {
//           sendJSON({ type: "usage", usage });
//           continue;
//         }

//         const choice = choices[0];
//         if (choice.function_call) {
//           const { name, arguments: args } = choice.function_call;
//           const responseData = JSON.parse(args);

//           // Accumulate the response
//           accumulatedResponse = { ...accumulatedResponse, ...responseData };
//           sendJSON({ type: "message", content: accumulatedResponse });
//           liveLogResponse();
//         } else {
//           const text = choice.delta.content;
//           if (text) {
//             // Accumulate the text content
//             accumulatedResponse.content = (accumulatedResponse.content || "") + text;
//             // Optionally, update metadata here if needed
//             sendJSON({ type: "message", content: accumulatedResponse });
//             liveLogResponse();
//           }
//         }
//       } catch (error) {
//         console.error("Error parsing stream payload:", error);
//       }
//     }
//   });
// };
// const handleStreamingResponse = async (
//   res,
//   chatOpenAI,
//   formattedPrompt,
//   chatSession,
//   userMessageDoc,
//   sessionContextStore,
//   initializationData,
//   messages
// ) => {
//   let result;
//   try {
//     result = await chatOpenAI.completionWithRetry({
//       model: getEnv("OPENAI_API_CHAT_COMPLETION_MODEL"),
//       messages: [
//         { role: "system", content: getMainSystemMessageContent() },
//         { role: "assistant", content: getMainAssistantMessageInstructions() },
//         { role: "user", content: formattedPrompt }
//       ],
//       stream: true,
//       stream_usage: true,
//       response_format: { type: "json_object" },
//       temperature: 0.2,
//       tools: functionDefinitions,
//       tool_call: "auto"
//     });
//   } catch (error) {
//     logger.error(`[ERROR][completionWithRetry]: ${error.message}`);
//     throw error;
//   }
//   const responseChunks = [];
//   let accumulatedResponse = {};
//   const sendJSON = (data) => {
//     res.write(`data: ${JSON.stringify(data)}\n\n`);
//   };
//   const liveLogResponse = () => {
//     logger.info("Accumulated Response:", JSON.stringify(accumulatedResponse, null, 2));
//   };
//   try {
//     if (result && result[Symbol.asyncIterator]) {
//       for await (const chunk of result) {
//         liveLogResponse()
//         const { content = "" } = chunk.choices[0]?.delta || {};
//         responseChunks.push(content);
//         res.write(`data: ${JSON.stringify({ content })}\n\n`);
//         res.flush();
//       }
//     } else {
//       logger.error("Invalid result from completionWithRetry");
//       throw new Error("Invalid response stream");
//     }

//     const fullResponse = responseChunks.join("");
//     // if (fullResponse.usage) {
//     //   const { prompt_tokens, completion_tokens, total_tokens } = fullResponse.usage;
//     //   recordTokenUsage(prompt_tokens, completion_tokens, total_tokens);
//     // } else {
//     //   logger.warn("Token usage data not available in the response.");
//     // }
//     await saveChatCompletion(initializationData, chatSession, fullResponse);
//     await processChatCompletion(chatSession, fullResponse, sessionContextStore, initializationData);

//     return fullResponse;
//   } catch (error) {
//     const chatData = { chatSession, userMessageDoc, messages };
//     logChatDataError("handleStreamingResponse", chatData, error);
//     throw error;
//   } finally {
//     res.write(`data: ${JSON.stringify({ content: DONE_MESSAGE })}\n\n`);
//     res.end();
//   }
// };
