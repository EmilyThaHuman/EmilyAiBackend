const { createOpenAI } = require("@ai-sdk/openai");
const { getEnv } = require("../api");
const fs = require("fs");

// Initialize OpenAI with API key
const openai = createOpenAI({
  apiKey: getEnv("OPENAI_API_PROJECT_KEY"),
  compatibility: "strict"
});

/**
 * Downloads a file from OpenAI API and saves it to the specified local path.
 * @param {string} fileId - The ID of the file to download from OpenAI.
 * @param {string} filePath - The local path where the file should be saved.
 * @returns {Promise<void>} This function doesn't return a value, but writes the file to disk.
 * @throws {Error} If there's an error during the download or file writing process.
 */
async function downloadFile(fileId, filePath) {
  try {
    const response = await openai.files.content(fileId);

    // Extract the binary data from the Response object
    const fileData = await response.arrayBuffer();

    // Convert the binary data to a Buffer
    const fileBuffer = Buffer.from(fileData);

    // Save the file to the specified location
    fs.writeFileSync(filePath, fileBuffer);

    console.log(`File downloaded and saved to ${filePath}`);
  } catch (error) {
    console.error("Error downloading file:", error);
  }
}

module.exports = { downloadFile };
