const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');
const { logger } = require('@/config/logging');
const { default: puppeteer } = require('puppeteer');
const { cleanCodeSnippetMain } = require('./clean');
const { identifyCodeType } = require('./identifyValue');
const { getLibraryNameAbbreviation } = require('./misc');
const { sanitizeFileName } = require('./files');
const { formatAndCleanCode } = require('./format');
const { Cheerio } = require('cheerio');

const scrapeSite = async (url) => {
  try {
    const response = await axios.get(url);
    const $ = Cheerio.load(response.data);
    const content = $('body').text(); // Simplified for demonstration
    return content;
  } catch (error) {
    logger.error('Error scraping content:', error);
    throw error;
  }
};

const scrapeCode = async (componentUrl, componentLibrary) => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  const createdFiles = [];

  try {
    await page.goto(componentUrl, { waitUntil: 'networkidle0' });
    // await page.waitForSelector('.MuiButton-root.MuiButton-text');
    const buttons = await page.$$('button[data-ga-event-action="expand"]');
    for (const button of buttons) {
      await button.click();
    }

    logger.info('All expand code buttons clicked successfully.');
    const { componentName, snippets } = await page.evaluate(() => {
      const componentName = document.querySelector('h1')?.textContent.trim() || 'Unknown';
      const snippetElements = document.querySelectorAll('.MuiCode-root');

      const snippets = Array.from(snippetElements).map((snippet, index) => {
        const parentElement = snippet.closest('.MuiPaper-root');
        // const code = detectCodeSnippet(snippet.textContent);
        // logger.info(code);
        return {
          title: parentElement?.querySelector('h2, h3')?.textContent || 'Untitled',
          code: snippet.textContent,
          language: snippet.getAttribute('data-language') || 'jsx',
          description: parentElement?.querySelector('p')?.textContent || '',
          sequence: index + 1,
        };
      });

      return { componentName, snippets };
    });

    logger.info(`Snippets for ${componentName}: ${snippets.length}`);

    if (snippets.length > 0) {
      const baseDir = path.join(__dirname, '../../../../public/scraped_docs', componentLibrary);
      await fs.mkdir(baseDir, { recursive: true });
      // const allSnippets = await Promise.all(
      //   snippets.map(async (snippet) => {
      //     let cleanedCode = cleanCodeSnippetMain(snippet.code);
      //     if (typeof cleanedCode !== 'string') {
      //       logger.warn(
      //         `Cleaned code is not a string for snippet ${snippet.title}. Using original code.`
      //       );
      //       cleanedCode = snippet.code;
      //     }
      //     const formattedCode = await formatAndCleanCode(cleanedCode);
      //     const codeType = identifyCodeType(formattedCode);
      //     const newTitle = `${getLibraryNameAbbreviation(componentLibrary)}_${componentName}`;
      //     const abbreviatedTitle = getLibraryNameAbbreviation(componentLibrary);
      //     const functionName = getDefaultExportFunctionName(snippet);

      //     return {
      //       component: componentName,
      //       url: componentUrl,
      //       codeType: codeType,
      //       library: componentLibrary,
      //       abbreviation: abbreviatedTitle,
      //       ...snippet,
      //       title: newTitle,
      //       code: formattedCode,
      //       functionName: functionName,
      //     };
      //   })
      // );

      // const allSnippets = await Promise.all(
      //   snippets.map(async (snippet) => {
      //     const cleanedCode = cleanCodeSnippetMain(snippet.code);
      //     let formattedCode;
      //     if (typeof cleanedCode === 'string') {
      //       formattedCode = await formatAndCleanCode(cleanedCode);
      //     } else {
      //       logger.warn(
      //         `Cleaned code is not a string for snippet ${snippet.title}. Skipping formatting.`
      //       );
      //       formattedCode = String(cleanedCode); // Convert to string as a fallback
      //     }
      //     const codeType = identifyCodeType(formattedCode);
      //     const newTitle = `${getLibraryNameAbbreviation(componentLibrary)}_${componentName}`;
      //     const abbreviatedTitle = getLibraryNameAbbreviation(componentLibrary);
      //     const functionName = getDefaultExportFunctionName(snippet);

      //     return {
      //       component: componentName,
      //       url: componentUrl,
      //       codeType: codeType,
      //       library: componentLibrary,
      //       abbreviation: abbreviatedTitle,
      //       ...snippet,
      //       title: newTitle,
      //       code: formattedCode,
      //       functionName: functionName,
      //     };
      //   })
      // );
      const allSnippets = snippets.map((snippet) => {
        const cleanedCode = cleanCodeSnippetMain(snippet.code);
        const codeType = identifyCodeType(cleanedCode);
        const newTitle = `${getLibraryNameAbbreviation(componentLibrary)}_${componentName}`;
        const abbreviatedTitle = getLibraryNameAbbreviation(componentLibrary);
        // const functionName = getDefaultExportFunctionName(snippet);

        return {
          component: componentName,
          url: componentUrl,
          codeType: codeType,
          library: componentLibrary,
          abbreviation: abbreviatedTitle,
          ...snippet,
          title: newTitle,
          code: cleanedCode,
          // functionName: functionName,
        };
      });

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
          let cleanedCode = cleanCodeSnippetMain(snippet.code);
          if (typeof cleanedCode !== 'string') {
            logger.warn(
              `Cleaned code is not a string for snippet ${index + 1}. Using original code.`
            );
            cleanedCode = snippet.code;
          }
          cleanedCode = await formatAndCleanCode(cleanedCode);
          await fs.writeFile(snippetFilePath, cleanedCode);
          // logger.info(`Snippet saved to ${snippetFilePath}`);
          createdFiles.push(snippetFilePath);
        })
      );
      logger.info(`Snippets saved to ${snippetsDir}`);
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

module.exports = { scrapeCode, scrapeSite };
