const { logger } = require('@/config/logging');
const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const { RecursiveCharacterTextSplitter } = require('langchain/text_splitter');

const prepareDocuments = (initializationData, chatSession, content) => [
  {
    pageContent: initializationData.prompt,
    metadata: { chatId: chatSession._id.toString(), role: 'user' },
  },
  {
    pageContent: content,
    metadata: { chatId: chatSession._id.toString(), role: 'assistant' },
  },
];
const formatDocumentation = (content) => {
  try {
    // Split the content into sections
    const sections = content.split('\n\n');

    // Format each section
    const formattedSections = sections.map((section) => {
      // Check if the section is a code block
      if (section.startsWith('```')) {
        return section; // Keep code blocks as is
      }

      // Split the section into lines
      const lines = section.split('\n');

      // Format each line
      const formattedLines = lines.map((line) => {
        if (line.startsWith('# ')) {
          return `<h1>${line.slice(2)}</h1>`;
        } else if (line.startsWith('## ')) {
          return `<h2>${line.slice(3)}</h2>`;
        } else if (line.startsWith('### ')) {
          return `<h3>${line.slice(4)}</h3>`;
        } else {
          return `<p>${line}</p>`;
        }
      });

      return formattedLines.join('\n');
    });

    // Join the formatted sections
    return formattedSections.join('\n\n');
  } catch (error) {
    logger.error(`[ERROR][formatDocumentation]: ${error.message}`);
    throw error;
  }
};
const createFormattedPrompt = (
  initializationData,
  context,
  summary,
  searchResults,
  keywords,
  uiLibraries,
  jsLibraries,
  componentTypes,
  documentationContent,
  formattingGuide
) => `
  --- SECTION ONE: MAIN INSTRUCTIONS AND CONTEXT ---

  CHAT HISTORY CONTEXT:
    USER PROMPT HISTORY:
      | ________________________________________ 
      | User Prompts: ${context.sessionContext}
    SUMMARY OF CHAT HISTORY:
      | ________________________________________ 
      | Main Summary: ${summary.overallSummary} |
      | Previous 5 User Inquiries Summarized: ${summary.individualSummaries.map((session, index) => `[Summary ${index + 1}][id ${session.id + 1}]: ${session.summary}`).join('\n')} 
      |
  CHAT DATA CONTEXT:
    RELEVANT DATA FROM CUSTOM DOCS:
      | ________________________________________ 
      | Custom UI Library DB: ${context.docsContext}
    RELEVANT DATA FROM SEARCH DOCS:
      | ________________________________________ 
      | Relevant Perplexity Web Search Results: ${context.searchContext}
      | Raw Perplexity Search Results Data: 
      | -- Results: ${searchResults.pageContent}
      | -- References: ${searchResults.metadata.citations}
    ADDITIONAL DATA:
      | ________________________________________ 
      | Keywords: ${keywords.join(', ')}
      | UI Libraries: ${uiLibraries.join(', ')}
      | JS Libraries: ${jsLibraries.join(', ')}
      | Component Types: ${componentTypes.join(', ')}
      | Documentation Content: ${documentationContent?.map((doc) => `${doc.library} - ${doc.componentType}:\n${doc.content}`).join('\n\n')}

  --- SECTION TWO: USER PROMPT/QUERY ---

  USER PROMPT/QUERY: ${initializationData.prompt}
  EXTRACTED KEYWORDS: ${keywords.join(', ')}

  --- SECTION THREE: FINAL INSTRUCTIONS ---

  Based on the user's query, extracted information, and the provided context, please generate a response following the instructions given in the system and assistant messages. 
  Ensure that your answer is comprehensive, professional, and tailored to creating high-quality React styled components. 
  Please ensure your response includes:

  1. A brief explanation of the component's purpose and design rationale
  2. The full React component code, utilizing the latest React features and best practices
  3. Examples of how to use and customize the component

  --- SECTION FOUR: RESPONSE FORMATTING INSTRUCTIONS ---
  ${formattingGuide}

  --- END OF SECTIONS ---
  `;
const logChatData = (section, chatData) => {
  logger.info(`[CHECK][${JSON.stringify(section)}]: ${JSON.stringify(chatData)}`);
};
const logChatDataError = (section, chatData, error) => {
  logger.error(`[ERROR][${JSON.stringify(section)}]: ${JSON.stringify(chatData)}: ${error}`);
};
const textSplitter = new RecursiveCharacterTextSplitter({ chunkSize: 1000, chunkOverlap: 200 });
const DONE_MESSAGE = '[DONE]';
const setupResponseHeaders = (res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
};
const getInitializationData = (body) => ({
  apiKey: body.clientApiKey || process.env.OPENAI_API_PROJECT_KEY,
  userId: body.userId,
  workspaceId: body.workspaceId,
  sessionId: body.sessionId,
  prompt: body.regenerate ? null : body.prompt,
  role: body.role,
  sessionLength: body.count || 0,
  streamType: body.streamType,
  temperature: 0.5,
  maxTokens: 1024,
  topP: 1,
  frequencyPenalty: 0.5,
  presencePenalty: 0,
  perplexityApiKey: process.env.PERPLEXITY_API_KEY,
  searchEngineKey: process.env.GOOGLE_SERPER_API_KEY,
  pineconeEnv: process.env.PINECONE_API_KEY,
  pineconeIndex: process.env.PINECONE_INDEX,
  namespace: process.env.PINECONE_NAMESPACE_1,
  dimensions: parseInt(process.env.PINECONE_EMBEDDING_MODEL_DIMENSION),
  embeddingModel: process.env.PINECONE_EMBEDDING_MODEL_NAME,
  completionModel: process.env.OPENAI_API_CHAT_COMPLETION_MODEL,
});
const parseIfNecessary = (obj) => {
  // Check if the input is a string
  if (typeof obj === 'string') {
    try {
      return JSON.parse(obj); // Attempt to parse the string into an object
    } catch (error) {
      console.error('Failed to parse object:', error);
      return null; // Return null or handle the error as needed
    }
  }
  return obj; // Return as is if it's already an object
};
function generateUniqueFileName(prefix) {
  return `${prefix}_${new Date().toISOString().replace(/[:.]/g, '-')}.txt`;
}
function getPublicFilePath(fileName) {
  return path.join(__dirname, '..', '..', '..', '..', '..', '/public/static/files', fileName);
}
async function writeToFile(filePath, content) {
  try {
    await fsPromises.writeFile(filePath, content);
    logger.info(`File saved to ${filePath}`);
  } catch (error) {
    logger.error(`Error saving file: ${error}`);
    throw error;
  }
}
function formatChatCompletionContent(content) {
  return `
    --- CHAT COMPLETION RESPONSE ---
    ${content}
    --------------------------------
  `;
}
function formatChatPromptBuild(systemContent, assistantInstructions, formattedPrompt) {
  const promptBuild = `
    --- CHAT COMPLETION RESPONSE ---
      --- SYSTEM / ASSISTANT PROMPTS ---
      | SYSTEM: [${systemContent}]
      | ASSISTANT: [${assistantInstructions}]
      ----------------------------------
      --- USER FORMATTED PROMPT ---
      | FORMATTED PROMPT: ${formattedPrompt}
      -----------------------------
    --------------------------------
  `;
  return promptBuild;
}
const calculateRange = (range, fileSize) => {
  const parts = range?.replace(/bytes=/, '').split('-');
  const start = parseInt(parts[0], 10);
  const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
  const chunksize = end - start + 1;

  return { start, end, chunksize };
};
const createPartialContentHeaders = (start, end, fileSize, chunksize) => {
  return {
    'Content-Range': `bytes ${start}-${end}/${fileSize}`,
    'Accept-Ranges': 'bytes',
    'Content-Length': chunksize,
    'Content-Type': 'application/octet-stream',
  };
};
const createFullContentHeaders = (fileSize) => {
  return {
    'Content-Length': fileSize,
    'Content-Type': 'application/octet-stream',
  };
};
const handleFileStreaming = (req, res) => {
  const filePath = path.join(__dirname, '../../../uploads', req.body.fileName);
  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (range) {
    const { start, end, chunksize } = calculateRange(range, fileSize);
    const file = fs.createReadStream(filePath, { start, end });
    res.writeHead(206, createPartialContentHeaders(start, end, fileSize, chunksize));
    file.pipe(res);
  } else {
    res.writeHead(200, createFullContentHeaders(fileSize));
    fs.createReadStream(filePath).pipe(res);
  }
};
function extractContent(jsonString) {
  try {
    const parsedData = JSON.parse(jsonString);

    // Extract the content
    const content = parsedData.content;

    return content;
  } catch (error) {
    console.error('Error extracting content:', error);
    return null;
  }
}
module.exports = {
  prepareDocuments,
  formatDocumentation,
  createFormattedPrompt,
  logChatData,
  logChatDataError,
  textSplitter,
  DONE_MESSAGE,
  setupResponseHeaders,
  getInitializationData,
  parseIfNecessary,
  generateUniqueFileName,
  getPublicFilePath,
  writeToFile,
  formatChatCompletionContent,
  formatChatPromptBuild,
  handleFileStreaming,
  extractContent,
};
