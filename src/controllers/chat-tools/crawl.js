/* eslint-disable prettier/prettier */

const { getEnv } = require("@utils/index");
const { createOpenAI } = require("@ai-sdk/openai");
const { default: FirecrawlApp } = require("@mendable/firecrawl-js");

// Initialize OpenAI with API key
const openai = createOpenAI({
  apiKey: getEnv("OPENAI_API_PROJECT_KEY"),
  compatibility: "strict"
});

const firecrawlApp = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY });

const handleCrawlRequest = async (req, res) => {
  try {
    const { url, instructions } = req.body;

    const crawlResponse = await firecrawlApp.crawlUrl(url, {
      limit: 5,
      scrapeOptions: {
        formats: ["markdown", "html"]
      }
    });

    if (!crawlResponse.success) {
      return res.status(500).json({ error: `Failed to crawl: ${crawlResponse.error}` });
    }

    const completion = await openai.chat.completions.create({
      model: "o1-preview",
      messages: [
        {
          role: "user",
          content: `
            Generate a report with the following details in valid HTML:
            - Instructions: ${instructions}
            - URL: ${url}
            - Results: ${JSON.stringify(crawlResponse.data)}
          `
        }
      ]
    });

    const generatedHtml = completion.choices[0].message.content;

    return res.json({ html: generatedHtml, crawlData: crawlResponse.data });
  } catch (error) {
    console.error("Error handling crawl request:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = { handleCrawlRequest };
