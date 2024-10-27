const { OpenAIEmbeddings } = require("@langchain/openai");
require("dotenv").config();

/**
 * Vectorizes input text using OpenAI's embeddings API.
 * @param {string|string[]} text - The input text to vectorize. Can be a single string or an array of strings.
 * @returns {Promise<number[]>} A promise that resolves to an array of numbers representing the text embedding.
 * @throws {Error} If the input is not a string or an array of strings.
 * @throws {Error} If there's an error during the API call or processing.
 */
const vectorize = async (text) => {
  try {
    if (typeof text !== "string" && !Array.isArray(text)) {
      throw new Error("Input to vectorize must be a string or an array of strings.");
    }
    console.log(`Sending input to OpenAI embeddings API: ${JSON.stringify(text)}`);

    const embedder = new OpenAIEmbeddings({
      modelName: "text-embedding-3-small",
      apiKey: process.env.OPENAI_API_PROJECT_KEY,
      dimensions: 512 // Use 512-dimensional embeddings
    });
    const response = await embedder.embedQuery(text);
    console.log(`Received response from OpenAI embeddings API: ${JSON.stringify(response)}`);
    return response;
  } catch (error) {
    console.error("Error vectorizing text:", error);
    throw error;
  }
};

module.exports = {
  vectorize
};
