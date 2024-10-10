/**
 * --------------------------------------------
 * [middlewares/error.js] | error handling middleware
 * --------------------------------------------
 */

const multer = require("multer");
const { logger } = require("../config/logging"); // Assuming you have a logging module
const CustomError = require("@config/constants/errors/CustomError");

const formatErrorResponse = (err, includeDetails = false) => {
  const response = {
    success: false,
    message: err.feedback || "An error occurred",
    status: err.name,
    statusCode: err.status || 500
  };

  if (includeDetails) {
    response.error = err.message;
    response.stack = err.stack;
    response.functionName = err.stack.split("\n")[1]?.trim()?.split(" ")[1];
    response.cause = err.cause;
  }

  return response;
};

const errorHandler = (err, req, res, next) => {
  if (!err) {
    return next();
  }

  const isProduction = process.env.NODE_ENV === "production";
  let statusCode = err.status || 500; // Default to 500 Internal Server Error

  // Log the error using your logging module
  logger.error(`Error: ${err.name}, Message: ${err.message}, Status: ${statusCode}`);

  // Handle specific known errors
  if (err instanceof multer.MulterError) {
    statusCode = 400;
    res.status(statusCode).json({ success: false, message: err.message });
    return;
  }

  if (err.name === "ValidationError") {
    statusCode = 400;
    res.status(statusCode).json({ success: false, message: err.message });
    return;
  }

  if (err.name === "UnauthorizedError") {
    statusCode = 401;
    res.status(statusCode).json({ success: false, message: "Unauthorized" });
    return;
  }

  // For instances of CustomError, use the status and feedback
  if (err instanceof CustomError) {
    statusCode = err.status || statusCode;
  }

  res.status(statusCode);

  const errorResponse = formatErrorResponse(err, !isProduction);

  res.json(errorResponse);
};

module.exports = {
  errorHandler
};
