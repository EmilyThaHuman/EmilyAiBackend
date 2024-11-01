const { logger } = require("@config/logging");
const { PineconeStore } = require("@langchain/pinecone");
const { extractKeywords } = require("./context");
const { identifyLibrariesAndComponents } = require("../../shared");
const { createPineconeIndex } = require("@utils/ai/pinecone");

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
    const relevantSearchResults = await searchContextStore.similaritySearch(prompt, 2);
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
    return { keywords, uiLibraries, jsLibraries, componentTypes };
  } catch (error) {
    logger.error(`[ERROR][extractAdditionalInfo]: ${error.message}`);
    throw error;
  }
};

module.exports = {
  getRelevantContext,
  extractAdditionalInfo,
  setupVectorStores
};
