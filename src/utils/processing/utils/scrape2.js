// I need you to generate a function or functions for identifying the type of code isolated within each snippet. These types might include components, props, interfaces, functions, hooks, etc.
const fs = require('fs').promises;
const path = require('path');
const { logger } = require('@/config/logging');
const { default: puppeteer } = require('puppeteer');
// New function to clean code snippets
const cleanCodeSnippet = (code) => {
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
const sanitizeFileName = (fileName) => fileName.toLowerCase().replace(/[^a-z0-9]+/g, '_');
function identifyCodeType(snippet) {
  // Remove comments and trim whitespace
  const cleanedCode = snippet.replace(/\/\/.*|\/\*[\s\S]*?\*\//g, '').trim();

  // Check for different code types
  if (cleanedCode.startsWith('import ') || cleanedCode.startsWith('export ')) {
    return 'Import/Export Statement';
  } else if (cleanedCode.startsWith('interface ')) {
    return 'Interface';
  } else if (cleanedCode.startsWith('type ')) {
    return 'Type Definition';
  } else if (cleanedCode.match(/^(const|let|var)\s+\w+\s*=\s*\(\s*\)\s*=>/)) {
    return 'Arrow Function';
  } else if (cleanedCode.match(/^function\s+\w+\s*\(/)) {
    return 'Function Declaration';
  } else if (cleanedCode.match(/^(const|let|var)\s+\w+\s*=\s*function\s*\(/)) {
    return 'Function Expression';
  } else if (cleanedCode.match(/^(const|let|var)\s+\w+\s*=\s*use[A-Z]/)) {
    return 'React Hook';
  } else if (cleanedCode.match(/^(const|let|var)\s+\w+\s*=\s*\{/)) {
    return 'Object Declaration';
  } else if (cleanedCode.match(/^(const|let|var)\s+\w+\s*=\s*\[/)) {
    return 'Array Declaration';
  } else if (cleanedCode.match(/^(class|const\s+\w+\s*=\s*class)/)) {
    return 'Class Declaration';
  } else if (cleanedCode.match(/^<\w+/)) {
    return 'JSX Component';
  }

  return 'Unknown';
}

const scrapeCode = async (componentUrl, componentLibrary) => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  const createdFiles = [];

  try {
    await page.goto(componentUrl, { waitUntil: 'networkidle0' });

    const { componentName, snippets } = await page.evaluate(() => {
      const componentName = document.querySelector('h1')?.textContent.trim() || 'Unknown';
      const snippetElements = document.querySelectorAll('.MuiCode-root');

      const snippets = Array.from(snippetElements).map((snippet) => {
        const parentElement = snippet.closest('.MuiPaper-root');
        return {
          title: parentElement?.querySelector('h2, h3')?.textContent || 'Untitled',
          code: snippet.textContent,
          language: snippet.getAttribute('data-language') || 'jsx',
          description: parentElement?.querySelector('p')?.textContent || '',
        };
      });

      return { componentName, snippets };
    });

    logger.info(`Snippets for ${componentName}: ${snippets.length}`);

    if (snippets.length > 0) {
      const baseDir = path.join(__dirname, '../../../../public/scraped_docs', componentLibrary);
      await fs.mkdir(baseDir, { recursive: true });

      const allSnippets = snippets.map((snippet) => ({
        component: componentName,
        ...snippet,
        code: cleanCodeSnippet(snippet.code), // Clean the code snippet
        codeType: identifyCodeType(cleanCodeSnippet(snippet.code)), // Add this line
      }));

      const fileName = `${sanitizeFileName(componentName)}_snippets.json`;
      const filePath = path.join(baseDir, fileName);

      await fs.writeFile(filePath, JSON.stringify(allSnippets, null, 2));
      logger.info(`Data saved to ${filePath}`);
      createdFiles.push(filePath);

      const snippetsDir = path.join(baseDir, 'snippets', sanitizeFileName(componentName));
      await fs.mkdir(snippetsDir, { recursive: true });

      await Promise.all(
        snippets.map(async (snippet, index) => {
          const snippetFileName = `snippet_${index + 1}.${snippet.language}`;
          const snippetFilePath = path.join(snippetsDir, snippetFileName);
          await fs.writeFile(snippetFilePath, cleanCodeSnippet(snippet.code));
          logger.info(`Snippet saved to ${snippetFilePath}`);
          createdFiles.push(snippetFilePath);
        })
      );
    } else {
      logger.warn('No snippets found. Check if the page structure has changed.');
    }
  } catch (error) {
    logger.error('Error during scraping:', error);
  } finally {
    await browser.close();
  }

  return createdFiles;
};

module.exports = { scrapeCode };

// const fs = require('fs').promises;
// const { logger } = require('@/config/logging');
// const path = require('path');
// const { default: puppeteer } = require('puppeteer');

// const scrapeCode = async (componentUrl, componentLibrary) => {
//   const browser = await puppeteer.launch();
//   const page = await browser.newPage();

//   const allSnippets = [];
//   const createdFiles = [];

//   try {
//     await page.goto(componentUrl, { waitUntil: 'networkidle0' });

//     const componentName = await page.evaluate(() => {
//       return document.querySelector('h1').textContent.trim();
//     });

//     const snippets = await page.evaluate(() => {
//       const snippetElements = document.querySelectorAll('.MuiCode-root');
//       return Array.from(snippetElements).map((snippet) => {
//         const code = snippet.textContent;
//         const language = snippet.getAttribute('data-language') || 'jsx';
//         const title =
//           snippet.closest('.MuiPaper-root')?.querySelector('h2, h3')?.textContent || 'Untitled';
//         const description =
//           snippet.closest('.MuiPaper-root')?.querySelector('p')?.textContent || '';

//         return {
//           title,
//           code,
//           language,
//           description,
//         };
//       });
//     });

//     allSnippets.push(
//       ...snippets.map((snippet) => ({
//         component: componentName,
//         ...snippet,
//       }))
//     );

//     logger.info(`Snippets for ${componentName}: `, snippets.length);
//     if (snippets.length > 0) {
//       // Create base directory for the component library
//       const baseDir = path.join(__dirname, '../../../../public/scraped_docs', componentLibrary);
//       await fs.mkdir(baseDir, { recursive: true });

//       // Save full JSON data
//       const fileName = `${componentName.toLowerCase().replace(/\s+/g, '_')}_snippets.json`;
//       const filePath = path.join(baseDir, fileName);
//       fs.writeFileSync(filePath, JSON.stringify(allSnippets, null, 2));
//       logger.info(`Data saved to ${filePath}`);
//       createdFiles.push(filePath);

//       // Create individual files for each snippet
//       const snippetsDir = path.join(
//         baseDir,
//         'snippets',
//         componentName.toLowerCase().replace(/\s+/g, '_')
//       );
//       fs.mkdirSync(snippetsDir, { recursive: true });

//       snippets.forEach((snippet, index) => {
//         const snippetFileName = `snippet_${index + 1}.${snippet.language}`;
//         const snippetFilePath = path.join(snippetsDir, snippetFileName);
//         fs.writeFileSync(snippetFilePath, snippet.code);
//         logger.info(`Snippet saved to ${snippetFilePath}`);
//         createdFiles.push(snippetFilePath);
//       });
//     } else {
//       logger.info('No snippets found. Check if the page structure has changed.');
//     }
//   } catch (error) {
//     logger.error('Error during scraping:', error);
//   } finally {
//     await browser.close();
//   }
//   return createdFiles;
//   //   const fileName = `${componentName.toLowerCase().replace(/\s+/g, '_')}_snippets.json`;
//   //   const filePath = path.join(__dirname, `../../../../public/scraped_docs/${componentLibrary}`, fileName);
//   //   fs.writeFileSync(filePath, JSON.stringify(allSnippets, null, 2), 'utf8');

//   //   // fs.writeFileSync(fileName, JSON.stringify(allSnippets, null, 2));

//   //   logger.info(`Data saved to ${fileName}`);

//   // } catch (error) {
//   //   logger.error('Error during scraping:', error);
//   // } finally {
//   //   await browser.close();
//   // }
// };

// module.exports = {
//   scrapeCode,
// };

// // Example usage
// // const componentUrl = 'https://mui.com/material-ui/react-modal/';
// // scrape(componentUrl);
