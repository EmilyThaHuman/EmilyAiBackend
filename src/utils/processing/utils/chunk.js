const { TokenTextSplitter } = require("langchain/text_splitter");
const { escapeRegExp } = require("./text");

/**
 * Checks if a message contains specific diff markers.
 * @param {string} message - The message to check for diff markers.
 * @returns {boolean} True if the message contains all required diff markers, false otherwise.
 */
const containsDiff = (message) => {
  return (
    message.includes("<<<<<<< ORIGINAL") &&
    message.includes(">>>>>>> UPDATED") &&
    message.includes("=======\n")
  );
};

/**
 * Applies a diff to a given code string
 * @param {string} code - The original code string
 * @param {string} diff - The diff string containing changes in a specific format
 * @returns {string} The updated code after applying the diff
 */
const applyDiff = (code, diff) => {
  const regex = /<<<<<<< ORIGINAL\n(.*?)=======\n(.*?)>>>>>>> UPDATED/gs;
  let match;
  while ((match = regex.exec(diff)) !== null) {
    const [, before, after] = match;
    let regex = escapeRegExp(before);
    regex = regex.replaceAll(/\r?\n/g, "\\s+");
    regex = regex.replaceAll(/\t/g, "");
    const replaceRegex = new RegExp(regex);
    code = code.replace(replaceRegex, after);
  }
  return code;
};

/**
 * Splits an array into smaller chunks of a specified size.
 * @param {Array} arr - The array to be split into chunks.
 * @param {number} chunkSize - The size of each chunk.
 * @returns {Array} An array of arrays, where each inner array is a chunk of the original array.
 */
const sliceIntoChunks = (arr, chunkSize) =>
  Array.from({ length: Math.ceil(arr.length / chunkSize) }, (_, i) =>
    arr.slice(i * chunkSize, (i + 1) * chunkSize)
  );

/**
 * Performs a chunked upsert operation on a vector index.
 * @param {Object} index - The index object to perform the upsert on.
 * @param {Array} vectors - The vectors to be upserted into the index.
 * @param {string} namespace - The namespace within the index to upsert the vectors.
 * @param {number} [chunkSize=10] - The size of each chunk for batching upserts. Defaults to 10.
 * @returns {Promise<boolean>} Returns true if the upsert operation is successful.
 * @throws {Error} Throws an error if there's a problem upserting vectors into the index.
 */
const chunkedUpsert = async (index, vectors, namespace, chunkSize = 10) => {
  const chunks = sliceIntoChunks(vectors, chunkSize);
  try {
    await Promise.allSettled(
      chunks.map(async (chunk) => {
        try {
          await index.namespace(namespace).upsert(chunk);
        } catch (e) {
          console.log("Error upserting chunk", e);
        }
      })
    );
    return true;
  } catch (e) {
    throw new Error(`Error upserting vectors into index: ${e}`);
  }
};

/**
 * Extracts content from a chunk object, specifically from the 'content' property of the first choice's delta.
 * @param {Object} chunk - The chunk object containing choices and delta information.
 * @returns {string} The extracted content string, or an empty string if not found.
 */
const extractContent = (chunk) => {
  return chunk.choices[0]?.delta?.content || "";
};

/**
 * Processes a batch of chunks by extracting and concatenating their content.
 * @param {Array} chunks - An array of chunks to process.
 * @returns {string} A single string containing the concatenated content of all chunks.
 * @throws {Error} Logs an error message if there's an issue processing the chunk batch.
 */
const processChunkBatch = async (chunks) => {
  try {
    // maps each chunk to its content and joins them into a single string
    const batchContent = chunks
      .map((chunk) => {
        const chunkContent = extractContent(chunk);
        return chunkContent;
      })
      .join("");

    return batchContent;
  } catch (error) {
    console.error("Error processing chunk batch:", error);
  }
};

/**
 * Performs semantic chunking on the given text.
 * @param {string} text - The input text to be chunked.
 * @param {number} [chunkSize=1000] - The size of each chunk in tokens. Default is 1000.
 * @param {number} [overlap=200] - The number of overlapping tokens between chunks. Default is 200.
 * @returns {string[]} An array of text chunks.
 */
function semanticChunking(text, chunkSize = 1000, overlap = 200) {
  const splitter = new TokenTextSplitter({
    chunkSize: chunkSize,
    chunkOverlap: overlap
  });

  return splitter.splitText(text);
}

/**
 * Creates sliding window chunks from an array of chunks.
 * @param {Array} chunks - The array of chunks to create sliding windows from.
 * @param {number} [windowSize=3] - The size of each sliding window. Defaults to 3.
 * @returns {Array} An array of strings, each representing a sliding window of joined chunks.
 */
function slidingWindowChunks(chunks, windowSize = 3) {
  const windows = [];
  for (let i = 0; i < chunks.length - windowSize + 1; i++) {
    windows.push(chunks.slice(i, i + windowSize).join(" "));
  }
  return windows;
}

/**
 * Cleans and parses response data by removing leading/trailing quotes, unescape characters, and parsing as JSON.
 * @param {string} responseData - The raw response data string to be cleaned and parsed.
 * @returns {Object|null} The parsed JSON object if successful, or null if parsing fails.
 * @throws {Error} If JSON parsing fails (caught internally and logged to console).
 */
function cleanResponseData(responseData) {
  // Step 1: Remove leading/trailing quotes and escape characters
  const cleanedData = responseData
    .replace(/^"|"$/g, "") // Remove leading and trailing quotes
    .replace(/\\n/g, "\n") // Replace escaped newlines with actual newlines
    .replace(/\\\\/g, "\\") // Replace double backslashes with a single backslash
    .trim(); // Trim any extra whitespace

  // Step 2: Parse the cleaned data as JSON
  try {
    const parsedData = JSON.parse(cleanedData);
    return parsedData;
  } catch (error) {
    console.error("Error parsing JSON:", error);
    return null; // Return null or handle the error as needed
  }
}

module.exports = {
  containsDiff,
  applyDiff,
  sliceIntoChunks,
  chunkedUpsert,
  processChunkBatch,
  extractContent,
  semanticChunking,
  slidingWindowChunks,
  cleanResponseData
};
