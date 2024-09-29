const prettier = require('prettier');

/**
 * Detects whether the code is TypeScript or JavaScript.
 * @param {string} code - The code to analyze.
 * @returns {string} - The detected parser type ('typescript' or 'babel').
 */
function detectFileType(code) {
  const tsRegex =
    /(?:import|export).*from\s+['"].*['"];?|<.*?>|(?:interface|type|namespace|enum|abstract|implements|declare)/;
  return tsRegex.test(code) ? 'typescript' : 'babel';
}

/**
 * Formats the given code using Prettier.
 * @param {string} code - The code to format.
 * @param {string} parser - The parser to use ('typescript' or 'babel').
 * @returns {string} - The formatted code.
 */
function formatCode(code, parser) {
  try {
    return prettier.format(code, {
      parser,
      plugins: [require('prettier-plugin-organize-imports')],
      semi: true,
      singleQuote: true,
      trailingComma: 'es5',
      printWidth: 80,
      tabWidth: 2,
      bracketSpacing: true,
      jsxBracketSameLine: false,
      jsxSingleQuote: false,
      arrowParens: 'avoid',
      endOfLine: 'auto',
    });
  } catch (error) {
    console.error('Prettier formatting failed:', error);
    throw error;
  }
}

/**
 * Adds an extra line after the last import statement.
 * @param {string} code - The code to modify.
 * @returns {string} - The modified code.
 */
function addExtraLineAfterImports(code) {
  const lines = code.split('\n');
  const lastImportIndex = lines.findLastIndex((line) => line.trim().startsWith('import'));

  if (lastImportIndex !== -1) {
    lines.splice(lastImportIndex + 1, 0, '');
  }

  return lines.join('\n');
}

/**
 * Formats the given code.
 * @param {string} code - The code to format.
 * @returns {string} - The formatted code.
 */
function formatAndCleanCode(code) {
  if (typeof code !== 'string') {
    throw new Error('Input is not a string');
  }

  // Remove duplicate code
  code = code.replace(/^(import[\s\S]*?export default function [^(]+\(\) {[\s\S]*?})\1$/, '$1');

  const parser = detectFileType(code);
  let formattedCode = formatCode(code, parser);
  formattedCode = addExtraLineAfterImports(formattedCode);

  return formattedCode;
}

module.exports = {
  formatAndCleanCode,
};
