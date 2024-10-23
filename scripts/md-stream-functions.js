const { Readable } = require("stream");
const { Transform } = require("stream");

const MARKDOWN_RESPONSE_JSON_OBJECT = {
  content:
    "## Features\n\n- **Natural Language Understanding**: Communicate with me as you would with a human.\n- **Code Assistance**: Need help with your code? I can provide snippets, debug, and offer suggestions.\n- **Information Retrieval**: Ask me about anything, and I'll do my best to provide accurate information."
};

/**
 * Function to split markdown into smaller chunks
 * @param {string} markdown - The markdown string to split
 * @param {number} chunkSize - The size of each chunk
 * @returns {Array<string>} - Array of markdown chunks
 */
function splitMarkdownIntoChunks(markdown, chunkSize) {
  const chunks = [];
  let currentIndex = 0;

  while (currentIndex < markdown.length) {
    chunks.push(markdown.slice(currentIndex, currentIndex + chunkSize));
    currentIndex += chunkSize;
  }

  return chunks;
}

/**
 * Function to create a stream of JSON objects from markdown chunks
 * @param {Array<string>} markdownChunks - Array of markdown chunks
 * @returns {Readable} - A readable stream
 */
function createMarkdownStream(markdownChunks) {
  return Readable.from(markdownChunks.map((chunk) => ({ content: chunk })));
}

/**
 * Function to handle the markdown stream and accumulate the content
 * @param {Readable} jsonStream - Stream of JSON objects containing markdown chunks
 */
function parseMarkdownStream(jsonStream) {
  let accumulatedMarkdown = "";

  const jsonTransformer = new Transform({
    readableObjectMode: true,
    writableObjectMode: true,

    transform(chunk, encoding, callback) {
      // Accumulate the markdown from each chunk's 'content' field
      if (chunk.content) {
        accumulatedMarkdown += chunk.content;
      }
      callback(null, chunk);
    }
  });

  // Log the accumulated markdown when the stream ends
  jsonTransformer.on("finish", () => {
    console.log("Full Accumulated Markdown:\n");
    console.log(accumulatedMarkdown);
  });

  jsonStream.pipe(jsonTransformer);
}

module.exports = {
  MARKDOWN_RESPONSE_JSON_OBJECT,
  splitMarkdownIntoChunks,
  createMarkdownStream,
  parseMarkdownStream
};
