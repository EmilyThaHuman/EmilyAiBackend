function identifyCodeType(snippet) {
  // Remove comments and trim whitespace
  const cleanedCode = snippet.replace(/\/\/.*|\/\*[\s\S]*?\*\//g, "").trim();

  // Helper function to check if the code contains a pattern
  const containsPattern = (pattern) => new RegExp(pattern, "ms").test(cleanedCode);

  // Check for different code types
  if (containsPattern("^import\\s+.*from\\s+['\"]")) {
    return "Import Statement";
  } else if (containsPattern("^export\\s+(default\\s+)?(function|const|let|var|class)")) {
    return "Export Statement";
  } else if (containsPattern("^interface\\s+\\w+\\s*\\{")) {
    return "Interface";
  } else if (containsPattern("^type\\s+\\w+\\s*=")) {
    return "Type Definition";
  } else if (containsPattern("(const|let|var)\\s+\\w+\\s*=\\s*\\([^)]*\\)\\s*=>")) {
    return "Arrow Function";
  } else if (containsPattern("function\\s+\\w+\\s*\\([^)]*\\)\\s*\\{")) {
    return "Function Declaration";
  } else if (containsPattern("(const|let|var)\\s+\\w+\\s*=\\s*function\\s*\\([^)]*\\)")) {
    return "Function Expression";
  } else if (containsPattern("(const|let|var)\\s+\\w+\\s*=\\s*use[A-Z]\\w*\\(")) {
    return "React Hook";
  } else if (containsPattern("(const|let|var)\\s+\\w+\\s*=\\s*\\{[\\s\\S]*\\}")) {
    return "Object Declaration";
  } else if (containsPattern("(const|let|var)\\s+\\w+\\s*=\\s*\\[[\\s\\S]*\\]")) {
    return "Array Declaration";
  } else if (containsPattern("class\\s+\\w+\\s*(extends\\s+\\w+\\s*)?\\{")) {
    return "Class Declaration";
  } else if (containsPattern("(const|let|var)\\s+\\w+\\s*=\\s*class\\s*\\{")) {
    return "Class Expression";
  } else if (containsPattern("<\\w+[^>]*>[\\s\\S]*<\\/\\w+>")) {
    return "JSX Component";
  } else if (
    containsPattern(
      "(const|let|var)\\s+\\w+\\s*=\\s*\\(\\s*\\)\\s*=>\\s*\\{[\\s\\S]*return\\s*\\([\\s\\S]*<[\\s\\S]*>[\\s\\S]*<\\/[\\s\\S]*>[\\s\\S]*\\)"
    )
  ) {
    return "React Functional Component";
  } else if (containsPattern("(const|let|var)\\s+\\w+\\s*=\\s*React\\.memo\\(")) {
    return "Memoized React Component";
  } else if (containsPattern("(const|let|var)\\s+\\w+\\s*=\\s*styled\\.")) {
    return "Styled Component";
  } else if (
    containsPattern("(const|let|var)\\s+\\w+\\s*=\\s*\\(\\s*state\\s*,\\s*action\\s*\\)\\s*=>")
  ) {
    return "Redux Reducer";
  } else if (containsPattern("(const|let|var)\\s+\\w+\\s*=\\s*createSlice\\(")) {
    return "Redux Toolkit Slice";
  } else if (containsPattern("(const|let|var)\\s+\\w+\\s*=\\s*createAsyncThunk\\(")) {
    return "Redux Toolkit Async Thunk";
  } else if (containsPattern("(get|post|put|delete|patch)\\s*\\(['\"][^'\"]+['\"]")) {
    return "API Request";
  } else if (containsPattern("describe\\(['\"][^'\"]+['\"]\\s*,\\s*\\(\\)\\s*=>\\s*\\{")) {
    return "Test Suite";
  } else if (containsPattern("it\\(['\"][^'\"]+['\"]\\s*,\\s*\\(\\)\\s*=>\\s*\\{")) {
    return "Test Case";
  } else if (containsPattern("(const|let|var)\\s+\\w+\\s*=\\s*require\\(['\"][^'\"]+['\"]\\)")) {
    return "CommonJS Import";
  } else if (containsPattern("module\\.exports\\s*=")) {
    return "CommonJS Export";
  } else if (containsPattern("async\\s+function")) {
    return "Async Function";
  } else if (containsPattern("new\\s+Promise\\(")) {
    return "Promise Creation";
  } else if (containsPattern("\\.then\\(")) {
    return "Promise Chain";
  } else if (containsPattern("try\\s*\\{[\\s\\S]*\\}\\s*catch")) {
    return "Try-Catch Block";
  }

  return "Unknown";
}
function getDefaultExportFunctionName(snippet) {
  // Remove comments and trim whitespace
  const cleanedCode = snippet.replace(/\/\/.*|\/\*[\s\S]*?\*\//g, "").trim();

  // Regular expression to match default export function declarations
  const defaultExportRegex = /export\s+default\s+function\s+(\w+)/;

  // Regular expression to match default export arrow functions
  const defaultExportArrowRegex =
    /export\s+default\s+(?:const|let|var)?\s*(\w+)\s*=\s*(?:\([^)]*\)|[^=]*)\s*=>/;

  // Try to match default export function declaration
  const declarationMatch = cleanedCode.match(defaultExportRegex);
  if (declarationMatch) {
    return declarationMatch[1];
  }

  // Try to match default export arrow function
  const arrowMatch = cleanedCode.match(defaultExportArrowRegex);
  if (arrowMatch) {
    return arrowMatch[1];
  }

  // If no match found, return null
  return null;
}
module.exports = {
  identifyCodeType,
  getDefaultExportFunctionName
};
