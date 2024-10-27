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
