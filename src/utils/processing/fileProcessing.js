/* eslint-disable no-unused-vars */
const {
  processCSV,
  processDocX,
  processJSON,
  processMarkdown,
  processPdf,
  processTxt,
  processJSX
} = require("./types");
const fs = require("node:fs/promises");
const path = require("path");
const { DirectoryLoader } = require("langchain/document_loaders/fs/directory");
const { TextLoader } = require("langchain/document_loaders/fs/text");
const { PDFLoader } = require("langchain/document_loaders/fs/pdf");
const { CSVLoader } = require("langchain/document_loaders/fs/csv");
const { DocxLoader } = require("langchain/document_loaders/fs/docx");
const { JSONLoader } = require("langchain/document_loaders/fs/json");
const { MarkdownLoader } = require("langchain/document_loaders/fs/markdown");
const { logger } = require("@config/logging");

const PUBLIC_FILE_DIR = path.join(__dirname, "@/public/");

const loadDocuments = async (filePaths) => {
  const loader = new DirectoryLoader(PUBLIC_FILE_DIR, {
    ".txt": (path) => new TextLoader(path),
    ".pdf": (path) => new PDFLoader(path),
    ".csv": (path) => new CSVLoader(path),
    ".docx": (path) => new DocxLoader(path),
    ".json": (path) => new JSONLoader(path),
    ".md": (path) => new MarkdownLoader(path)
  });

  try {
    const documents = await Promise.all(
      filePaths.map(async (filePath) => {
        const content = await fs.readFile(filePath, "utf8");
        return {
          pageContent: content,
          metadata: { source: filePath }
        };
      })
    );
    return documents;
  } catch (error) {
    logger.error("Error loading documents:", error);
    throw error;
  }
};

const processDocument = async (doc) => {
  const extension = path.extname(doc.metadata.source).slice(1).toLowerCase();
  const processors = {
    csv: processCSV,
    docx: processDocX,
    json: processJSON,
    md: processMarkdown,
    pdf: processPdf,
    txt: processTxt,
    jsx: processJSX
  };

  const processor = processors[extension];
  if (processor) {
    return processor(doc.pageContent);
  } else {
    throw new Error(`Unsupported file type: ${extension}`);
  }
};

export async function processCodeFile(filePath) {
  try {
    console.log(filePath);

    // Extract code blocks
    const codeBlocks = extractCodeElements(filePath);

    // Generate embeddings
    const embeddedCodeBlocks = await processAndUpdateDictionary(codeBlocks);
    console.log(embeddedCodeBlocks);
    // writeToCsv(codeBlocks, './output.csv');

    // Upsert the embeddings into Pinecone
    await pinecone.upsertEmbeddings(embeddedCodeBlocks);
    console.log('Embeddings upserted to Pinecone.');

    // Optionally check the index stats
    // await pinecone.checkIndex();

  } catch (error) {
    console.error('Error processing file:', error);
  }
}

module.exports = { loadDocuments, processDocument };
