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
// function cleanCodeSnippet(code) {
//   return removeIndentation(
//     normalizeLineBreaks(removeHtmlTags(unescapeHtml(removeHtmlComments(cleanWhitespace(code)))))
//   );
// }
function cleanCodeSnippet(snippet) {
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

module.exports = {
  cleanWhitespace,
  removeHtmlComments,
  normalizeLineBreaks,
  removeIndentation,
  unescapeHtml,
  removeHtmlTags,
  cleanCodeSnippet,
};
