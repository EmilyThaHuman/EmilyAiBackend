const { logger } = require("@config/logging");

/**
 * Middleware to set up response headers for Server-Sent Events (SSE).
 * @param {object} req
 * @param {object} res
 * @param {function} next
 */
const streamHeaders = (req, res, next) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  logger.info(
    `SSE headers set: Content-Type: text/event-stream, Cache-Control: no-cache, Connection: keep-alive`
  );
  next();
};

module.exports = {
  streamHeaders
};
