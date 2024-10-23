// src/utils/httpUtils.js

const { logger } = require("@config/logging");

/**
 * Calculates the range for partial content.
 * @param {string} range
 * @param {number} fileSize
 * @returns {object}
 */
const calculateRange = (range, fileSize) => {
  const parts = range?.replace(/bytes=/, "").split("-");
  const start = parseInt(parts[0], 10);
  const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
  const chunksize = end - start + 1;

  logger.info(`Calculated range: start=${start}, end=${end}, chunksize=${chunksize}`);
  return { start, end, chunksize };
};

/**
 * Creates headers for partial content.
 * @param {number} start
 * @param {number} end
 * @param {number} fileSize
 * @param {number} chunksize
 * @returns {object}
 */
const createPartialContentHeaders = (start, end, fileSize, chunksize) => {
  return {
    "Content-Range": `bytes ${start}-${end}/${fileSize}`,
    "Accept-Ranges": "bytes",
    "Content-Length": chunksize,
    "Content-Type": "application/octet-stream"
  };
};

/**
 * Creates headers for full content.
 * @param {number} fileSize
 * @returns {object}
 */
const createFullContentHeaders = (fileSize) => {
  return {
    "Content-Length": fileSize,
    "Content-Type": "application/octet-stream"
  };
};

module.exports = {
  calculateRange,
  createPartialContentHeaders,
  createFullContentHeaders
};
