const fs = require("fs");
const path = require("path");
const { default: puppeteer } = require("puppeteer");

const scrapeCode = async (componentUrl, componentLibrary) => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  const allSnippets = [];

  try {
    await page.goto(componentUrl);

    const componentName = await page.evaluate(() => {
      return document.querySelector("h1").textContent.trim();
    });

    const snippets = await page.evaluate(() => {
      const snippetElements = document.querySelectorAll(".MuiCode-root");
      return Array.from(snippetElements).map((snippet) => {
        const code = snippet.textContent;
        const language = snippet.getAttribute("data-language") || "jsx";
        const title =
          snippet.closest(".MuiPaper-root")?.querySelector("h2, h3")?.textContent || "Untitled";
        const description =
          snippet.closest(".MuiPaper-root")?.querySelector("p")?.textContent || "";

        return {
          title,
          code,
          language,
          description
        };
      });
    });

    allSnippets.push(
      ...snippets.map((snippet) => ({
        component: componentName,
        ...snippet
      }))
    );

    console.log(`Snippets for ${componentName}: `, snippets.length);

    const fileName = `${componentName.toLowerCase().replace(/\s+/g, "_")}_snippets.json`;
    const filePath = path.join(__dirname, `../public/scraped_docs/${componentLibrary}`, fileName);
    fs.writeFileSync(filePath, JSON.stringify(allSnippets, null, 2), "utf8");

    // fs.writeFileSync(fileName, JSON.stringify(allSnippets, null, 2));

    console.log(`Data saved to ${fileName}`);
  } catch (error) {
    console.error("Error during scraping:", error);
  } finally {
    await browser.close();
  }
};

async function runTest() {
  const testUrls = [
    "https://mui.com/material-ui/react-button/",
    "https://mui.com/material-ui/react-modal/",
    "https://mui.com/material-ui/react-popover/"
  ];

  for (const url of testUrls) {
    console.log(`Testing scraper with URL: ${url}`);
    await scrapeCode(url);
    console.log("-----------------------------------");
  }
}

runTest().catch(console.error);
// import { logger } from "@config/logging";

// const scrapeCode = async (componentUrl, componentLibrary) => {
//   const browser = await puppeteer.launch({ headless: "new" });
//   const page = await browser.newPage();
//   const createdFiles = [];

//   try {
//     await page.goto(componentUrl, { waitUntil: "networkidle0" });

//     // Wait for the buttons to be loaded
//     await page.waitForSelector(".MuiButton-root.MuiButton-text");

//     // Click all "Expand code" buttons
//     await clickExpandButtons(page);

//     logger.info("All expand code buttons clicked successfully.");

//     const { componentName, snippets } = await extractComponentData(page);

//     logger.info(`Snippets for ${componentName}: ${snippets.length}`);

//     if (snippets.length > 0) {
//       await saveSnippets(componentName, componentLibrary, componentUrl, snippets);
//     } else {
//       logger.warn("No snippets found. Check if the page structure has changed.");
//     }
//   } catch (error) {
//     logger.error("Error during scraping:", error);
//   } finally {
//     await browser.close();
//   }

//   return createdFiles;
// };

// async function clickExpandButtons(page) {
//   let expandButtonsFound = true;
//   while (expandButtonsFound) {
//     expandButtonsFound = await page.evaluate(() => {
//       const buttons = Array.from(document.querySelectorAll(".MuiButton-root.MuiButton-text"));
//       const expandButton = buttons.find(
//         (button) =>
//           button.textContent.includes("Expand code") ||
//           button.textContent.includes("Show the full source")
//       );
//       if (expandButton) {
//         expandButton.click();
//         return true;
//       }
//       return false;
//     });
//     if (expandButtonsFound) {
//       await page.waitForTimeout(500); // Wait for any animations or content changes
//     }
//   }
// }

// async function extractComponentData(page) {
//   return page.evaluate(() => {
//     const componentName = document.querySelector("h1")?.textContent.trim() || "Unknown";
//     const snippetElements = document.querySelectorAll(".MuiCode-root");

//     const snippets = Array.from(snippetElements).map((snippet, index) => {
//       const parentElement = snippet.closest(".MuiPaper-root");
//       return {
//         title: parentElement?.querySelector("h2, h3")?.textContent || "Untitled",
//         code: snippet.textContent,
//         language: snippet.getAttribute("data-language") || "jsx",
//         description: parentElement?.querySelector("p")?.textContent || "",
//         sequence: index + 1
//       };
//     });

//     return { componentName, snippets };
//   });
// }

// async function saveSnippets(componentName, componentLibrary, componentUrl, snippets) {
//   const baseDir = path.join(__dirname, "../../../../public/scraped_docs", componentLibrary);
//   await fs.mkdir(baseDir, { recursive: true });

//   const allSnippets = snippets.map((snippet) => {
//     const cleanedCode = cleanCodeSnippet(snippet.code);
//     const codeType = identifyCodeType(cleanedCode);
//     const newTitle = `${getAbbreviation(componentLibrary)}_${componentName}`;
//     const abbreviatedTitle = getAbbreviation(componentLibrary);
//     return {
//       component: componentName,
//       url: componentUrl,
//       codeType: codeType,
//       library: componentLibrary,
//       abbreviation: abbreviatedTitle,
//       ...snippet,
//       title: newTitle,
//       code: cleanedCode
//     };
//   });

//   const fileName = `${sanitizeFileName(componentName)}_snippets.json`;
//   const filePath = path.join(baseDir, fileName);

//   await fs.writeFile(filePath, JSON.stringify(allSnippets, null, 2));
//   logger.info(`Data saved to ${filePath}`);
//   createdFiles.push(filePath);

//   const snippetsDir = path.join(baseDir, "snippets", sanitizeFileName(componentName));
//   await fs.mkdir(snippetsDir, { recursive: true });

//   await Promise.all(
//     snippets.map(async (snippet, index) => {
//       const snippetFileName = `snippet_${index + 1}.${snippet.language}`;
//       const snippetFilePath = path.join(snippetsDir, snippetFileName);
//       await fs.writeFile(snippetFilePath, cleanCodeSnippet(snippet.code));
//       logger.info(`Snippet saved to ${snippetFilePath}`);
//       createdFiles.push(snippetFilePath);
//     })
//   );
// }

// const fs = require('fs').promises;
// const path = require('path');
// const { logger } = require('@config/logging');
// const { default: puppeteer } = require('puppeteer');
// const { componentRegexPatterns } = require('@config');

// // Enhanced function to clean code snippets
// const cleanCodeSnippet = (code) => {
//   return code
//     .replace(/^Copy(\(or ⌘C\))?\s*|\s*Copy(Copied)?\(or ⌘C\)\s*$/g, '')
//     .replace(/Press Enter to start editing.*$/, '')
//     .replace(/\/\*\*[\s\S]*?\*\/|\.npm__react-simple-code-editor__[\s\S]*?}\s*}/g, '')
//     .replace(/^\s*[\r\n]/gm, '')
//     .replace(/^\s+|\s+$/g, '')
//     .replace(/\n{2,}/g, '\n')
//     .replace(/^\s+/gm, '')
//     .replace(/\t/g, '  ')
//     .trim();
// };
// function detectComponentTypes(content) {
//   const detectedComponents = [];

//   for (const [type, pattern] of Object.entries(componentRegexPatterns)) {
//     if (pattern.test(content)) {
//       detectedComponents.push(type);
//     }
//   }

//   return detectedComponents;
// }

// // New function to validate and format snippets
// const validateAndFormatSnippet = (code) => {
//   const hasImport = /import\s+.*from/.test(code);
//   const hasExport = /export\s+default/.test(code);
//   const hasFunctionDeclaration = /function\s+\w+\s*\(/.test(code);

//   if (hasImport && hasExport && hasFunctionDeclaration) {
//     // Format the code to ensure consistent indentation
//     const lines = code.split('\n');
//     let indentLevel = 0;
//     const formattedLines = lines.map((line) => {
//       if (line.includes('}')) indentLevel = Math.max(0, indentLevel - 1);
//       const formattedLine = '  '.repeat(indentLevel) + line.trim();
//       if (line.includes('{')) indentLevel++;
//       return formattedLine;
//     });
//     return formattedLines.join('\n');
//   }
//   return null; // Return null if the snippet is not complete
// };

// const sanitizeFileName = (fileName) => fileName.toLowerCase().replace(/[^a-z0-9]+/g, '_');

// const scrapeCode = async (componentUrl, componentLibrary) => {
//   const browser = await puppeteer.launch({ headless: 'new' });
//   const page = await browser.newPage();
//   const createdFiles = [];

//   try {
//     await page.goto(componentUrl, { waitUntil: 'networkidle0' });

//     const { componentName, snippets } = await page.evaluate(() => {
//       const componentName = document.querySelector('h1')?.textContent.trim() || 'Unknown';
//       const snippetElements = document.querySelectorAll('.MuiCode-root');

//       const snippets = Array.from(snippetElements).map((snippet) => {
//         const parentElement = snippet.closest('.MuiPaper-root');
//         return {
//           title: parentElement?.querySelector('h2, h3')?.textContent || 'Untitled',
//           code: snippet.textContent,
//           language: snippet.getAttribute('data-language') || 'jsx',
//           description: parentElement?.querySelector('p')?.textContent || '',
//         };
//       });

//       return { componentName, snippets };
//     });

//     logger.info(`Snippets for ${componentName}: ${snippets.length}`);

//     if (snippets.length > 0) {
//       const baseDir = path.join(__dirname, '../../../../public/scraped_docs', componentLibrary);
//       await fs.mkdir(baseDir, { recursive: true });

//       const validSnippets = snippets
//         .map((snippet) => {
//           const cleanedCode = cleanCodeSnippet(snippet.code);
//           const formattedCode = validateAndFormatSnippet(cleanedCode);
//           return formattedCode ? { ...snippet, code: formattedCode } : null;
//         })
//         .filter(Boolean);

//       const fileName = `${sanitizeFileName(componentName)}_snippets.json`;
//       const filePath = path.join(baseDir, fileName);

//       await fs.writeFile(filePath, JSON.stringify(validSnippets, null, 2));
//       logger.info(`Data saved to ${filePath}`);
//       createdFiles.push(filePath);

//       const snippetsDir = path.join(baseDir, 'snippets', sanitizeFileName(componentName));
//       await fs.mkdir(snippetsDir, { recursive: true });

//       await Promise.all(
//         validSnippets.map(async (snippet, index) => {
//           const snippetFileName = `snippet_${index + 1}.${snippet.language}`;
//           const snippetFilePath = path.join(snippetsDir, snippetFileName);
//           await fs.writeFile(snippetFilePath, snippet.code);
//           logger.info(`Snippet saved to ${snippetFilePath}`);
//           createdFiles.push(snippetFilePath);
//         })
//       );
//     } else {
//       logger.warn('No snippets found. Check if the page structure has changed.');
//     }
//   } catch (error) {
//     logger.error('Error during scraping:', error);
//   } finally {
//     await browser.close();
//   }

//   return createdFiles;
// };

// module.exports = { scrapeCode };

// // const fs = require('fs').promises;
// // const path = require('path');
// // const { logger } = require('@config/logging');
// // const puppeteer = require('puppeteer');

// // // Enhanced code cleaning function
// // const cleanCodeSnippet = (code) => {
// //   return code
// //     .replace(/^Copy(\(or ⌘C\))?\s*|\s*Copy(Copied)?\(or ⌘C\)\s*$/g, '')
// //     .replace(/Press Enter to start editing.*$/, '')
// //     .replace(/\/\*\*[\s\S]*?\*\/|\.npm__react-simple-code-editor__[\s\S]*?}\s*}/g, '')
// //     .replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '')
// //     .replace(/(<PopupState[\s\S]*?<\/PopupState>)[\s\S]*\1/g, '$1')
// //     .replace(/^\s*[\r\n]/gm, '')
// //     .replace(/^\s+|\s+$/g, '')
// //     .replace(/\n{2,}/g, '\n')
// //     .replace(/^\s+/gm, '')
// //     .replace(/\t/g, '  ')
// //     .replace(/\s{2,}/g, ' ')
// //     .trim();
// // };

// // // New function to sanitize filenames
// // const sanitizeFileName = (fileName) => {
// //   return fileName.toLowerCase().replace(/[^a-z0-9]+/g, '_');
// // };

// // // Main scraping function
// // const scrapeCode = async (componentUrl, componentLibrary) => {
// //   const browser = await puppeteer.launch({ headless: 'new' });
// //   const page = await browser.newPage();
// //   const createdFiles = [];

// //   try {
// //     await page.goto(componentUrl, { waitUntil: 'networkidle0', timeout: 60000 });

// //     const { componentName, snippets } = await page.evaluate(() => {
// //       const componentName = document.querySelector('h1')?.textContent.trim() || 'Unknown';
// //       const snippetElements = Array.from(document.querySelectorAll('.MuiCode-root'));

// //       const snippets = snippetElements.map((snippet) => {
// //         const parentElement = snippet.closest('.MuiPaper-root');
// //         return {
// //           title: parentElement?.querySelector('h2, h3')?.textContent || 'Untitled',
// //           code: snippet.textContent,
// //           language: snippet.getAttribute('data-language') || 'jsx',
// //           description: parentElement?.querySelector('p')?.textContent || '',
// //         };
// //       });

// //       return { componentName, snippets };
// //     });

// //     logger.info(`Snippets for ${componentName}: ${snippets.length}`);

// //     if (snippets.length > 0) {
// //       const baseDir = path.join(__dirname, '../../../../public/scraped_docs', componentLibrary);
// //       await fs.mkdir(baseDir, { recursive: true });

// //       const allSnippets = snippets.map((snippet) => ({
// //         component: componentName,
// //         ...snippet,
// //         code: cleanCodeSnippet(snippet.code),
// //       }));

// //       const fileName = `${sanitizeFileName(componentName)}_snippets.json`;
// //       const filePath = path.join(baseDir, fileName);

// //       await fs.writeFile(filePath, JSON.stringify(allSnippets, null, 2));
// //       logger.info(`Data saved to ${filePath}`);
// //       createdFiles.push(filePath);

// //       const snippetsDir = path.join(baseDir, 'snippets', sanitizeFileName(componentName));
// //       await fs.mkdir(snippetsDir, { recursive: true });

// //       await Promise.all(
// //         snippets.map(async (snippet, index) => {
// //           const snippetFileName = `snippet_${index + 1}.${snippet.language}`;
// //           const snippetFilePath = path.join(snippetsDir, snippetFileName);
// //           await fs.writeFile(snippetFilePath, cleanCodeSnippet(snippet.code));
// //           logger.info(`Snippet saved to ${snippetFilePath}`);
// //           createdFiles.push(snippetFilePath);
// //         })
// //       );
// //     } else {
// //       logger.warn('No snippets found. Check if the page structure has changed.');
// //     }
// //   } catch (error) {
// //     logger.error('Error during scraping:', error);
// //   } finally {
// //     await browser.close();
// //   }

// //   return createdFiles;
// // };

// // module.exports = { scrapeCode };

// // // const fs = require('fs').promises;
// // // const path = require('path');
// // // const { PineconeStore } = require('@langchain/pinecone');
// // // const { OpenAIEmbeddings } = require('@langchain/openai');
// // // const { RecursiveCharacterTextSplitter } = require('langchain/text_splitter');
// // // const { getPineconeClient } = require('./get');
// // // const { scrapeCode } = require('@utils/processing/utils');
// // // const { logger } = require('@config/logging');
// // // const { File } = require('@models');
// // // const { getEnv } = require('@utils/api');
// // // const { createPineconeIndex } = require('./create');
// // // const {
// // //   detectLanguage,
// // //   detectComponentType,
// // //   detectLibraryVersion,
// // //   calculateComplexity,
// // //   detectDependencies,
// // //   detectLicense,
// // //   detectFunctionality,
// // //   safeExecute,
// // // } = require('./utils');

// // // // 1. Move constants outside of the function
// // // const CHUNK_SIZE = 1000;
// // // const CHUNK_OVERLAP = 200;
// // // const CONCURRENCY = 5;

// // // // 2. Create text splitter once
// // // const textSplitter = new RecursiveCharacterTextSplitter({
// // //   chunkSize: CHUNK_SIZE,
// // //   chunkOverlap: CHUNK_OVERLAP,
// // //   lengthFunction: (text) => text.length,
// // //   separators: ['\n\n', '\n', '. ', ', ', ' ', ''],
// // // });

// // // const upsertDocs = async (req, res) => {
// // //   const { url, library, description, userId, folderId, workspaceId } = req.body;

// // //   try {
// // //     // 3. Input validation
// // //     if (!userId || !url || !library) {
// // //       throw new Error('User ID, URL, and library are required fields.');
// // //     }

// // //     logger.info(`BODY: ${JSON.stringify(req.body)}`);

// // //     const scrapedFiles = await scrapeCode(url, library);

// // //     // 4. Use bulkWrite for better performance
// // //     await File.bulkWrite(
// // //       scrapedFiles.map((filePath) => ({
// // //         insertOne: {
// // //           document: createFileDocument(filePath, userId, workspaceId, folderId),
// // //         },
// // //       }))
// // //     );

// // //     // 5. Initialize embedder and vstore outside the loop
// // //     const embedder = new OpenAIEmbeddings({
// // //       modelName: getEnv('PINECONE_EMBEDDING_MODEL_NAME'),
// // //       apiKey: getEnv('OPENAI_API_KEY'),
// // //       dimensions: getEnv('PINECONE_EMBEDDING_DIMENSIONS'),
// // //     });

// // //     const pinecone = await getPineconeClient();
// // //     const pineconeIndex = await createPineconeIndex(pinecone, getEnv('PINECONE_INDEX'));

// // //     const vstore = await PineconeStore.fromExistingIndex(embedder, {
// // //       pineconeIndex,
// // //       namespace: getEnv('PINECONE_NAMESPACE_3'),
// // //       textKey: 'text',
// // //     });

// // //     const totalDocs = await processFilesInParallel(scrapedFiles, vstore, library, url, description);

// // //     const stats = await pineconeIndex.describeIndexStats();
// // //     logger.info(`Pinecone index stats: ${JSON.stringify(stats)}`);

// // //     res.status(200).send(`Successfully upserted ${totalDocs} documents from ${url}`);
// // //   } catch (error) {
// // //     logger.error(`Error upserting documentation: ${error}`, error);
// // //     res.status(500).send('Error upserting documentation: ' + error.message);
// // //   }
// // // };

// // // // 6. Move helper functions outside the main function
// // // function createFileDocument(filePath, userId, workspaceId, folderId) {
// // //   const fileStats = fs.statSync(filePath);
// // //   const fileName = path.basename(filePath);
// // //   const fileType = path.extname(fileName).slice(1);

// // //   return {
// // //     userId,
// // //     workspaceId,
// // //     folderId,
// // //     name: fileName,
// // //     size: fileStats.size,
// // //     originalFileType: fileType,
// // //     filePath,
// // //     type: fileType,
// // //     space: 'files',
// // //     metadata: {
// // //       fileSize: fileStats.size,
// // //       fileType,
// // //       lastModified: fileStats.mtime,
// // //     },
// // //   };
// // // }

// // // async function processFilesInParallel(files, vstore, library, url, description) {
// // //   let processedDocs = 0;

// // //   for (let i = 0; i < files.length; i += CONCURRENCY) {
// // //     const batch = files.slice(i, i + CONCURRENCY);
// // //     const results = await Promise.all(
// // //       batch.map((file) => processFile(file, vstore, library, url, description))
// // //     );
// // //     processedDocs += results.reduce((sum, count) => sum + count, 0);
// // //   }

// // //   return processedDocs;
// // // }

// // // async function processFile(filePath, vstore, library, url, description) {
// // //   const { content, fileName } = await readFileContent(filePath);
// // //   const docs = await createDocuments(content, fileName, library);

// // //   logger.info(`Processing ${docs.length} chunks from ${fileName}...`);

// // //   await upsertDocuments(vstore, docs, fileName, content, url, description);

// // //   return docs.length;
// // // }

// // // async function readFileContent(filePath) {
// // //   const content = await fs.readFile(filePath, 'utf8');
// // //   const fileName = path.basename(filePath);
// // //   return { content, fileName };
// // // }

// // // async function createDocuments(content, fileName, library) {
// // //   return textSplitter.createDocuments([content], [{ source: `${library}/${fileName}` }]);
// // // }

// // // async function upsertDocuments(vstore, docs, fileName, content, url, description) {
// // //   const metadata = createMetadata(content, fileName, url, description);
// // //   const upsertBatch = docs.map((doc, index) => ({
// // //     id: `${fileName}_${index}`,
// // //     values: doc.pageContent,
// // //     metadata: { ...metadata, ...doc.metadata },
// // //   }));

// // //   await vstore.addDocuments(upsertBatch);
// // //   logger.info(`Upserted ${docs.length} chunks from ${fileName}`);
// // //   logger.info(`Metadata: ${JSON.stringify(metadata)}`);
// // // }

// // // function createMetadata(content, fileName, url, description) {
// // //   return {
// // //     language: safeExecute(() => detectLanguage(fileName), 'Unknown'),
// // //     framework: library,
// // //     componentType: safeExecute(() => detectComponentType(content), 'Unknown'),
// // //     functionality: safeExecute(() => detectFunctionality(content), ['General']),
// // //     libraryVersion: safeExecute(() => detectLibraryVersion(content), 'Unknown'),
// // //     releaseDate: new Date().toISOString(),
// // //     complexity: safeExecute(() => calculateComplexity(content), 'Unknown'),
// // //     linesOfCode: content.split('\n').length,
// // //     dependencies: safeExecute(() => detectDependencies(content), []),
// // //     useCase: description || 'Not specified',
// // //     performance: 'Not specified',
// // //     author: 'Unknown',
// // //     sourceUrl: url,
// // //     license: safeExecute(() => detectLicense(content), 'Unknown'),
// // //   };
// // // }

// // // module.exports = { upsertDocs };
