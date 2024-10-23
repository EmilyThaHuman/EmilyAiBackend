// src/services/documentService.js
const { RecursiveCharacterTextSplitter } = require("langchain/text_splitter");

const textSplitter = new RecursiveCharacterTextSplitter({ chunkSize: 1000, chunkOverlap: 200 });

/**
 * Prepares documents for processing.
 * @param {object} initializationData
 * @param {object} chatSession
 * @param {string} content
 * @returns {array}
 */
const prepareDocuments = (initializationData, chatSession, content) => [
  {
    pageContent: initializationData.prompt,
    metadata: { chatId: chatSession._id.toString(), role: "user" }
  },
  {
    pageContent: content,
    metadata: { chatId: chatSession._id.toString(), role: "assistant" }
  }
];

/**
 * Splits text into manageable chunks.
 * @param {string} text
 * @returns {Promise<Array>}
 */
const splitText = async (text) => {
  return await textSplitter.splitText(text);
};

module.exports = {
  prepareDocuments,
  splitText
};
