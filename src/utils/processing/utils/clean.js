const { logger } = require("@config/logging");

function cleanWhitespace(code) {
  return code.trim();
}
function removeHtmlComments(code) {
  return code.replace(/<!--[\s\S]*?-->/g, "");
}
function normalizeLineBreaks(code) {
  return code.replace(/\n{3,}/g, "\n\n");
}
function removeIndentation(code) {
  const lines = code.split("\n");
  const minIndent = lines.reduce((min, line) => {
    const indent = line.match(/^\s*/)[0].length;
    return line.trim() ? Math.min(min, indent) : min;
  }, Infinity);
  return lines.map((line) => line.slice(minIndent)).join("\n");
}
function unescapeHtml(code) {
  const entities = {
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&#39;": "'"
  };
  return code.replace(/&amp;|&lt;|&gt;|&quot;|&#39;/g, (match) => entities[match]);
}
function removeHtmlTags(code) {
  return code.replace(/<\/?[^>]+(>|$)/g, "");
}
function cleanCodeSnippetGeneral(snippet) {
  let { code, language } = snippet;

  // Remove copy commands and surrounding whitespace
  code = code.replace(/^Copy(\(or ⌘C\))?\s*|\s*Copy(Copied)?\(or ⌘C\)\s*$/g, "");

  // Remove "Press Enter to start editing" and similar phrases
  code = code.replace(/Press Enter to start editing.*$/, "");

  // Remove CSS comments and styles (specific to these examples)
  code = code.replace(/\/\*\*[\s\S]*?\*\/|\.npm__react-simple-code-editor__[\s\S]*?}\s*}/g, "");

  // Remove empty lines
  code = code
    .split("\n")
    .filter((line) => line.trim() !== "")
    .join("\n");

  // Trim leading and trailing whitespace
  code = code.trim();

  // For JSX, remove any leading XML-like tags that appear to be duplicates
  if (language === "jsx") {
    const lines = code.split("\n");
    const uniqueLines = [];
    let seenLines = new Set();

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!seenLines.has(trimmedLine) || !trimmedLine.startsWith("<")) {
        uniqueLines.push(line);
        seenLines.add(trimmedLine);
      }
    }

    code = uniqueLines.join("\n");
  }

  return {
    ...snippet,
    code
  };
}
/**
 * Cleans and formats a code snippet by removing unnecessary elements and standardizing whitespace.
 *
 * @param {*} code - The code snippet to clean. Should be a string, but will be converted if not.
 * @returns {string} The cleaned and formatted code snippet.
 *
 * @description
 * This function performs the following operations:
 * 1. Converts non-string input to string.
 * 2. Removes "Copy" and "Copy(or ⌘C)" text from the beginning and end.
 * 3. Removes "Press Enter to start editing" and subsequent text.
 * 4. Removes JSDoc comments and specific React component styles.
 * 5. Removes all comments (both multi-line and single-line).
 * 6. Removes duplicate PopupState components.
 * 7. Removes duplicate code snippets (specific to these examples).
 * 8. Removes leading and trailing whitespace from each line.
 * 9. Reduces multiple consecutive newlines to a single newline.
 * 10. Removes leading spaces from each line.
 * 11. Replaces tabs with two spaces.
 * 12. Reduces multiple consecutive spaces to a single space.
 * 13. Trims leading and trailing whitespace from the entire string.
 */
const cleanCodeSnippetMain = (code) => {
  // Convert non-string input to string
  if (typeof code !== "string") {
    logger.warn("Input to cleanCodeSnippetMain is not a string. Converting to string.");
    code = String(code);
  }
  return (
    code
      // Remove "Copy" text
      .replace(/^Copy(\(or ⌘C\))?\s*|\s*Copy(Copied)?\(or ⌘C\)\s*$/g, "")
      // Remove "Press Enter to start editing" text
      .replace(/Press Enter to start editing.*$/, "")
      // Remove JSDoc comments and specific React component styles
      .replace(/\/\*\*[\s\S]*?\*\/|\.npm__react-simple-code-editor__[\s\S]*?}\s*}/g, "")
      // Remove all comments
      .replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, "")
      // Remove duplicate PopupState components
      .replace(/(<PopupState[\s\S]*?<\/PopupState>)[\s\S]*\1/g, "$1")
      // Remove empty lines
      .replace(/^\s*[\r\n]/gm, "")
      // Remove leading and trailing whitespace from each line
      .replace(/^\s+|\s+$/g, "")
      // Reduce multiple newlines to a single newline
      .replace(/\n{2,}/g, "\n")
      // Remove leading spaces from each line
      .replace(/^\s+/gm, "")
      // Replace tabs with two spaces
      .replace(/\t/g, "  ")
      // Reduce multiple spaces to a single space
      .replace(/\s{2,}/g, " ")
      // Trim leading and trailing whitespace from the entire string
      .trim()
  );
};

module.exports = {
  cleanWhitespace,
  removeHtmlComments,
  normalizeLineBreaks,
  removeIndentation,
  unescapeHtml,
  removeHtmlTags,
  cleanCodeSnippetGeneral,
  cleanCodeSnippetMain
};
