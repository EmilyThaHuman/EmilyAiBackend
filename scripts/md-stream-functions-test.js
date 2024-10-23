// Import the stream handling logic
const {
  MARKDOWN_RESPONSE_JSON_OBJECT,
  splitMarkdownIntoChunks,
  createMarkdownStream,
  parseMarkdownStream
} = require("./md-stream-functions");
const { Transform } = require("supertest/lib/test");

// Constants for testing
const chunkSize = 50; // Define the chunk size for splitting markdown

// 1. Split the markdown content into smaller chunks
const markdownChunks = splitMarkdownIntoChunks(MARKDOWN_RESPONSE_JSON_OBJECT.content, chunkSize);
console.log("Markdown Chunks:\n", markdownChunks);

// 2. Create a stream from the markdown chunks
const markdownStream = createMarkdownStream(markdownChunks);

// 3. Updated parseMarkdownStream function to log chunks as they are processed
function parseAndLogMarkdownStream(jsonStream) {
  let accumulatedMarkdown = "";

  const jsonTransformer = new Transform({
    readableObjectMode: true,
    writableObjectMode: true,

    transform(chunk, encoding, callback) {
      // Accumulate the markdown from each chunk's 'content' field
      if (chunk.content) {
        accumulatedMarkdown += chunk.content;

        // Log the markdown as it accumulates
        console.log("Current Chunk Content:", chunk.content);
        console.log("Accumulated Markdown So Far:\n", accumulatedMarkdown);
      }

      callback(null, chunk); // Pass the chunk to the next stage in the stream
    }
  });

  // Log when the stream finishes processing
  jsonTransformer.on("finish", () => {
    console.log("\nStream Finished Processing.");
    console.log("Final Accumulated Markdown:\n", accumulatedMarkdown);
  });

  jsonStream.pipe(jsonTransformer);
}

// 4. Process and log the markdown stream incrementally
parseAndLogMarkdownStream(markdownStream);

// Add any necessary error handling to capture potential issues
markdownStream.on("error", (err) => {
  console.error("Error in markdown stream:", err);
});
