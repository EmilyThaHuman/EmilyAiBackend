const fs = require("node:fs/promises");
const { logger } = require("@config/logging");
const { addMessageToSession } = require("./chat_history");
const { logChatData } = require("@utils/processing/utils/loggingFunctions");
const {
  generateUniqueFileName,
  getPublicFilePath,
  writeToFile
} = require("@utils/processing/utils/files");
const { extractContent } = require("@utils/processing/utils/parse");
const { formatChatPromptBuild } = require("@utils/processing/utils/format");

/**
 * Logs streaming data to the console.
 * @param {String} markdown - The markdown content to log.
 */
function liveStreamLogger(markdown) {
  // Clear previous log and print updated markdown
  process.stdout.write("\x1b");
  logger.info(markdown);
}

async function savePromptBuild(systemContent, assistantInstructions, formattedPrompt) {
  const fileName = generateUniqueFileName("prompt-build");
  const filePath = getPublicFilePath(fileName);
  const promptBuild = formatChatPromptBuild(systemContent, assistantInstructions, formattedPrompt);

  try {
    await writeToFile(filePath, promptBuild);
  } catch (error) {
    logger.error(`[ERROR][savePromptBuild]: ${error.message}`);
    throw error;
  }
}
/**
 * Extracts JSX, JS, and TSX code blocks from the provided file data.
 *
 * @param {string} fileData - The content of the file as a string.
 * @returns {Array<{ language: string, code: string }>} An array of extracted code blocks with their language.
 */
function extractCodeBlocks(fileData) {
  const codeBlocks = [];

  // Regular expression to match code blocks labeled with jsx, js, or tsx
  const regex = /^(jsx|js|tsx)\n([\s\S]*?)(?=\n^(?:jsx|js|tsx)|\n## |\n$)/gm;

  let match;

  while ((match = regex.exec(fileData)) !== null) {
    const language = match[1];
    const code = match[2].trim();

    codeBlocks.push({ language, code });
  }

  return codeBlocks;
}

async function saveChatCompletion(initializationData, chatSession, fullResponse) {
  const fileName = generateUniqueFileName("chat-completion");
  const filePath = getPublicFilePath(fileName);
  await fs.writeFile(filePath, fullResponse);

  try {
    const parsedData = extractContent(fullResponse);
    if (parsedData.content) {
      await writeToFile(filePath, parsedData.content);
    }
    const extractedBlocks = extractCodeBlocks(fullResponse);

    try {
      const assistantMessageDoc = await addMessageToSession(chatSession, {
        role: "assistant",
        content: parsedData.content,
        code: JSON.stringify(extractedBlocks),
        userId: initializationData.userId,
        workspaceId: initializationData.workspaceId,
        sessionId: chatSession._id,
        metadata: {
          createdAt: Date.now(),
          updatedAt: Date.now(),
          sessionId: chatSession._id,
          contentType: parsedData?.type,
          references: parsedData?.references
        }
      });
      logChatData("assistantMessageDoc", assistantMessageDoc);
      const tokenizedMessages = await chatSession.tokenizeAllMessages(chatSession._id);
      await chatSession.updateTokenUsage(tokenizedMessages);
      const usage = chatSession.getTokenUsage();
      logger.info(`Token usage: ${usage}`);
    } catch (error) {
      logger.error(`[ERROR][saveChatCompletion]: ${error.message}`);
      throw error;
    }
  } catch (error) {
    logger.error(`[ERROR][saveChatCompletion]: ${error.message}`);
    throw error;
  }
}

module.exports = {
  liveStreamLogger,
  savePromptBuild,
  saveChatCompletion
};
