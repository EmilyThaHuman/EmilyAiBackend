/**
 * Extracts URLs from a given text string.
 * @param {string} text - The input text to extract URLs from.
 * @returns {string[]} An array of extracted URLs, or an empty array if no URLs are found.
 */
function extractUrls(text) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.match(urlRegex) || [];
}

module.exports = {
  extractUrls
};
