const fs = require('fs');
const path = require('path');
const { default: puppeteer } = require('puppeteer');

const scrapeCode = async (componentUrl, componentLibrary) => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  const allSnippets = [];
  const createdFiles = [];

  try {
    await page.goto(componentUrl, { waitUntil: 'networkidle0' });

    const componentName = await page.evaluate(() => {
      return document.querySelector('h1').textContent.trim();
    });

    const snippets = await page.evaluate(() => {
      const snippetElements = document.querySelectorAll('.MuiCode-root');
      return Array.from(snippetElements).map((snippet) => {
        const code = snippet.textContent;
        const language = snippet.getAttribute('data-language') || 'jsx';
        const title =
          snippet.closest('.MuiPaper-root')?.querySelector('h2, h3')?.textContent || 'Untitled';
        const description =
          snippet.closest('.MuiPaper-root')?.querySelector('p')?.textContent || '';

        return {
          title,
          code,
          language,
          description,
        };
      });
    });

    allSnippets.push(
      ...snippets.map((snippet) => ({
        component: componentName,
        ...snippet,
      }))
    );

    console.log(`Snippets for ${componentName}: `, snippets.length);
    if (snippets.length > 0) {
      // Create base directory for the component library
      const baseDir = path.join(__dirname, '../../../../public/scraped_docs', componentLibrary);
      fs.mkdirSync(baseDir, { recursive: true });

      // Save full JSON data
      const fileName = `${componentName.toLowerCase().replace(/\s+/g, '_')}_snippets.json`;
      const filePath = path.join(baseDir, fileName);
      fs.writeFileSync(filePath, JSON.stringify(allSnippets, null, 2));
      console.log(`Data saved to ${filePath}`);
      createdFiles.push(filePath);

      // Create individual files for each snippet
      const snippetsDir = path.join(
        baseDir,
        'snippets',
        componentName.toLowerCase().replace(/\s+/g, '_')
      );
      fs.mkdirSync(snippetsDir, { recursive: true });

      snippets.forEach((snippet, index) => {
        const snippetFileName = `snippet_${index + 1}.${snippet.language}`;
        const snippetFilePath = path.join(snippetsDir, snippetFileName);
        fs.writeFileSync(snippetFilePath, snippet.code);
        console.log(`Snippet saved to ${snippetFilePath}`);
        createdFiles.push(snippetFilePath);
      });
    } else {
      console.log('No snippets found. Check if the page structure has changed.');
    }
  } catch (error) {
    console.error('Error during scraping:', error);
  } finally {
    await browser.close();
  }
  return createdFiles;
  //   const fileName = `${componentName.toLowerCase().replace(/\s+/g, '_')}_snippets.json`;
  //   const filePath = path.join(__dirname, `../../../../public/scraped_docs/${componentLibrary}`, fileName);
  //   fs.writeFileSync(filePath, JSON.stringify(allSnippets, null, 2), 'utf8');

  //   // fs.writeFileSync(fileName, JSON.stringify(allSnippets, null, 2));

  //   console.log(`Data saved to ${fileName}`);

  // } catch (error) {
  //   console.error('Error during scraping:', error);
  // } finally {
  //   await browser.close();
  // }
};

module.exports = {
  scrapeCode,
};

// Example usage
// const componentUrl = 'https://mui.com/material-ui/react-modal/';
// scrape(componentUrl);
