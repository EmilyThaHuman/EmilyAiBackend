const { logger } = require("@config/logging");

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

module.exports = {
  logArrayAsTable,
  recordTokenUsage
};
