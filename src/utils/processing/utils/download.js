/**
 * Downloads a file from OpenAI's API and saves it to the specified local path.
 * @param {string} fileId - The ID of the file to download from OpenAI's API.
 * @param {string} filePath - The local file path where the downloaded file will be saved.
 * @returns {Promise<void>} A promise that resolves when the file is successfully downloaded and saved.
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
