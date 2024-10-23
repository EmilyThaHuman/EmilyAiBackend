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
const { checkApiKey } = require("@utils/api");
const { getEnv, handleChatError } = require("@utils/api");
const {
  identifyLibrariesAndComponents,
  getDocumentationUrl,
  scrapeDocumentation
} = require("../../shared");
const {
  prepareDocuments,
  formatDocumentation,
  createFormattedPrompt,
  logChatData,
  textSplitter,
  logChatDataError,
  DONE_MESSAGE,
  setupResponseHeaders,
  getInitializationData,
  generateUniqueFileName,
  getPublicFilePath,
  formatChatPromptBuild,
  formatChatCompletionContent,
  writeToFile,
  handleFileStreaming,
  extractContent
} = require("./chat_helpers");
const { addMessageToSession, getSessionHistory } = require("./chat_history");
const { ChatSession } = require("@models/chat");
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
function liveStreamLogger(markdown) {
  // Clear previous log and print updated markdown
  process.stdout.write("\x1b");
  console.log(markdown);
}
const createNewSession = async (defaultData) => {
  if (!defaultData.userId || !defaultData.workspaceId) {
    return res.status(400).json({ message: "Missing required parameters." });
  }
  const { userId, workspaceId, sessionId, regenerate, prompt, clientApiKey } = defaultData;
  try {
    // Create a new chat session
    const newChat = await ChatSession.create({
      userId,
      workspaceId,
      sessionId: sessionId || generateObjectId(),
      regenerate,
      prompt,
      clientApiKey,
      title: prompt,
      name: prompt,
      status: "active",
      messages: [],
      path: `/chat/${sessionId}`
    });

    // save
    await newChat.save();

    // update with system/assistant instructions
    const systemPrompt = getMainSystemMessageContent();
    const assistantInstructions = getMainAssistantMessageInstructions();
    await newChat.addSystemPrompt(newChat._id, systemPrompt);
    await newChat.addAssistantMessage(newChat._id, assistantInstructions);

    // push refId to user and workspace chatSessions arrays
    await newChat.updateUserAndWorkspaceChatSessions(newChat._id);

    res.status(201).json({ chatSession: newChat });
  } catch (error) {
    logger.error("Error creating chat session:", error.message);
    res.status(500).json({ message: "Failed to create chat session." });
  }
};
const combinedChatStream = async (req, res) => {
  let initializationData;
  if (req.body.newSession) {
    const defaultData = (initializationData = getInitializationData(req.body));
    const newSession = await createNewSession(defaultData);
    initializationData = {
      ...defaultData,
      sessionId: newSession._id
    };
  } else {
    initializationData = getInitializationData(req.body);
  }
  if (initializationData.streamType === "file") {
    return handleFileStreaming(req, res);
  }
  try {
    setupResponseHeaders(res);
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
      initializationData.completionModel,
      chatSession
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
    // const userMessageDoc = await addMessage(chatSession, {
    //   userId: initializationData.userId,
    //   workspaceId: initializationData.workspaceId,
    //   sessionId: chatSession._id,
    //   role: 'user',
    //   content: initializationData.prompt,
    //   metadata: {
    //     createdAt: Date.now(),
    //     updatedAt: Date.now(),
    //     sessionId: chatSession._id,
    //   },
    // });
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
      chatOpenAI,
      formattedPrompt,
      chatSession,
      userMessageDoc,
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
  chatOpenAI,
  formattedPrompt,
  chatSession,
  userMessageDoc,
  sessionContextStore,
  initializationData,
  messages
) => {
  const DONE_MESSAGE = "DONE"; // Define DONE_MESSAGE if not already defined
  const sendData = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    // Initiate the streaming request to OpenAI
    const resultStream = await chatOpenAI.completionWithRetry({
      model: getEnv("OPENAI_API_CHAT_COMPLETION_MODEL"),
      messages: [
        { role: "system", content: getMainSystemMessageContent() },
        { role: "assistant", content: getMainAssistantMessageInstructions() },
        { role: "user", content: formattedPrompt }
      ],
      stream: true,
      // streamUsage: true,
      temperature: 0.2,
      tools: [
        {
          type: "function",
          function: {
            name: "generateResponse",
            strict: true,
            parameters: {
              type: "object",
              required: ["content", "metadata"],
              properties: {
                content: {
                  type: "string",
                  description: "The content of the response."
                },
                metadata: {
                  type: "object",
                  required: ["timestamp", "responseLength"],
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
                  additionalProperties: false
                }
              },
              additionalProperties: false
            },
            description: "Generates a response based on user input."
          }
        }
      ],
      parallel_tool_calls: true,
      response_format: {
        type: "json_object"
      }
    });
    let fullResponse = "";
    // let usageInfo = {};
    const liveLogResponse = () => {
      logger.info("Accumulated Response:", fullResponse);
    };
    for await (const chunk of resultStream) {
      const chunkString = chunk.toString();
      accumulatedResponse += chunkString;

      // Handle each chunk carefully
      try {
        const parsedChunk = JSON.parse(chunkString);
        logger.info("Parsed Chunk:", parsedChunk);

        if (parsedChunk.choices && parsedChunk.choices.length > 0) {
          const choice = parsedChunk.choices[0];
          logger.info("CHOICE:", choice);

          if (choice.message) {
            const content = choice.message.content || "";
            sendData({ type: "message", content });
          }

          if (choice.function_call) {
            const { name, arguments: args } = choice.function_call;
            const responseData = JSON.parse(args);
            sendData({ type: "function_call", name, arguments: responseData });
          }
        }
      } catch (error) {
        // Log the error without crashing
        logger.error(`Error parsing chunk: ${error.message}, chunk: ${chunkString}`);
        // Optionally, continue with partial content
        continue;
      }
    }

    await saveChatCompletion(initializationData, chatSession, fullResponse);
    await processChatCompletion(chatSession, fullResponse, sessionContextStore, initializationData);

    // Send the DONE message and end the response
    sendData({ type: "end", message: DONE_MESSAGE });
    res.end();
  } catch (error) {
    logger.error(`[ERROR][handleStreamingResponse]: ${error.message}`);
    sendData({ type: "error", message: error.message });
    res.end();
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
  await fs.writeFile(filePath, responseText);

  try {
    const content = extractContent(fullResponse);
    let formattedContent = formatDocumentation(content);
    const chatCompletionContent = formatChatCompletionContent(formattedContent);
    await writeToFile(filePath, chatCompletionContent);

    try {
      const assistantMessageDoc = await addMessageToSession(chatSession, {
        role: "assistant",
        content: content,
        code: formattedContent,
        userId: initializationData.userId,
        workspaceId: initializationData.workspaceId,
        sessionId: chatSession._id,
        metadata: {
          createdAt: Date.now(),
          updatedAt: Date.now(),
          sessionId: chatSession._id
        }
      });
      logChatData("assistantMessageDoc", assistantMessageDoc);
      await chatSession.calculateTokenUsage();
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
