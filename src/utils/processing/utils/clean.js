function cleanWhitespace(code) {
  return code.trim();
}
function removeHtmlComments(code) {
  return code.replace(/<!--[\s\S]*?-->/g, '');
}
function normalizeLineBreaks(code) {
  return code.replace(/\n{3,}/g, '\n\n');
}
function removeIndentation(code) {
  const lines = code.split('\n');
  const minIndent = lines.reduce((min, line) => {
    const indent = line.match(/^\s*/)[0].length;
    return line.trim() ? Math.min(min, indent) : min;
  }, Infinity);
  return lines.map((line) => line.slice(minIndent)).join('\n');
}
function unescapeHtml(code) {
  const entities = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
  };
  return code.replace(/&amp;|&lt;|&gt;|&quot;|&#39;/g, (match) => entities[match]);
}
function removeHtmlTags(code) {
  return code.replace(/<\/?[^>]+(>|$)/g, '');
}
function cleanCodeSnippetGeneral(snippet) {
  let { code, language } = snippet;

  // Remove copy commands and surrounding whitespace
  code = code.replace(/^Copy(\(or ⌘C\))?\s*|\s*Copy(Copied)?\(or ⌘C\)\s*$/g, '');

  // Remove "Press Enter to start editing" and similar phrases
  code = code.replace(/Press Enter to start editing.*$/, '');

  // Remove CSS comments and styles (specific to these examples)
  code = code.replace(/\/\*\*[\s\S]*?\*\/|\.npm__react-simple-code-editor__[\s\S]*?}\s*}/g, '');

  // Remove empty lines
  code = code
    .split('\n')
    .filter((line) => line.trim() !== '')
    .join('\n');

  // Trim leading and trailing whitespace
  code = code.trim();

  // For JSX, remove any leading XML-like tags that appear to be duplicates
  if (language === 'jsx') {
    const lines = code.split('\n');
    const uniqueLines = [];
    let seenLines = new Set();

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!seenLines.has(trimmedLine) || !trimmedLine.startsWith('<')) {
        uniqueLines.push(line);
        seenLines.add(trimmedLine);
      }
    }

    code = uniqueLines.join('\n');
  }

  return {
    ...snippet,
    code,
  };
}
const cleanCodeSnippetMain = (code) => {
  return code
    .replace(/^Copy(\(or ⌘C\))?\s*|\s*Copy(Copied)?\(or ⌘C\)\s*$/g, '')
    .replace(/Press Enter to start editing.*$/, '')
    .replace(/\/\*\*[\s\S]*?\*\/|\.npm__react-simple-code-editor__[\s\S]*?}\s*}/g, '')
    .replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '')
    .replace(/(<PopupState[\s\S]*?<\/PopupState>)[\s\S]*\1/g, '$1')
    .replace(/^\s*[\r\n]/gm, '')
    .replace(/^\s+|\s+$/g, '')
    .replace(/\n{2,}/g, '\n')
    .replace(/^\s+/gm, '')
    .replace(/\t/g, '  ')
    .replace(/\s{2,}/g, ' ')
    .trim();
};
function formatReactCode(code) {
  // Remove duplicate code if present
  code = code.replace(/^(import[\s\S]*?export default function [^(]+\(\) {[\s\S]*?})\1$/, '$1');

  // Split the code into lines
  let lines = code.trim().split('\n');

  // Initialize variables
  let formattedLines = [];
  let indentLevel = 0;
  const indentSize = 2;

  // Helper function to add indentation
  const indent = (level) => ' '.repeat(level * indentSize);

  // Process each line
  lines.forEach((line, index) => {
    line = line.trim();

    // Decrease indent for closing brackets and tags
    if (
      line.startsWith('}') ||
      line.startsWith(')') ||
      line.startsWith('/>') ||
      line === '</div>'
    ) {
      indentLevel--;
    }

    // Special case for self-closing tags
    if (line.endsWith('/>') && !line.startsWith('<')) {
      indentLevel--;
    }

    // Add the line with proper indentation
    formattedLines.push(indent(indentLevel) + line);

    // Increase indent for opening brackets and tags
    if (line.endsWith('{') || line.endsWith('(') || line.endsWith('>') || line === '<div>') {
      indentLevel++;
    }

    // Special case for props spanning multiple lines
    if (
      line.includes('=') &&
      !line.includes('=>') &&
      !line.endsWith('"') &&
      !line.endsWith("'") &&
      !line.endsWith('/>')
    ) {
      indentLevel++;
    }

    // Decrease indent after the last prop
    if (line.endsWith('"') || line.endsWith("'")) {
      if (
        lines[index + 1] &&
        (lines[index + 1].trim().startsWith('/>') || lines[index + 1].trim().startsWith('>'))
      ) {
        indentLevel--;
      }
    }
  });

  // Reconstruct the formatted code
  const imports = code.match(/^import[\s\S]*?(?=export)/);
  const functionMatch = code.match(/export default function (\w+)/);
  const functionName = functionMatch ? functionMatch[1] : 'Component';

  const formattedCode = `${imports ? imports[0].trim() : ''}

export default function ${functionName}() {
${formattedLines.join('\n')}
}`.trim();

  return formattedCode;
}

module.exports = {
  cleanWhitespace,
  removeHtmlComments,
  normalizeLineBreaks,
  removeIndentation,
  unescapeHtml,
  removeHtmlTags,
  cleanCodeSnippetGeneral,
  cleanCodeSnippetMain,
  formatReactCode,
};
