const fs = require('fs');
const path = require('path');
const { PineconeStore } = require('@langchain/pinecone');
const { OpenAIEmbeddings } = require('@langchain/openai');
const { RecursiveCharacterTextSplitter } = require('langchain/text_splitter');
const { getPineconeClient } = require('./get');
const { scrapeCode } = require('@/utils/processing/utils');
const { logger } = require('@/config/logging');
const { File } = require('@/models');
const { getEnv } = require('@/utils/api');

const upsertDocs = async (req, res) => {
  // eslint-disable-next-line no-unused-vars
  const { url, library, description, folderId, workspaceId } = req.body;

  try {
    // Validate input
    if (!url || !library) {
      throw new Error('URL and library are required fields.');
    }

    logger.info(`BODY: ${JSON.stringify(req.body)}`);

    // Scrape content
    let scrapedFiles;
    try {
      scrapedFiles = await scrapeCode(url, library);
    } catch (error) {
      throw new Error('Failed to scrape content: ' + error.message);
    }
    // let content;
    // try {
    //   content = await scrapeContent(url);
    // } catch (error) {
    //   throw new Error('Failed to scrape content: ' + error.message);
    // }

    // Define file path and name
    // const fileName = `${library}_scraped_${Date.now()}.txt`;
    // const filePath = path.join(__dirname, '../../../../public/uploads', fileName);

    // // Write the scraped content to a file
    // try {
    //   fs.writeFileSync(filePath, content, 'utf8');
    //   logger.info(`Content saved to ${filePath}`);
    // } catch (error) {
    //   throw new Error('Failed to write file: ' + error.message);
    // }
    for (const filePath of scrapedFiles) {
      // Get file stats
      let fileStats;
      try {
        fileStats = fs.statSync(filePath);
      } catch (error) {
        throw new Error('Failed to get file stats: ' + error.message);
      }
      const fileName = path.basename(filePath);
      const fileType = path.extname(fileName).slice(1);

      // Save file information to MongoDB
      try {
        const newFile = new File({
          userId: req.userId,
          workspaceId: workspaceId,
          folderId: folderId,
          name: fileName,
          size: fileStats.size,
          originalFileType: fileType,
          filePath: filePath,
          type: fileType,
          metadata: {
            fileSize: fileStats.size,
            fileType: fileType,
            lastModified: fileStats.mtime,
          },
        });
        logger.info('Creating new file entry in MongoDB...');
        await newFile.save();
        logger.info(`File information saved to MongoDB for ${fileName}`);
      } catch (error) {
        throw new Error('Failed to save file information to MongoDB: ' + error.message);
      }
    }
    // Initialize OpenAI embeddings
    let embedder;
    try {
      embedder = new OpenAIEmbeddings({
        modelName: 'text-embedding-3-small',
        apiKey: process.env.OPENAI_API_PROJECT_KEY,
        dimensions: 512,
      });
    } catch (error) {
      throw new Error('Failed to initialize OpenAI embeddings: ' + error.message);
    }

    // Get Pinecone client and index
    let pinecone, pineconeIndex;
    try {
      pinecone = await getPineconeClient();
      pineconeIndex = await pinecone.Index(process.env.PINECONE_INDEX);
    } catch (error) {
      throw new Error('Failed to get Pinecone client or index: ' + error.message);
    }
    // let pinecone;
    // try {
    //   pinecone = await getPineconeClient();
    // } catch (error) {
    //   throw new Error('Failed to get Pinecone client: ' + error.message);
    // }

    // // Get Pinecone index
    // let pineconeIndex;
    // try {
    //   pineconeIndex = await pinecone.Index(process.env.PINECONE_INDEX);
    // } catch (error) {
    //   throw new Error('Failed to get Pinecone index: ' + error.message);
    // }

    // Create Pinecone store
    let vstore;
    try {
      vstore = await PineconeStore.fromExistingIndex(embedder, {
        pineconeIndex,
        namespace: getEnv('PINECONE_NAMESPACE_1'),
        textKey: 'text',
      });
    } catch (error) {
      logger.error(`Error creating Pinecone store: ${error}`, error);
      throw new Error('Failed to create Pinecone store: ' + error.message);
    }

    // Split text into documents
    // Process and upsert documents
    let totalDocs = 0;
    for (const filePath of scrapedFiles) {
      const content = fs.readFileSync(filePath, 'utf8');
      const fileName = path.basename(filePath);

      // Split text into documents
      let docs;
      try {
        const textSplitter = new RecursiveCharacterTextSplitter({
          chunkSize: 1000,
          chunkOverlap: 200,
        });
        docs = await textSplitter.createDocuments(
          [content],
          [{ source: `${library}/${fileName}` }]
        );
      } catch (error) {
        logger.error(`Error splitting text into documents for ${fileName}: ${error}`, error);
        throw new Error(`Failed to split text into documents for ${fileName}: ${error.message}`);
      }

      // Upsert documents into Pinecone
      try {
        logger.info(`Upserting ${docs.length} chunks from ${fileName}...`);
        await vstore.addDocuments(docs);
        totalDocs += docs.length;
      } catch (error) {
        logger.error(`Error upserting documents into Pinecone for ${fileName}: ${error}`, error);
        throw new Error(
          `Failed to upsert documents into Pinecone for ${fileName}: ${error.message}`
        );
      }
    }

    // let docs;
    // try {
    //   const textSplitter = new RecursiveCharacterTextSplitter({
    //     chunkSize: 1000,
    //     chunkOverlap: 200,
    //   });
    //   docs = await textSplitter.createDocuments([content], [{ source: library }]);
    // } catch (error) {
    //   throw new Error('Failed to split text into documents: ' + error.message);
    // }

    // // Upsert documents into Pinecone
    // try {
    //   logger.info(`Upserting ${docs.length} chunks from ${url}...`);
    //   await vstore.addDocuments(docs);
    // } catch (error) {
    //   throw new Error('Failed to upsert documents into Pinecone: ' + error.message);
    // }

    // Check index
    try {
      const stats = await pineconeIndex.describeIndexStats();
      logger.info(stats);
    } catch (error) {
      logger.error(`Error checking Pinecone index: ${error}`, error);
      throw new Error('Failed to check Pinecone index: ' + error.message);
    }

    res.status(200).send(`Successfully upserted ${totalDocs} documents from ${url}`);
  } catch (error) {
    logger.error(`Error upserting documentation: ${error}`, error);
    res.status(500).send('Error upserting documentation: ' + error.message);
  }
};

module.exports = { upsertDocs };
