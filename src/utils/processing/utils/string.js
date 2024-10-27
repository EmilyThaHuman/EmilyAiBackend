/**
 * Sanitizes a filename by converting it to lowercase and replacing non-alphanumeric characters with underscores.
 * @param {string} fileName
 * @returns {string}
 */
const sanitizeFileName = (fileName) => {
  return fileName.toLowerCase().replace(/[^a-z0-9]+/g, "_");
};

module.exports = {
  sanitizeFileName
};
