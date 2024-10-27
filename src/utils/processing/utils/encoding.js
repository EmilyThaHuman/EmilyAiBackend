// src/utils/encodingUtils.js
const { logger } = require("@config/logging");
const { encode } = require("gpt-tokenizer");

/**
 * Converts a Buffer to a Base64 string.
 * @param {Buffer} buffer - The buffer to convert.
 * @returns {string} - Base64 encoded string.
 */
const convertBufferToBase64 = (buffer) => {
  if (!buffer) {
    throw new Error("No buffer provided");
  }
  try {
    return buffer.toString("base64");
  } catch (error) {
    logger.error("Error converting buffer to Base64:", error);
    throw error;
  }
};

/**
 * Extracts the MIME type from a Data URL.
 * @param {string} dataURL
 * @returns {string|null}
 */
const getMediaTypeFromDataURL = (dataURL) => {
  const matches = dataURL.match(/^data:([A-Za-z-+/]+);base64/);
  return matches ? matches[1] : null;
};

/**
 * Extracts the Base64 data from a Data URL.
 * @param {string} dataURL
 * @returns {string|null}
 */
const getBase64FromDataURL = (dataURL) => {
  const matches = dataURL.match(/^data:[A-Za-z-+/]+;base64,(.*)$/);
  return matches ? matches[1] : null;
};

/**
 * Converts bytes to a Data URL with the specified MIME type.
 * @param {string} mimeType
 * @param {Buffer} data
 * @returns {string}
 */
const byteToImageURL = (mimeType, data) => {
  const b64 = `data:${mimeType};base64,${convertBufferToBase64(data)}`;
  return b64;
};

module.exports = {
  convertBufferToBase64,
  getMediaTypeFromDataURL,
  getBase64FromDataURL,
  byteToImageURL
};
