const { logger } = require("@config/logging");
const prettier = require("prettier");

/**
 * Removes duplicate code blocks from the given code string.
 * @param {string} code - The input code string to process.
 * @returns {string} The modified code string with duplicate blocks removed.
 */
const removeDuplicate = (code) =>
  (code = code.replace(/^(import[\s\S]*?export default function [^(]+\(\) {[\s\S]*?})\1$/, "$1"));

/**
 * Detects whether the code is TypeScript or JavaScript.
 * @param {string} code - The code to analyze.
 * @returns {string} - The detected parser type ('typescript' or 'babel').
 */
function detectFileType(code) {
  try {
    if (typeof code !== "string") {
      throw new TypeError(`Input code must be a string, received ${typeof code}`);
    }
    const tsxRegex = /(?:import|export).*from\s+['"].*['"];?|<.*?>/;
    const tsKeywords = /(?:interface|type|namespace|enum|abstract|implements|declare)/;
    return tsxRegex.test(code) || tsKeywords.test(code) ? "typescript" : "babel";
  } catch (error) {
    logger.error("An error occurred while detecting file type:", error);
    throw error;
  }
}

/**
 * Formats the given code using Prettier.
 * @param {string} code - The code to format.
 * @param {string} parser - The parser to use ('typescript' or 'babel').
 * @returns {string} - The formatted code.
 */
async function formatCode(code, parser) {
  try {
    if (typeof code !== "string") {
      throw new TypeError(`Input code must be a string, received ${typeof code}`);
    }
    return await prettier.format(code, {
      parser: parser,
      plugins: [require("prettier-plugin-organize-imports")],
      semi: true,
      singleQuote: true,
      trailingComma: "es5",
      printWidth: 80,
      tabWidth: 2,
      bracketSpacing: true,
      jsxBracketSameLine: false,
      jsxSingleQuote: false,
      arrowParens: "avoid",
      endOfLine: "auto"
    });
  } catch (error) {
    logger.error("Prettier formatting failed:", error);
    // throw error;
    return code;
  }
}

/**
 * Adds an extra line after the last import statement.
 * @param {string} code - The code to modify.
 * @returns {string} - The modified code.
 */
function addExtraLineAfterImports(code) {
  try {
    if (typeof code !== "string") {
      throw new TypeError(`Input code must be a string, received ${typeof code}`);
    }
    code = String(code);
    const lines = code.split("\n");
    /**
     * Finds the index of the last import statement in an array of code lines.
     * @param {string[]} lines - An array of strings representing lines of code.
     * @returns {number} The index of the last import statement, or -1 if no import statement is found.
     */
    const lastImportIndex = lines.findLastIndex((line) => line.trim().startsWith("import"));

    if (lastImportIndex !== -1) {
      lines.splice(lastImportIndex + 1, 0, "");
    }

    return lines.join("\n");
  } catch (error) {
    logger.error("An error occurred while adding an extra line after imports:", error);
    throw error;
  }
}

/**
 * Formats the given code.
 * @param {string} code - The code to format.
 * @returns {string} - The formatted code.
 */
async function formatAndCleanCode(code) {
  try {
    if (typeof code !== "string") {
      logger.warn("Non-string code passed to formatAndCleanCode. Converting to string.");
      code = String(code);
    }
    const parser = detectFileType(code);
    let formattedCode = await formatCode(removeDuplicate(code), parser);
    formattedCode = addExtraLineAfterImports(formattedCode);
    return formattedCode;
  } catch (error) {
    logger.error("An error occurred while formatting and cleaning the code:", error);
    throw error;
  }
}

/**
 * Formats documentation content into HTML.
 * @param {string} content
 * @returns {string}
 */
function formatDocumentationFromChunks(content) {
  if (!content || !Array.isArray(content)) {
    logger.error(`[ERROR][formatDocumentation]: data is undefined or not an array`);
    return ""; // Return an empty string or handle appropriately
  }
  try {
    const sections = content?.split("\n\n");
    /**
     * Formats an array of text sections by converting Markdown-style headers to HTML and wrapping other lines in paragraph tags.
     * @param {string[]} sections - An array of text sections to be formatted.
     * @returns {string[]} An array of formatted HTML sections.
     */
    const formattedSections = sections.map((section) => {
      if (section.startsWith("```")) {
        return section;
      }
      const lines = section.split("\n");
      const formattedLines = lines.map((line) => {
        if (line.startsWith("# ")) {
          return `<h1>${line.slice(2)}</h1>`;
        } else if (line.startsWith("## ")) {
          return `<h2>${line.slice(3)}</h2>`;
        } else if (line.startsWith("### ")) {
          return `<h3>${line.slice(4)}</h3>`;
        } else {
          return `<p>${line}</p>`;
        }
      });
      return formattedLines.join("\n");
    });
    return formattedSections.join("\n\n");
  } catch (error) {
    logger.error(`[ERROR][formatDocumentation]: ${error.message}`);
    throw error;
  }
}
/**
 * Formats the provided content into a standardized documentation structure.
 * @param {string} content - The content to be formatted as documentation.
 * @returns {string} A formatted string containing the documentation with added decorative elements.
 * @throws {Error} Implicitly throws an error when content is undefined or not a string (logged via logger.error).
 */
function formatDocumentationFromString(content) {
  if (!content) {
    logger.error(`[ERROR][formatDocumentation]: data is undefined or not an array`);
    return ""; // Return an empty string or handle appropriately
  }
  return `
    --- DOCUMENTATION ---
    ${content}
    --------------------------------
  `;
}

/**
 * Formats chat completion content.
 * @param {string} content
 * @returns {string}
 */
function formatChatCompletionContent(content) {
  return `
    --- CHAT COMPLETION RESPONSE ---
    ${content}
    --------------------------------
  `;
}

/**
 * Formats chat prompt build.
 * @param {string} systemContent
 * @param {string} assistantInstructions
 * @param {string} formattedPrompt
 * @returns {string}
 */
function formatChatPromptBuild(systemContent, assistantInstructions, formattedPrompt) {
  return `
    --- CHAT COMPLETION RESPONSE ---
      --- SYSTEM / ASSISTANT PROMPTS ---
      | SYSTEM: [${systemContent}]
      | ASSISTANT: [${assistantInstructions}]
      ----------------------------------
      --- USER FORMATTED PROMPT ---
      | FORMATTED PROMPT: ${formattedPrompt}
      -----------------------------
    --------------------------------
  `;
}

module.exports = {
  formatAndCleanCode,
  formatDocumentationFromChunks,
  formatDocumentationFromString,
  formatChatCompletionContent,
  formatChatPromptBuild
};
