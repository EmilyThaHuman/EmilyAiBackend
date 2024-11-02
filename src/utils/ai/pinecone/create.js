const { logger } = require("@config/logging");
const { getEnv } = require("@utils/processing/api");

/**
 * Creates a Pinecone index if it doesn't already exist.
 *
 * @param {Object} pinecone - The Pinecone client instance.
 * @param {string} indexName - The name of the Pinecone index to create.
 * @returns {Promise<Object>} - The Pinecone index instance.
 */
const createPineconeIndex = async (pinecone, indexName) => {
  logger.info(`Checking "${indexName}"...`);
  try {
    const indexList = await pinecone.listIndexes();
    const index = pinecone.Index(indexName);
    const indexCloud = getEnv("PINECONE_CLOUD");
    const indexRegion = getEnv("PINECONE_REGION");
    const indexNames = indexList.indexes.map((index) => index.name);
    logger.info(`Index names: ${indexNames}`);
    if (!indexNames.includes(indexName)) {
      try {
        await pinecone.createIndex({
          name: indexName,
          dimensions: getEnv("PINECONE_EMBEDDING_MODEL_DIMENSIONS"),
          spec: {
            serverless: {
              cloud: indexCloud,
              region: indexRegion
            }
          },
          waitUntilReady: true
        });
        // Replace setTimeout with a more efficient readiness check
        await pinecone.waitForIndexReady(indexName);
        logger.info(`Index ${indexName} created successfully.`);
      } catch (error) {
        logger.error("Error in creating index:", error);
        throw error;
      }
    } else {
      logger.info(`Index ${indexName} found.`);
    }
    return index;
  } catch (error) {
    logger.error("Error in createPineconeIndex:", error);
    throw error;
  }
};

module.exports = {
  createPineconeIndex
};
