/* eslint-disable no-unused-vars */
const fs = require('fs').promises;
const path = require('path');
const prettier = require('prettier');

const removeDuplicate = (code) =>
  (code = code.replace(/^(import[\s\S]*?export default function [^(]+\(\) {[\s\S]*?})\1$/, '$1'));
async function detectFileType(code) {
  // Check for TypeScript-specific syntax
  const tsxRegex = /(?:import|export).*from\s+['"].*['"];?|<.*?>/;
  const tsKeywords = /(?:interface|type|namespace|enum|abstract|implements|declare)/;

  if (tsxRegex.test(code) || tsKeywords.test(code)) {
    return 'typescript';
  }

  // If no TypeScript-specific syntax is found, default to JavaScript
  return 'babel';
}
async function formatCode(code, parser) {
  try {
    return await prettier.format(code, {
      parser: parser,
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
    return code;
  }
}
function addExtraLineAfterImports(code) {
  const lines = code.split('\n');
  const lastImportIndex = lines.findLastIndex((line) => line.trim().startsWith('import'));

  if (lastImportIndex !== -1) {
    lines.splice(lastImportIndex + 1, 0, '');
  }

  return lines.join('\n');
}

async function formatAndSaveCode(code, outputDir, fileName) {
  try {
    if (typeof code !== 'string') {
      throw new Error('Input is not a string');
    }
    const parser = await detectFileType(code);
    let formattedCode = await formatCode(
      code.replace(/^(import[\s\S]*?export default function [^(]+\(\) {[\s\S]*?})\1$/, '$1'),
      parser
    );
    // let formattedCode = await formatCode(
    //   code.replace(/^(import[\s\S]*?export default function [^(]+\(\) {[\s\S]*?})\1$/, '$1')
    // );

    formattedCode = addExtraLineAfterImports(formattedCode);

    await fs.mkdir(outputDir, { recursive: true });
    const outputPath = path.join(outputDir, fileName);
    await fs.writeFile(outputPath, formattedCode);

    console.log(`Formatted code saved as ${outputPath}`);
    return true;
  } catch (error) {
    console.error('An error occurred while formatting and saving the code:', error);
    return false;
  }
}

async function runTest() {
  const snippetDir = path.join(
    __dirname,
    '../public/scraped_docs/Material-UI (MUI)/snippets/text_field'
  );
  const outputDir = path.join(__dirname, 'formatted');
  const filenum = 7;
  const fileName = `formatted_snippet_${filenum}.jsx`;

  try {
    const snippet = await fs.readFile(path.join(snippetDir, `snippet_${filenum}.jsx`), 'utf8');
    const success = await formatAndSaveCode(snippet, outputDir, fileName);
    console.log(
      success
        ? 'Code formatting and saving completed successfully.'
        : 'Code formatting and saving failed.'
    );
  } catch (error) {
    console.error('Error in runTest:', error);
  }
}

runTest();
/*
const traverse = require('@babel/traverse').default;
const t = require('@babel/types');
const generate = require('@babel/generator').default;

function parseCode(code) {
  return parser.parse(code, {
    sourceType: 'module',
    plugins: ['jsx'],
  });
}
function formatCodeSnippet(code) {
  // First, use Prettier to format the code
  let formattedCode;
  try {
    formattedCode = prettier.format(code, {
      parser: 'babel',
      plugins: [
        'eslint-plugin-prettier',
        'eslint-plugin-react',
        'eslint-plugin-import',
        'eslint-plugin-jsx-a11y',
      ],
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
      proseWrap: 'preserve',
    });
  } catch (error) {
    console.error('Prettier formatting failed:', error);
    return code; // Return original code if formatting fails
  }

  if (typeof formattedCode !== 'string') {
    console.error('Prettier did not return a string:', formattedCode);
    return code; // Return original code if result is not a string
  }
  // Split the code into lines
  let lines = formattedCode.split('\n');

  // Find the last import statement
  let lastImportIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('import ')) {
      lastImportIndex = i;
    } else if (lastImportIndex !== -1) {
      break;
    }
  }

  // If we found imports, add an extra newline after the last one
  if (lastImportIndex !== -1) {
    lines.splice(lastImportIndex + 1, 0, '');
  }

  // Join the lines back together
  return lines.join('\n');
}
const removeDuplicate = (code) =>
  (code = code.replace(/^(import[\s\S]*?export default function [^(]+\(\) {[\s\S]*?})\1$/, '$1'));
const splitIntoLines = (code) => code.trim().split('\n');
const addIndentation = (lines, indentSize = 2) => {
  let indentLevel = 0;
  return lines.map((line) => {
    line = line.trim();
    if (line.endsWith('}') || line.endsWith(')') || line.endsWith('/>') || line === '</div>') {
      indentLevel--;
    }
    const formattedLine = ' '.repeat(indentLevel * indentSize) + line;
    if (line.endsWith('{') || line.endsWith('(') || line.endsWith('>') || line === '<div>') {
      indentLevel++;
    }
    return formattedLine;
  });
};
const reconstructCode = (lines, imports, functionName) =>
  `${imports ? imports[0].trim() : ''}

export default function ${functionName}() {
${lines.join('\n')}
}`.trim();

const formatReactCode = (code) => {
  const imports = code.match(/^import[\s\S]*?(?=export)/);
  const functionMatch = code.match(/export default function (\w+)/);
  const functionName = functionMatch ? functionMatch[1] : 'Component';
  const reconstructedCode = reconstructCode(
    addIndentation(splitIntoLines(removeDuplicate(code)), 2),
    imports,
    functionName
  );
  return reconstructedCode;
};
*/
