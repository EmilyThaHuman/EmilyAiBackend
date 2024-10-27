// CustomError.js
class CustomError extends Error {
  /**
   * Custom Error Constructor
   * @param {any} [message] - Optional error payload
   * @param {number} [statusCode] - Optional HTTP status code
   * @param {string} [feedback=""] - Optional feedback message
   */
  constructor(message, statusCode, feedback = "") {
    super(message);
    this.name = "CustomError";
    this.status = statusCode;
    this.cause = message;
    this.feedback = String(feedback);
  }
}

module.exports = CustomError;
