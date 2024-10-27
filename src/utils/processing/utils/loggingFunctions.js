const { logger } = require("@config/logging");

/**
 * Logs an array of objects as a formatted table to the console
 * @param {Array} array - The array of objects to be logged as a table
 * @returns {void} This function does not return a value
 */
function logArrayAsTable(array) {
  // Check if the array is empty
  if (array.length === 0) {
    logger.info("The array is empty.");
    return;
  }

  // Get the keys from the first object in the array
  const keys = Object.keys(array[0]);

  // Create the header row
  const headerRow = keys.join(" | ");
  const separatorRow = keys.map(() => "---").join(" | ");

  // Log the header
  logger.info(headerRow);
  logger.info(separatorRow);

  // Log each row of data
  array.forEach((item) => {
    const row = keys.map((key) => item[key] || "").join(" | ");
    logger.info(row);
  });
}

/**
 * Records token usage data for logging purposes.
 * @param {Object} options - An object containing token usage data.
 * @param {number} options.prompt_tokens - The number of tokens used in the prompt.
 * @param {number} options.completion_tokens - The number of tokens used in the completion.
 * @param {number} options.total_tokens - The total number of tokens used.
 * @returns {void} This function doesn't return anything.
 * @throws {Error} If there's an error while recording token usage.
 */
function recordTokenUsage({ prompt_tokens, completion_tokens, total_tokens }) {
  if (!prompt_tokens || !completion_tokens || !total_tokens) {
    logger.error("Invalid token usage data");
    return;
  }
  try {
    logger.info("Prompt tokens:", prompt_tokens);
    logger.info("Completion tokens:", completion_tokens);
    logger.info("Total tokens:", total_tokens);
  } catch (error) {
    logger.error(`Error recording token usage: ${error.message}`);
  }
}

/**
 * Logs chat data.
 * @param {string} section
 * @param {object} chatData
 */
function logChatData(section, chatData) {
  logger.info(`[CHECK][${section}]: ${JSON.stringify(chatData)}`);
}

/**
 * Logs chat data errors.
 * @param {string} section
 * @param {object} chatData
 * @param {Error} error
 */
function logChatDataError(section, chatData, error) {
  logger.error(`[ERROR][${section}]: ${JSON.stringify(chatData)}: ${error}`);
}

module.exports = {
  logArrayAsTable,
  recordTokenUsage,
  logChatData,
  logChatDataError
};
