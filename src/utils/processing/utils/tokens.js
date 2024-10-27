/**
 * Counts the number of tokens in the given text.
 * @param {string} text - The input text to be tokenized and counted.
 * @returns {number} The number of tokens in the input text.
 */
function countTokens(text) {
  return encode(text).length;
}

/**
 * Tokenizes the input text by splitting it into an array of words.
 * @param {string} text - The input text to be tokenized.
 * @returns {string[]} An array of tokens (words) extracted from the input text.
 */
function tokenizeText(text) {
  return text.split(/\s+/);
}
