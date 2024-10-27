const { logger } = require("@config/logging");
const { getEnv } = require("@utils/processing/api");

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
        await new Promise((resolve) => setTimeout(resolve, 60000));
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
    logger.error("Error in streamWithCompletion:", error);
    throw error;
  }
};
module.exports = {
  createPineconeIndex
};
// const { logger } = require('@config/logging');
// const { getEnv } = require('@utils/api');
// const { getPineconeIndexListNames } = require('./get');
// // const { getPineconeClient } = require('./get');
// const createPineconeIndex = async (pinecone, indexName) => {
//   logger.info(`Checking "${indexName}"...`);
//   try {
//     const indexNames = await getPineconeIndexListNames(pinecone);
//     // const indexList = await getPineconeIndexList(pinecone);
//     // await getIndexNamespaceList(pinecone, indexList);
//     const index = pinecone.Index(indexName);
//     if (!indexNames.includes(indexName)) {
//       try {
//         await pinecone.createIndex({
//           name: indexName,
//           dimensions: getEnv('PINECONE_EMBEDDING_MODEL_DIMENSIONS'),
//           spec: {
//             serverless: {
//               cloud: getEnv('PINECONE_CLOUD'),
//               region: getEnv('PINECONE_REGION'),
//             },
//           },
//           waitUntilReady: true,
//         });
//         await new Promise((resolve) => setTimeout(resolve, 60000));
//         logger.info(`Index ${indexName} created successfully.`);
//       } catch (error) {
//         logger.error('Error in creating index:', error);
//         throw error;
//       }
//     } else {
//       logger.info(`Index ${indexName} found.`);
//     }
//     const indexInfo = await index.describeIndexStats();
//     logger.info(`Index info: ${JSON.stringify(indexInfo)}`);
//     return index;
//   } catch (error) {
//     logger.error('Error in createPineconeIndex:', error);
//     throw error;
//   }
// };
// module.exports = {
//   createPineconeIndex,
// };
