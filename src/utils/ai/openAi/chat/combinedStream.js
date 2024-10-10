/* eslint-disable no-useless-escape */
/* eslint-disable no-unused-vars */
const fs = require("fs");
const path = require("path");
const { PineconeStore } = require("@langchain/pinecone");
const { logger } = require("@config/logging");
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
const { checkApiKey } = require("@utils/auth");
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
const { recordTokenUsage } = require("@utils/processing/utils/loggingFunctions");

const combinedChatStream = async (req, res) => {
  const initializationData = getInitializationData(req.body);
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
    let result;
    try {
      result = await chatOpenAI.completionWithRetry({
        model: getEnv("OPENAI_API_CHAT_COMPLETION_MODEL"),
        messages: [
          { role: "system", content: getMainSystemMessageContent() },
          { role: "assistant", content: getMainAssistantMessageInstructions() },
          { role: "user", content: formattedPrompt }
        ],
        stream: true,
        response_format: { type: "json_object" },
        temperature: 0.2
      });
    } catch (error) {
      logger.error(`[ERROR][completionWithRetry]: ${error.message}`);
      throw error;
    }
    await handleStreamingResponse(
      res,
      result,
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
  result,
  chatSession,
  userMessageDoc,
  sessionContextStore,
  initializationData,
  messages
) => {
  const responseChunks = [];

  try {
    for await (const chunk of result) {
      const { content = "" } = chunk.choices[0]?.delta || {};
      responseChunks.push(content);
      res.write(`data: ${JSON.stringify({ content })}\n\n`);
      res.flush();
    }

    const fullResponse = responseChunks.join("");
    recordTokenUsage(await fullResponse.usage);

    await processChatCompletion(chatSession, fullResponse, sessionContextStore, initializationData);

    return fullResponse;
  } catch (error) {
    const chatData = { chatSession, userMessageDoc, messages };
    logChatDataError("handleStreamingResponse", chatData, error);
    // logger.error(`[ERROR][handleStreamingResponse]: ${error.message}`);
    throw error;
  } finally {
    res.write(`data: ${JSON.stringify({ content: DONE_MESSAGE })}\n\n`);
    res.end();
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
    logger.error(`Error saving prompt build: ${error}`);
  }
}
async function saveChatCompletion(initializationData, chatSession, fullResponse) {
  const fileName = generateUniqueFileName("chat-completion");
  const filePath = getPublicFilePath(fileName);

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
      logger.error(`Error saving assistant message: ${error}`);
      throw error;
    }
  } catch (error) {
    logger.error(`Error saving chat completion: ${error}`);
  }
}

module.exports = { combinedChatStream };
