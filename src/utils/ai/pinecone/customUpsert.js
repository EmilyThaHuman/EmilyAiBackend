const fs = require('fs').promises;
const path = require('path');
const { PineconeStore } = require('@langchain/pinecone');
const { OpenAIEmbeddings } = require('@langchain/openai');
const { RecursiveCharacterTextSplitter } = require('langchain/text_splitter');
const { getPineconeClient } = require('./get');
const { scrapeCode } = require('@/utils/processing/utils');
const { logger } = require('@/config/logging');
const { File } = require('@/models');
const { getEnv } = require('@/utils/api');
const { createPineconeIndex } = require('./create');
const {
  detectLanguage,
  detectComponentType,
  detectLibraryVersion,
  calculateComplexity,
  detectDependencies,
  detectLicense,
  detectFunctionality,
  safeExecute,
} = require('./utils');

const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 200;
const CONCURRENCY = 5;

const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: CHUNK_SIZE,
  chunkOverlap: CHUNK_OVERLAP,
  lengthFunction: (text) => text.length,
  separators: ['\n\n', '\n', '. ', ', ', ' ', ''],
});

const upsertDocs = async (req, res) => {
  const { url, library, description, userId, folderId, workspaceId } = req.body;

  try {
    if (!userId || !url || !library) {
      throw new Error('User ID, URL, and library are required fields.');
    }

    logger.info(`BODY: ${JSON.stringify(req.body)}`);

    const scrapedFiles = await scrapeCode(url, library);

    // Optimization 1: Use a single connection for all MongoDB operations
    await File.bulkWrite(
      scrapedFiles.map((filePath) => ({
        insertOne: {
          document: createFileDocument(filePath, userId, workspaceId, folderId),
        },
      }))
    );
    // const session = await File.startSession();
    // await session.withTransaction(async () => {
    //   await Promise.all(
    //     scrapedFiles.map((file) => saveFileInfo(file, userId, workspaceId, folderId))
    //   );
    // });
    // session.endSession();

    const embedder = new OpenAIEmbeddings({
      modelName: getEnv('PINECONE_EMBEDDING_MODEL_NAME'),
      apiKey: getEnv('OPENAI_API_PROJECT_KEY'),
      dimensions: getEnv('PINECONE_EMBEDDING_MODEL_DIMENSIONS'),
    });

    const pinecone = await getPineconeClient();
    const pineconeIndex = await createPineconeIndex(pinecone, getEnv('PINECONE_INDEX'));

    const vstore = await PineconeStore.fromExistingIndex(embedder, {
      pineconeIndex,
      namespace: getEnv('PINECONE_NAMESPACE_3'),
      textKey: 'text',
    });

    // let totalDocs = 0;

    const totalDocs = await processFilesInParallel(scrapedFiles, vstore, library, url, description);

    const stats = await pineconeIndex.describeIndexStats();
    logger.info(`Pinecone index stats: ${JSON.stringify(stats)}`);

    res.status(200).send(`Successfully upserted ${totalDocs} documents from ${url}`);
  } catch (error) {
    logger.error(`Error upserting documentation: ${error}`, error);
    res.status(500).send('Error upserting documentation: ' + error.message);
  }
};
function createFileDocument(filePath, userId, workspaceId, folderId) {
  const fileStats = fs.stat(filePath);
  const fileName = path.basename(filePath);
  const fileType = path.extname(fileName).slice(1);

  return {
    userId,
    workspaceId,
    folderId,
    name: fileName,
    size: fileStats.size,
    originalFileType: fileType,
    filePath,
    type: fileType,
    space: 'files',
    metadata: {
      fileSize: fileStats.size,
      fileType,
      lastModified: fileStats.mtime,
    },
  };
}
async function processFilesInParallel(files, vstore, library, url, description) {
  let processedDocs = 0;

  for (let i = 0; i < files.length; i += CONCURRENCY) {
    const batch = files.slice(i, i + CONCURRENCY);
    const results = await Promise.all(
      batch.map((file) => processFile(file, vstore, library, url, description))
    );
    processedDocs += results.reduce((sum, count) => sum + count, 0);
  }

  return processedDocs;
}

async function processFile(filePath, vstore, library, url, description) {
  const { content, fileName } = await readFileContent(filePath);
  const docs = await createDocuments(content, fileName, library);

  logger.info(`Processing ${docs.length} chunks from ${fileName}...`);

  await upsertDocuments(vstore, docs, fileName, content, url, description, library);

  return docs.length;
}

async function readFileContent(filePath) {
  const content = await fs.readFile(filePath, 'utf8');
  if (!content) {
    throw new Error(`File ${filePath} is empty or could not be read`);
  }
  const fileName = path.basename(filePath);
  return { content, fileName };
}

async function createDocuments(content, fileName, library) {
  try {
    return await textSplitter.createDocuments([content], [{ source: `${library}/${fileName}` }]);
  } catch (error) {
    logger.error(`Error creating documents for ${fileName}: ${error.message}`);
    return [];
  }
}

async function upsertDocuments(vstore, docs, fileName, content, url, description, library) {
  try {
    const metadata = createMetadata(content, fileName, url, description, library);
    const upsertBatch = docs
      .map((doc, index) => {
        if (!doc.pageContent) {
          logger.warn(`Document ${index} in ${fileName} has no pageContent`);
          return null;
        }
        return {
          id: `${fileName}_${index}`,
          values: doc.pageContent,
          metadata: { ...metadata, ...doc.metadata },
        };
      })
      .filter(Boolean); // Remove any null entries

    if (upsertBatch.length === 0) {
      logger.warn(`No valid documents to upsert for ${fileName}`);
      return;
    }
    logger.info(`Upserting ${upsertBatch.length} documents...`);
    await vstore.addDocuments(upsertBatch);
    logger.info(`Upserted ${docs.length} chunks from ${fileName}`);
    logger.info(`Metadata: ${JSON.stringify(metadata)}`);
  } catch (error) {
    logger.error(`Error upserting documents for ${fileName}: ${error.message}`);
  }
}

function createMetadata(content, fileName, url, description, library) {
  return {
    language: safeExecute(() => detectLanguage(fileName), 'Unknown'),
    framework: library,
    componentType: safeExecute(() => detectComponentType(content), 'Unknown'),
    functionality: safeExecute(() => detectFunctionality(content), ['General']),
    libraryVersion: safeExecute(() => detectLibraryVersion(content), 'Unknown'),
    releaseDate: new Date().toISOString(),
    complexity: safeExecute(() => calculateComplexity(content), 'Unknown'),
    linesOfCode: content.split('\n').length,
    dependencies: safeExecute(() => detectDependencies(content), []),
    useCase: description || 'Not specified',
    performance: 'Not specified',
    author: 'Unknown',
    sourceUrl: url,
    license: safeExecute(() => detectLicense(content), 'Unknown'),
  };
}
module.exports = { upsertDocs };

// const fs = require('fs').promises;
// const path = require('path');
// const { PineconeStore } = require('@langchain/pinecone');
// const { OpenAIEmbeddings } = require('@langchain/openai');
// const { RecursiveCharacterTextSplitter } = require('langchain/text_splitter');
// const { getPineconeClient } = require('./get');
// const { scrapeCode } = require('@/utils/processing/utils');
// const { logger } = require('@/config/logging');
// const { File } = require('@/models');
// const { getEnv } = require('@/utils/api');
// const { createPineconeIndex } = require('./create');
// const {
//   detectLanguage,
//   detectComponentType,
//   detectLibraryVersion,
//   calculateComplexity,
//   detectDependencies,
//   detectLicense,
//   detectFunctionality,
//   safeExecute,
// } = require('./utils');

// const upsertDocs = async (req, res) => {
//   const { url, library, description, userId, folderId, workspaceId } = req.body;

//   try {
//     // Input validation
//     if (!userId) throw new Error('User ID is required.');
//     if (!url || !library) throw new Error('URL and library are required fields.');

//     logger.info(`BODY: ${JSON.stringify(req.body)}`);

//     const scrapedFiles = await scrapeCode(url, library);

//     // Save file information to MongoDB
//     await Promise.all(scrapedFiles.map(saveFileInfo));
//     // Optimization 1: Use a single connection for all MongoDB operations
//     // const session = await File.startSession();
//     // await session.withTransaction(async () => {
//     //   await Promise.all(
//     //     scrapedFiles.map((file) => saveFileInfo(file, userId, workspaceId, folderId))
//     //   );
//     // });
//     // session.endSession();
//     const embedder = new OpenAIEmbeddings({
//       modelName: getEnv('PINECONE_EMBEDDING_MODEL_NAME'),
//       apiKey: getEnv('OPENAI_API_PROJECT_KEY'),
//       dimensions: getEnv('PINECONE_EMBEDDING_DIMENSIONS'),
//     });

//     const pinecone = await getPineconeClient();
//     const pineconeIndex = await createPineconeIndex(pinecone, getEnv('PINECONE_INDEX'));

//     const vstore = await PineconeStore.fromExistingIndex(embedder, {
//       pineconeIndex,
//       namespace: getEnv('PINECONE_NAMESPACE_3'),
//       textKey: 'text',
//     });

//     const textSplitter = new RecursiveCharacterTextSplitter({
//       chunkSize: 1000,
//       chunkOverlap: 200,
//       lengthFunction: (text) => text.length,
//       separators: ['\n\n', '\n', '. ', ', ', ' ', ''],
//     });

//     let totalDocs = 0;
//     const batchSize = 100;

//     // Process and upsert documents
//     await Promise.all(
//       scrapedFiles.map(async (filePath) => {
//         const { content, fileName } = await readFileContent(filePath);
//         const docs = await createDocuments(content, fileName, library, textSplitter);

//         logger.info(`Upserting ${docs.length} chunks from ${fileName}...`);

//         await upsertDocuments(vstore, docs, fileName, content, url, description);

//         totalDocs += docs.length;
//       })
//     );

//     const stats = await pineconeIndex.describeIndexStats();
//     logger.info(`Pinecone index stats: ${JSON.stringify(stats)}`);

//     res.status(200).send(`Successfully upserted ${totalDocs} documents from ${url}`);
//   } catch (error) {
//     logger.error(`Error upserting documentation: ${error}`, error);
//     res.status(500).send('Error upserting documentation: ' + error.message);
//   }

//   async function saveFileInfo(filePath) {
//     const fileStats = await fs.stat(filePath);
//     const fileName = path.basename(filePath);
//     const fileType = path.extname(fileName).slice(1);

//     const newFile = new File({
//       userId,
//       workspaceId,
//       folderId,
//       name: fileName,
//       size: fileStats.size,
//       originalFileType: fileType,
//       filePath,
//       type: fileType,
//       space: 'files',
//       metadata: {
//         fileSize: fileStats.size,
//         fileType,
//         lastModified: fileStats.mtime,
//       },
//     });

//     await newFile.save();
//     logger.info(`File information saved to MongoDB for ${fileName}`);
//   }

//   async function readFileContent(filePath) {
//     const content = await fs.readFile(filePath, 'utf8');
//     const fileName = path.basename(filePath);
//     return { content, fileName };
//   }

//   async function createDocuments(content, fileName, library, textSplitter) {
//     return textSplitter.createDocuments([content], [{ source: `${library}/${fileName}` }]);
//   }

//   async function upsertDocuments(vstore, docs, fileName, content, url, description) {
//     const upsertPromises = docs.map(async (doc, index) => {
//       const metadata = createMetadata(content, fileName, url, description);
//       await vstore.addDocuments([doc], {
//         ids: [`${fileName}_${index}`],
//         namespace: getEnv('PINECONE_NAMESPACE_3'),
//         metadata: metadata,
//       });
//       logger.info(`Upserted chunk ${index} from ${fileName}`);
//       logger.info(`Metadata: ${JSON.stringify(metadata)}`);
//     });

//     await Promise.all(upsertPromises);
//     logger.info(`Upserted ${docs.length} chunks from ${fileName}`);
//   }

//   function createMetadata(content, fileName, url, description) {
//     return {
//       language: safeExecute(() => detectLanguage(fileName), 'Unknown'),
//       framework: library,
//       componentType: safeExecute(() => detectComponentType(content), 'Unknown'),
//       functionality: safeExecute(() => detectFunctionality(content), ['General']),
//       libraryVersion: safeExecute(() => detectLibraryVersion(content), 'Unknown'),
//       releaseDate: new Date().toISOString(),
//       complexity: safeExecute(() => calculateComplexity(content), 'Unknown'),
//       linesOfCode: content.split('\n').length,
//       dependencies: safeExecute(() => detectDependencies(content), []),
//       useCase: description || 'Not specified',
//       performance: 'Not specified',
//       author: 'Unknown',
//       sourceUrl: url,
//       license: safeExecute(() => detectLicense(content), 'Unknown'),
//     };
//   }
// };

// module.exports = { upsertDocs };
