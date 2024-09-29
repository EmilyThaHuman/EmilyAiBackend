// I need you to generate a function or functions for identifying the type of code isolated within each snippet. These types might include components, props, interfaces, functions, hooks, etc.
// I need you to optimize my code scraping function by adding a page interaction before scraping any of the data for the code. I need each of the 'Expand Code' buttons on the page to be clicked first, then continue with rest of the logci)
const fs = require('fs').promises;
const path = require('path');
const { logger } = require('@/config/logging');
const { default: puppeteer } = require('puppeteer');
const { cleanCodeSnippetMain } = require('./clean');
const { identifyCodeType, getDefaultExportFunctionName } = require('./identifyValue');
const { getLibraryNameAbbreviation } = require('./misc');
const { sanitizeFileName } = require('./files');
const { formatAndCleanCode } = require('./format');

const scrapeCode = async (componentUrl, componentLibrary) => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  const createdFiles = [];

  try {
    await page.goto(componentUrl, { waitUntil: 'networkidle0' });
    // await page.waitForSelector('.MuiButton-root.MuiButton-text');
    logger.info('Buttons loaded successfully.');
    const buttons = await page.$$('button[data-ga-event-action="expand"]');
    for (const button of buttons) {
      const buttonText = await button.evaluate((el) => el.textContent);
      logger.info(`Button text: ${buttonText}`);
      await button.click();
      const updatedButtonText = await button.evaluate((el) => el.textContent);
      logger.info(`Updated button text: ${updatedButtonText}`);
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

      const allSnippets = snippets.map((snippet) => {
        const cleanedCode = cleanCodeSnippetMain(snippet.code);
        const formattedCode = formatAndCleanCode(cleanedCode);
        const codeType = identifyCodeType(formattedCode);
        const newTitle = `${getLibraryNameAbbreviation(componentLibrary)}_${componentName}`;
        const abbreviatedTitle = getLibraryNameAbbreviation(componentLibrary);
        const functionName = getDefaultExportFunctionName(snippet);

        return {
          component: componentName,
          url: componentUrl,
          codeType: codeType,
          library: componentLibrary,
          abbreviation: abbreviatedTitle,
          ...snippet,
          title: newTitle,
          code: formattedCode,
          functionName: functionName,
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
          await fs.writeFile(snippetFilePath, cleanCodeSnippetMain(snippet.code));
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
