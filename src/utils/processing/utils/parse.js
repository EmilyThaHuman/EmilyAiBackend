/* eslint-disable no-control-regex */
const { logger } = require("@config/logging");

/**
 * Parses a JSON string if necessary.
 * @param {object|string} obj
 * @returns {object|null}
 */
function parseIfNecessary(obj) {
  if (typeof obj === "string") {
    try {
      return JSON.parse(obj);
    } catch (error) {
      logger.error("Failed to parse object:", error);
      return null;
    }
  }
  return obj;
}
/**
 * Cleans invalid JSON by removing Markdown-style code block delimiters and problematic control characters.
 * @param {string} input - The input string containing potentially invalid JSON with Markdown formatting.
 * @returns {string} The cleaned JSON string with code block delimiters and problematic control characters removed.
 */
function cleanInvalidJson(input) {
  // Remove Markdown-style code block delimiters (```json and ```)
  const withoutBackticks = input.replace(/```(?:json)?/g, "").trim();

  // Optional: Replace only problematic control characters, but preserve valid ones like newlines/tabs
  // You can adjust this to remove characters you know are problematic in your case
  const cleanedContent = withoutBackticks.replace(/[\u0000-\u0019]+/g, "");

  return cleanedContent;
}

/**
 * Extracts and parses JSON content from raw input.
 * @param {string} rawContent - The raw content containing JSON data.
 * @returns {Object|null} The parsed JSON object if successful, or null if parsing fails.
 * @throws {Error} If JSON parsing fails (caught internally).
 */
function extractContent(rawContent) {
  const cleanedContent = cleanInvalidJson(rawContent);
  try {
    // Attempt to parse the cleaned content
    return JSON.parse(cleanedContent);
  } catch (error) {
    // Log detailed error with both the raw and cleaned content for debugging
    logger.error("Error extracting content: Invalid JSON format", {
      error: error.message,
      rawContent,
      cleanedContent
    });
    return null; // Return null or handle appropriately
  }
}

/**
 * Extracts content from a JSON string.
 * @param {string} jsonString
 * @returns {string|object}
 */
// function extractContent(jsonString) {
//   let parsedData;
//   try {
//     parsedData = JSON.parse(jsonString);
//     return parsedData.content;
//   } catch (error) {
//     logger.error("[extractContent] Error extracting content:", error);
//     return parsedData;
//   }
// }

module.exports = {
  parseIfNecessary,
  extractContent
};
