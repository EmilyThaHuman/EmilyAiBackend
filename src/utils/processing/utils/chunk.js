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
 * @param {string} code - The original code string to be modified
 * @param {string} diff - The diff string containing the changes to be applied
 * @returns {string} The modified code string after applying the diff
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
 * Slices an array into smaller chunks of a specified size.
 * @param {Array} arr - The array to be sliced into chunks.
 * @param {number} chunkSize - The size of each chunk.
 * @returns {Array} An array of arrays, where each inner array is a chunk of the original array.
 */
const sliceIntoChunks = (arr, chunkSize) =>
  Array.from({ length: Math.ceil(arr.length / chunkSize) }, (_, i) =>
    arr.slice(i * chunkSize, (i + 1) * chunkSize)
  );

/**
 * Performs chunked upsert operations on a vector index within a specified namespace
 * @param {Object} index - The vector index object to perform upserts on
 * @param {Array} vectors - The array of vectors to be upserted
 * @param {string} namespace - The namespace within the index to upsert the vectors
 * @param {number} [chunkSize=10] - The size of each chunk for batch processing
 * @returns {Promise<boolean>} Returns true if the upsert operation is successful
 * @throws {Error} Throws an error if there's a problem upserting vectors into the index
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
 * Extracts the content from a chunk object returned by an AI model.
 * @param {Object} chunk - The chunk object containing the AI model's response.
 * @returns {string} The extracted content as a string, or an empty string if no content is found.
 */
const extractContent = (chunk) => {
  return chunk.choices[0]?.delta?.content || "";
};

/**
 * Processes a batch of chunks by extracting and concatenating their content.
 * @param {Array} chunks - An array of chunks to be processed.
 * @returns {string} A single string containing the concatenated content of all chunks.
 * @throws {Error} Logs an error message if an exception occurs during processing.
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
 * Splits a given text into semantic chunks using a TokenTextSplitter.
 * @param {string} text - The input text to be split into chunks.
 * @param {number} [chunkSize=1000] - The maximum size of each chunk in tokens.
 * @param {number} [overlap=200] - The number of overlapping tokens between chunks.
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
 * Creates an array of overlapping chunks from the input array.
 * @param {Array} chunks - The input array to be windowed.
 * @param {number} [windowSize=3] - The size of each window. Defaults to 3.
 * @returns {Array} An array of strings, each representing a window of joined chunks.
 */
function slidingWindowChunks(chunks, windowSize = 3) {
  const windows = [];
  for (let i = 0; i < chunks.length - windowSize + 1; i++) {
    windows.push(chunks.slice(i, i + windowSize).join(" "));
  }
  return windows;
}

/**
 * Cleans and parses response data by removing unnecessary characters and converting it to a JSON object.
 * @param {string} responseData - The raw response data string to be cleaned and parsed.
 * @returns {Object|null} The parsed JSON object, or null if parsing fails.
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

/**
 * Splits a given text into chunks of 1 to many paragraphs.
 *
 * @param {string} text - The input text to be chunked.
 * @param {number} [maxChunkSize=1500] - The maximum size (in characters) allowed for each chunk.
 * @param {number} [minChunkSize=500] - The minimum size (in characters) required for each chunk.
 * @returns {string[]} An array of chunked text, where each chunk contains 1 or multiple paragraphs
 */
function chunkTextByMultiParagraphs(text, maxChunkSize = 1500, minChunkSize = 500) {
  const chunks = [];
  let currentChunk = "";

  let startIndex = 0;
  while (startIndex < text.length) {
    let endIndex = startIndex + maxChunkSize;
    if (endIndex >= text.length) {
      endIndex = text.length;
    } else {
      const paragraphBoundary = text.indexOf("\n\n", endIndex);
      if (paragraphBoundary !== -1) {
        endIndex = paragraphBoundary;
      }
    }

    const chunk = text.slice(startIndex, endIndex).trim();
    if (chunk.length >= minChunkSize) {
      chunks.push(chunk);
      currentChunk = "";
    } else {
      currentChunk += chunk + "\n\n";
    }

    startIndex = endIndex + 1;
  }

  if (currentChunk.length >= minChunkSize) {
    chunks.push(currentChunk.trim());
  } else if (chunks.length > 0) {
    chunks[chunks.length - 1] += "\n\n" + currentChunk.trim();
  } else {
    chunks.push(currentChunk.trim());
  }

  return chunks;
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
  cleanResponseData,
  chunkTextByMultiParagraphs
};
