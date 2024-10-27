const tiktoken = require("tiktoken");

function newTextBuffer(n, prefix, suffix) {
  const builders = Array(n).fill("");
  // return new TextBuffer({ builders, prefix, suffix });
  return {
    builders,
    prefix,
    suffix
  };
}

function appendByIndex(tb, index, text) {
  if (index >= 0 && index < tb.builders.length) {
    tb.builders[index] += text;
  }
}

function tbToString(tb, separator) {
  let result = "";
  const n = tb.builders.length;
  for (let i = 0; i < n; i++) {
    if (n > 1) {
      result += `\n${i + 1}\n---\n`;
    }
    result += tb.prefix;
    result += tb.builders[i];
    result += tb.suffix;
    if (i < n - 1) {
      result += separator;
    }
  }
  return result;
}

async function getTokenCount(content) {
  const encoding = "cl100k_base";
  const tke = tiktoken.getEncoding(encoding);
  const token = tke.encode(content);
  return token.length;
}

async function decodeFirstN(s, n) {
  const encoding = "cl100k_base";
  const tke = tiktoken.getEncoding(encoding);
  const decoded = tke.decode(s);
  return firstN(decoded, n);
}

async function getTokenEmbedding(text) {
  const encoding = "cl100k_base";
  const tke = tiktoken.getEncoding(encoding);
  const token = tke.encode(text);
  return token;
}

/**
 * Returns the first N non-empty characters from a string
 * @param {string} s - The input string to process
 * @param {number} n - The number of non-empty characters to return
 * @returns {string} A substring containing the first N non-empty characters, or the entire string if N exceeds the number of non-empty characters
 */
function firstN(s, n) {
  let i = 0;
  for (let j = 0; j < s.length; j++) {
    if (i === n) {
      return s.slice(0, j);
    }
    i++;
  }
  return s;
}

/**
 * Converts a string to a File object with the specified file name.
 * @param {string} str - The string to be converted into a file.
 * @param {string} fileName - The name to be given to the resulting file.
 * @returns {File} A File object containing the input string data with the specified file name.
 */
function stringToFileBuffer(str, fileName) {
  // Convert the string into a byte array using TextEncoder
  const byteArray = new TextEncoder().encode(str);

  // Create a Blob from the byte array
  const blob = new Blob([byteArray], { type: "application/octet-stream" });

  // Convert the Blob into a File object
  const file = new File([blob], fileName, { type: "application/octet-stream" });

  return file;
}

module.exports = {
  newTextBuffer,
  appendByIndex,
  tbToString,
  getTokenCount,
  decodeFirstN,
  getTokenEmbedding,
  firstN,
  stringToFileBuffer
};
