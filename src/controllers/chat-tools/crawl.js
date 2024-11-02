// /* eslint-disable prettier/prettier */
/* eslint-disable prettier/prettier */

const { getEnv } = require("@utils/index");
const { createOpenAI } = require("@ai-sdk/openai");
const Crawler = require("simplecrawler");
const cheerio = require("cheerio");
const TurndownService = require("turndown");

// Initialize OpenAI with API key
const openai = createOpenAI({
  apiKey: getEnv("OPENAI_API_PROJECT_KEY"),
  compatibility: "strict",
});

const handleCrawlRequest = async (req, res) => {
  try {
    const { url, instructions } = req.body;

    // Crawl the URL using the new crawling method
    const crawlData = await crawlUrl(url, 5); // Limit to 5 pages

    // Generate a report using OpenAI API
    const completion = await openai.chat.completions.create({
      model: "o1-preview",
      messages: [
        {
          role: "user",
          content: `
            Generate a report with the following details in valid HTML:
            - Instructions: ${instructions}
            - URL: ${url}
            - Results: ${JSON.stringify(crawlData)}
          `,
        },
      ],
    });

    const generatedHtml = completion.choices[0].message.content;

    return res.json({ html: generatedHtml, crawlData });
  } catch (error) {
    console.error("Error handling crawl request:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const crawlUrl = (startUrl, limit) => {
  return new Promise((resolve, reject) => {
    const crawler = new Crawler(startUrl);
    const results = [];
    const turndownService = new TurndownService();

    let pagesCrawled = 0;

    crawler.maxDepth = 5; // Adjust depth as needed
    crawler.maxConcurrency = 5;
    crawler.interval = 250;
    crawler.timeout = 5000;

    crawler.on("fetchcomplete", (queueItem, responseBuffer, response) => {
      const contentType = response.headers["content-type"];
      if (contentType && contentType.includes("text/html")) {
        const html = responseBuffer.toString();
        const $ = cheerio.load(html);
        const markdown = turndownService.turndown(html);

        results.push({
          url: queueItem.url,
          html: html,
          markdown: markdown,
        });

        pagesCrawled += 1;
        if (pagesCrawled >= limit) {
          crawler.stop();
        }
      }
    });

    crawler.on("complete", () => {
      resolve({ success: true, data: results });
    });

    crawler.on("fetcherror", (queueItem, response) => {
      console.error(`Fetch error for ${queueItem.url}: ${response.statusCode}`);
    });

    crawler.on("fetchtimeout", (queueItem, crawlerTimeoutValue) => {
      console.error(`Fetch timeout for ${queueItem.url}: ${crawlerTimeoutValue}`);
    });

    crawler.on("fetchclienterror", (queueItem, errorData) => {
      console.error(`Client error for ${queueItem.url}: ${errorData}`);
    });

    crawler.on("fetch404", (queueItem, response) => {
      console.error(`404 Not Found for ${queueItem.url}`);
    });

    crawler.on("fetchconditionerror", (queueItem, error) => {
      console.error(`Fetch condition error for ${queueItem.url}: ${error}`);
    });

    crawler.on("robotstxterror", (error) => {
      console.error(`Robots.txt error: ${error}`);
    });

    crawler.on("cookieerror", (error) => {
      console.error(`Cookie error: ${error}`);
    });

    crawler.on("fetchdataerror", (queueItem, response) => {
      console.error(`Fetch data error for ${queueItem.url}: ${response.statusCode}`);
    });

    crawler.on("fetchredirect", (queueItem, redirectQueueItem, response) => {
      console.log(`Redirected from ${queueItem.url} to ${redirectQueueItem.url}`);
    });

    crawler.on("error", (error) => {
      console.error("Crawler error:", error);
      reject(error);
    });

    crawler.start();
  });
};

module.exports = { handleCrawlRequest };

// const { getEnv } = require("@utils/index");
// const { createOpenAI } = require("@ai-sdk/openai");
// const { default: FirecrawlApp } = require("@mendable/firecrawl-js");

// // Initialize OpenAI with API key
// const openai = createOpenAI({
//   apiKey: getEnv("OPENAI_API_PROJECT_KEY"),
//   compatibility: "strict"
// });

// const firecrawlApp = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY });

// const handleCrawlRequest = async (req, res) => {
//   try {
//     const { url, instructions } = req.body;

//     const crawlResponse = await firecrawlApp.crawlUrl(url, {
//       limit: 5,
//       scrapeOptions: {
//         formats: ["markdown", "html"]
//       }
//     });

//     if (!crawlResponse.success) {
//       return res.status(500).json({ error: `Failed to crawl: ${crawlResponse.error}` });
//     }

//     const completion = await openai.chat.completions.create({
//       model: "o1-preview",
//       messages: [
//         {
//           role: "user",
//           content: `
//             Generate a report with the following details in valid HTML:
//             - Instructions: ${instructions}
//             - URL: ${url}
//             - Results: ${JSON.stringify(crawlResponse.data)}
//           `
//         }
//       ]
//     });

//     const generatedHtml = completion.choices[0].message.content;

//     return res.json({ html: generatedHtml, crawlData: crawlResponse.data });
//   } catch (error) {
//     console.error("Error handling crawl request:", error);
//     return res.status(500).json({ error: "Internal server error" });
//   }
// };

// module.exports = { handleCrawlRequest };
