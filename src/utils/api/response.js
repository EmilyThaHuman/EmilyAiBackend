const { logger } = require("@config/logging");

// const { Response } = await import('node-fetch');
const setSSEHeader = (res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");
};
const RespondWithError = (res, statusCode, message, err) => {
  res.status(statusCode).json({ message, error: err });
};
const createResponse = async (res, statusCode, data) => {
  return res.status(statusCode).json(data);
};

// Helper function for error responses
const errorResponse = (res, error, message) => {
  logger.error(`Error: ${error.message}`);
  res.status(500).json({ error: message, message: error.message, data: error });
};

const handleChatError = (res, error) => {
  logger.error(`Error in combinedChatStream: ${error.message}`);
  logger.error(`STACK: ${error.stack}`);
  if (error.response && error.response.status) {
    const statusCode = error.response.status;
    const errorMessage = error.response.data.error || "An error occurred";
    res.status(statusCode).json({ error: errorMessage });
  } else {
    res.status(500).json({ error: "An error occurred" });
  }
  if (!res.headersSent) {
    res.status(500).json({ error: "An error occurred while processing the chat stream" });
  }
};

module.exports = {
  RespondWithError,
  createResponse,
  setSSEHeader,
  errorResponse,
  handleChatError
};
