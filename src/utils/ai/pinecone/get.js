const { logger } = require("@config/logging");
const { getEnv } = require("@utils/processing/api");
const { logArrayAsTable } = require("@utils/processing/utils/loggingFunctions");
const { Pinecone } = require("@pinecone-database/pinecone");

const clients = {
  pinecone: null
};

const getPineconeClient = async () => {
  let client;
  if (!clients.pinecone) {
    client = new Pinecone({
      apiKey: getEnv("PINECONE_API_KEY")
    });
    logger.info("[PINECONE] Pinecone initialize created");
    clients.pinecone = client;
  } else {
    client = clients.pinecone;
    console.log("Reusing Pinecone client");
  }
  return client;
  // return new Pinecone({
  //   apiKey: getEnv('PINECONE_API_KEY'),
  // });
};
const getPineconeIndexList = async (index) => {
  const indexList = await index.listIndexes();
  return indexList;
};

const getPineconeIndexListNames = async (pinecone) => {
  try {
    // List all indexes
    const indexList = await pinecone.listIndexes();

    // Get names and stats for each index
    const indexPromises = indexList.map(async (index) => {
      try {
        const stats = await index.describeIndexStats();
        return {
          name: index.name,
          dimension: stats.dimension,
          indexFullness: stats.indexFullness,
          totalVectorCount: stats.totalVectorCount
        };
      } catch (error) {
        console.error(`Error describing index stats for ${index.name}: ${error}`);
        return { name: index.name, error: error.message };
      }
    });

    // Wait for all promises to resolve
    const indexDetails = await Promise.all(indexPromises);

    console.log("Index Details:");
    console.table(indexDetails);

    // Return just the names if needed
    const indexNames = indexDetails.map((index) => index.name);
    return indexNames;
  } catch (error) {
    console.error(`Error listing indexes: ${error}`);
    return [];
  }
};
const getPineconeNamespaceList = async (pinecone, indexList) => {
  const namespaceList = [];
  for (const indexName of indexList) {
    const index = pinecone.Index(indexName);
    const namespaces = await getIndexNamespaceList(index);
    console.log(`Namespaces for index '${indexName}':`);
    logArrayAsTable(
      namespaces.length > 0 ? namespaces.map((ns) => ({ namespace: ns })) : [{ namespace: "None" }]
    );
    console.log();
  }
  return namespaceList;
};

async function getIndexNamespaceList(index) {
  const stats = await index.describeIndexStats();
  const namespaces = Object.keys(stats.namespaces);
  return namespaces;
}

module.exports = {
  getPineconeClient,
  getPineconeIndexList,
  getPineconeNamespaceList,
  getIndexNamespaceList,
  getPineconeIndexListNames
};
