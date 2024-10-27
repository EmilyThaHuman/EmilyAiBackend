const fs = require("node:fs/promises");
const path = require("path");
const { logger } = require("@config/logging");
const { File } = require("@models/chat");
const { encode } = require("gpt-tokenizer");
const prettier = require("prettier");

/**
 * Formats the given content based on its type using Prettier and wraps it in Markdown code blocks.
 * @param {string} content - The content to be formatted.
 * @param {string} type - The type of content (e.g., "jsx", "javascript", "css").
 * @returns {string} The formatted content wrapped in Markdown code blocks.
 */
function formatSection(content, type) {
  let formattedContent;

  // Use Prettier for formatting different content types
  switch (type) {
    case "jsx":
    case "javascript":
      formattedContent = prettier.format(content, { parser: "babel" });
      break;
    case "css":
      formattedContent = prettier.format(content, { parser: "css" });
      break;
    default:
      formattedContent = content.trim(); // For non-code sections, no formatting
      break;
  }

  // Return the content with appropriate Markdown code blocks
  return `\`\`\`${type}\n${formattedContent}\n\`\`\``;
}

/**
 * Formats documentation based on provided title and sections
 * @param {Object} options - The options object
 * @param {string} options.title - The main title of the documentation
 * @param {Array} options.sections - An array of section objects
 * @param {string} options.sections[].title - The title of each section
 * @param {string} [options.sections[].type] - The content type of the section (optional)
 * @param {string} options.sections[].content - The content of the section
 * @returns {string} Formatted documentation string
 */
function formatDocumentation({ title, sections }) {
  let documentation = `# ${title}\n\n`;

  sections.forEach((section) => {
    // Add the section title
    documentation += `## ${section.title}\n\n`;

    // Identify content type and format accordingly
    if (section.type) {
      documentation += formatSection(section.content, section.type);
    } else {
      // If no specific content type is provided, treat as plain text
      documentation += section.content.trim();
    }

    documentation += `\n\n`; // Add space between sections
  });

  return documentation.trim();
}

/**
 * Generates a unique filename with a given prefix.
 * @param {string} prefix
 * @param {string} extension - File extension (e.g., 'txt', 'md').
 * @returns {string}
 */
const generateUniqueFileName = (prefix, extension = "txt") => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `${prefix}_${timestamp}.${extension}`;
};

/**
 * Constructs the public file path.
 * @param {string} fileName
 * @returns {string}
 */
const getPublicFilePath = (fileName) => {
  return path.join(__dirname, "../../../../public/static/files", fileName);
};

/**
 * Writes content to a specified file path.
 * @param {string} filePath
 * @param {string|Buffer} content
 * @param {string} encoding - Optional encoding. Defaults to 'utf8'.
 */
const writeToFile = async (filePath, content, encoding = "utf8") => {
  try {
    await fs.writeFile(filePath, content, encoding);
    logger.info(`File saved to ${filePath}`);
  } catch (error) {
    logger.error(`Error saving file: ${error.message}`);
    throw new Error(`File saving error: ${error.message}`);
  }
};

/**
 * Saves markdown content to a file.
 * @param {string} content
 * @returns {Promise<string>} - The file path where the markdown was saved.
 */
const saveMarkdown = async (content) => {
  try {
    const filename = generateUniqueFileName("response", "md");
    const filepath = getPublicFilePath(filename);
    await writeToFile(filepath, content, "utf-8");
    logger.info(`Saved markdown to ${filepath}`);
    return filepath;
  } catch (error) {
    logger.error("Error saving markdown file:", error.message);
    throw new Error(`Markdown saving error: ${error.message}`);
  }
};

/**
 * Asynchronously saves JSON content to a file with a unique filename.
 * @param {string|object} content - The JSON content to be saved. Can be a JSON string or an object.
 * @returns {Promise<string>} A promise that resolves with the filepath of the saved JSON file.
 * @throws {Error} If there's an error during the file saving process.
 */
const saveJson = async (content) => {
  try {
    const filename = generateUniqueFileName("response", "json");
    const filepath = getPublicFilePath(filename);
    await writeToFile(filepath, content, "utf-8");
    logger.info(`Saved JSON to ${filepath}`);
    return filepath;
  } catch (error) {
    logger.error("Error saving JSON file:", error.message);
    throw new Error(`JSON saving error: ${error.message}`);
  }
};
/**
 * Saves a file to the system and MongoDB.
 * @param {Object} params
 * @param {string} params.content - The content to save.
 * @param {string} params.userId
 * @param {string} params.workspaceId
 * @param {string} params.folderId
 * @param {string} params.library
 * @returns {Promise<Object>} - Information about the saved file.
 */
const saveFileToSystemAndDB = async ({ content, userId, workspaceId, folderId, library }) => {
  const fileName = generateUniqueFileName(`${library}_scraped`);
  const filePath = path.join(__dirname, "../../../../public/uploads", fileName);

  try {
    // Write the content to the file
    await writeToFile(filePath, content, "utf8");

    // Get file stats
    const fileStats = await fs.stat(filePath);
    const fileType = path.extname(fileName).slice(1).toLowerCase();

    // Create file metadata
    const fileMetadata = {
      userId,
      workspaceId,
      folderId,
      name: fileName,
      size: fileStats.size,
      originalFileType: fileType,
      filePath,
      type: fileType,
      metadata: {
        fileSize: fileStats.size,
        fileType,
        lastModified: fileStats.mtime
      }
    };

    // Save file information to MongoDB
    const newFile = new File(fileMetadata);
    logger.info("Creating new file entry in MongoDB...");
    await newFile.save();
    logger.info("File information saved to MongoDB");

    // Return success response
    return {
      success: true,
      fileName,
      filePath,
      size: fileStats.size,
      type: fileType
    };
  } catch (error) {
    logger.error("Error in saving file:", error.message);
    throw new Error(`File handling error: ${error.message}`);
  }
};

module.exports = {
  saveFileToSystemAndDB,
  generateUniqueFileName,
  getPublicFilePath,
  writeToFile,
  saveMarkdown,
  saveJson,
  formatDocumentation
};
