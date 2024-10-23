// src/utils/metadataUtils.js

const { logger } = require("@config/logging");

/**
 * Gets the file extension from a filename.
 * @param {string} filename
 * @returns {string} - Lowercase file extension or empty string if none.
 */
const getFileExtension = (filename) => {
  const extension = filename.split(".").pop();
  return extension ? extension.toLowerCase() : "";
};

/**
 * Calculates the size of a string in bytes, kilobytes, and megabytes.
 * @param {string} str
 * @returns {Object} - Sizes in bytes, kilobytes, and megabytes.
 */
const getFileSize = (str) => {
  const sizeInBytes = Buffer.byteLength(str, "utf8");
  logger.info(`File size: ${sizeInBytes} bytes`);

  const sizeInKB = sizeInBytes / 1024;
  const sizeInMB = sizeInKB / 1024;

  logger.info(`File size: ${sizeInKB.toFixed(2)} KB`);
  logger.info(`File size: ${sizeInMB.toFixed(2)} MB`);

  return {
    bytes: sizeInBytes,
    kilobytes: sizeInKB.toFixed(2),
    megabytes: sizeInMB.toFixed(2)
  };
};

module.exports = {
  getFileExtension,
  getFileSize
};
