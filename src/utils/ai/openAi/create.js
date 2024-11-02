// create.js
// This file contains functions to create new resources or initiate new requests with the OpenAI API.

import { LanguageModelV1, ProviderV1, EmbeddingModelV1 } from "@ai-sdk/provider";
import { FetchFunction } from "@ai-sdk/provider-utils";
// CLINE_EDITS/create.js

const axios = require("axios");
const fs = require("fs");

/**
 * Creates a fine-tune job for a new model.
 * @param {string} apiKey - Your OpenAI API key.
 * @param {Object} params - The parameters for fine-tuning.
 * @returns {Promise<Object>} - A promise that resolves to the fine-tune job details.
 */
async function createFineTune(apiKey, params) {
  try {
    const response = await axios.post("https://api.openai.com/v1/fine-tunes", params, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      }
    });
    return response.data;
  } catch (error) {
    console.error("Error creating fine-tune job:", error.response?.data || error.message);
    throw error;
  }
}

/**
 * Uploads a file to the OpenAI API.
 * @param {string} apiKey - Your OpenAI API key.
 * @param {string} filePath - The path to the file to upload.
 * @param {string} purpose - The purpose of the file (e.g., 'fine-tune').
 * @returns {Promise<Object>} - A promise that resolves to the uploaded file details.
 */
async function uploadFile(apiKey, filePath, purpose) {
  try {
    const formData = new FormData();
    formData.append("file", fs.createReadStream(filePath));
    formData.append("purpose", purpose);

    const response = await axios.post("https://api.openai.com/v1/files", formData, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        ...formData.getHeaders()
      }
    });
    return response.data;
  } catch (error) {
    console.error("Error uploading file:", error.response?.data || error.message);
    throw error;
  }
}

/**
 * Creates embeddings for the provided input.
 * @param {string} apiKey - Your OpenAI API key.
 * @param {Object} params - The parameters for creating embeddings.
 * @returns {Promise<Object>} - A promise that resolves to the embeddings result.
 */
async function createEmbedding(apiKey, params) {
  try {
    const response = await axios.post(
      "https://api.openai.com/v1/embeddings",
      {
        model: params.model || "text-embedding-3-small",
        input: params.input,
        encoding_format: params.format || "float",
        dimensions: params.dimensions || 1536,
        ...params.options
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error creating embedding:", error.response?.data || error.message);
    throw error;
  }
}
 async function generateEmbeddings(text) {
    try {
        // Request embeddings
        const response = await openai.embeddings.create({
            model: 'text-embedding-ada-002', // Use an appropriate embedding model
            input: text,
            encoding_format: 'float'
        });

        return response.data[0].embedding;        

    } catch (error) {
        console.error('Error generating embeddings with OpenAI:', error);
    }
}
 async function processAndUpdateDictionary(dict) {
    for (const func of dict.functions) {
      const embedding = await generateEmbeddings(func.code);
      if (embedding) {
        func.embedding = embedding;
      }
    }
  
    for (const cls of dict.classes) {
      const embedding = await generateEmbeddings(cls.code);
      if (embedding) {
        cls.embedding = embedding;
      }
    }
    
    return dict;
}

module.exports = {
  createFineTune,
  uploadFile,
  createEmbedding
};
