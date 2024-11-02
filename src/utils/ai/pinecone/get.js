const { logger } = require("@config/logging");
const { getEnv } = require("@utils/processing/api");
const { logArrayAsTable } = require("@utils/processing/utils/loggingFunctions");
const { Pinecone } = require("@pinecone-database/pinecone");
// import { ScoredPineconeRecord } from "@pinecone-database/pinecone";
// import { Metadata, getMatchesFromEmbeddings } from "./pinecone";
// import { embedChunks } from "./embeddings";
// const clients = {
//   pinecone: null
// };

// Create a new Pinecone client
const pc = new Pinecone({
  apiKey: getEnv("PINECONE_API_KEY"),
});

// Create a new Pinecone client
const getPineconeClient = async () => {
  return pc;
};
// Get a Pinecone index
const getPineconeIndex = async (indexName) => {
  const index = pc.Index(indexName);
  return index;
};
// Get all client names
const getPineconeClientIndexes = async () => {
  const clientNames = await pc.listIndexes();
  return clientNames;
};
// Get a Pinecone index list
const getPineconeIndexList = async (index) => {
  const indexList = await index.listIndexes();
  return indexList;
};
// Get a Pinecone index description
const getPineconeIndexDescription = async (indexName) => {
  const indexDescription = await pc.describeIndex(indexName);
  return indexDescription;
};
// Get a Pinecone collection list
const getPineconeCollectionList = async (index) => {
  const collectionList = await index.listCollections();
  return collectionList;
};
// Get a Pinecone collection desc
const getPineconeCollectionDescription = async (index, collectionName) => {
  const collectionDescription = await index.describeCollection(collectionName);
  return collectionDescription;
};
// Get a Pinecone namespace list
const getIndexNamesList = async () => {
  const indexNames = await pc.listIndexes();
  const indexNamesList = indexNames.map((index) => index.name);
  return indexNamesList;
};

const getDataFieldValues = (data, dataFieldName) => {
  return data.indexes.map((index) => index[dataFieldName]);
};

module.exports = {
  getPineconeClient,
  getPineconeClientIndexes,
  getPineconeIndex,
  getPineconeIndexList,
  getPineconeIndexDescription,
  getPineconeCollectionList,
  getPineconeCollectionDescription,
  getIndexNamesList,
  getDataFieldValues
};

// const getPineconeIndexListNames = async (pinecone) => {
//   try {
//     // List all indexes
//     const indexList = await pinecone.listIndexes();

//     // Get names and stats for each index
//     const indexPromises = indexList.map(async (index) => {
//       try {
//         const stats = await index.describeIndexStats();
//         return {
//           name: index.name,
//           dimension: stats.dimension,
//           indexFullness: stats.indexFullness,
//           totalVectorCount: stats.totalVectorCount
//         };
//       } catch (error) {
//         console.error(`Error describing index stats for ${index.name}: ${error}`);
//         return { name: index.name, error: error.message };
//       }
//     });

//     // Wait for all promises to resolve
//     const indexDetails = await Promise.all(indexPromises);

//     console.log("Index Details:");
//     console.table(indexDetails);

//     // Return just the names if needed
//     const indexNames = indexDetails.map((index) => index.name);
//     return indexNames;
//   } catch (error) {
//     console.error(`Error listing indexes: ${error}`);
//     return [];
//   }
// };
// const getPineconeNamespaceList = async (pinecone, indexList) => {
//   const namespaceList = [];
//   for (const indexName of indexList) {
//     const index = pinecone.Index(indexName);
//     const namespaces = await getIndexNamespaceList(index);
//     console.log(`Namespaces for index '${indexName}':`);
//     logArrayAsTable(
//       namespaces.length > 0 ? namespaces.map((ns) => ({ namespace: ns })) : [{ namespace: "None" }]
//     );
//     console.log();
//   }
//   return namespaceList;
// };

// async function getIndexNamespaceList(index) {
//   const stats = await index.describeIndexStats();
//   const namespaces = Object.keys(stats.namespaces);
//   return namespaces;
// }

// // The function `getContext` is used to retrieve the context of a given message
// import { embedChunks } from "./embeddings";

// // The function `getContext` is used to retrieve the context of a given message
// const getContext = async (
//   message,
//   namespace,
//   maxCharacters = 5000,
//   minScore = 0.15,
//   getOnlyText = true
// ) => {
//   try {
//     // Wrap the message in an array before passing it to embedChunks
//     const embeddings = await embedChunks([message]);

//     // Extract the embedding from the response
//     const embedding = embeddings[0].embedding;

//     const matches = await getMatchesFromEmbeddings(embedding, 15, namespace);
//     const qualifyingDocs = matches.filter((m) => m.score && m.score > minScore);

//     if (!getOnlyText) {
//       return qualifyingDocs;
//     }

//     // Deduplicate and get text
//     const documentTexts = qualifyingDocs.map((match) => {
//       const metadata = match.metadata;
//       return `REFERENCE URL: ${metadata.referenceURL} CONTENT: ${metadata.text}`;
//     });

//     // Concatenate, then truncate by maxCharacters
//     const concatenatedDocs = documentTexts.join(" ");
//     return concatenatedDocs.length > maxCharacters
//       ? concatenatedDocs.substring(0, maxCharacters)
//       : concatenatedDocs;
//   } catch (error) {
//     console.error("Failed to get context:", error);
//     throw error;
//   }
// };
