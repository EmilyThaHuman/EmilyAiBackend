// ref.js
const OpenAI = require("openai");
const { BraveSearch } = require("@langchain/community/tools/brave_search");
const cheerio = require("cheerio");
const { RecursiveCharacterTextSplitter } = require("langchain/text_splitter");
const { OpenAIEmbeddings } = require("@langchain/openai");
const { MemoryVectorStore } = require("langchain/vectorstores/memory");
require("dotenv").config();

const openai = new OpenAI({
  baseURL: "https://api.groq.com/openai/v1",
  apiKey: process.env.GROQ_API_KEY
});

const embeddings = new OpenAIEmbeddings();

/**
 * Rephrases the input string to be used as a search query.
 *
 * @param {string} inputString - The input string to be rephrased.
 * @returns {string} - The rephrased version of the input string.
 */
async function rephraseInput(inputString) {
  const groqResponse = await openai.chat.completions.create({
    model: "mixtral-8x7b-32768",
    messages: [
      {
        role: "system",
        content:
          "You are a rephraser and always respond with a rephrased version of the input that is given to a search engine API. Always be succinct and use the same words as the input. ONLY RETURN THE REPHRASED VERSION OF THE INPUT."
      },
      { role: "user", content: inputString }
    ]
  });
  return groqResponse.choices[0].message.content;
}

/**
 * Normalizes the data returned from a search engine by filtering out irrelevant results and extracting the title and link properties.
 *
 * @param {object[]} docs - The raw search engine results.
 * @returns {object[]} - An array of objects with `title` and `link` properties.
 */
function normalizeData(docs) {
  return JSON.parse(docs)
    .filter((doc) => doc.title && doc.link && !doc.link.includes("brave.com"))
    .map(({ title, link }) => ({ title, link }));
}

async function searchEngineForSources(message, numberOfPagesToScan) {
  const loader = new BraveSearch({ apiKey: process.env.BRAVE_SEARCH_API_KEY });
  const rephrasedMessage = await rephraseInput(message);
  const docs = await loader.call(rephrasedMessage, { count: numberOfPagesToScan });
  const normalizedData = normalizeData(docs);
  return await Promise.all(normalizedData.map(fetchAndProcess));
}

/**
 * Fetches the content of a web page at the given link and extracts the main content.
 *
 * @param {string} link - The URL of the web page to fetch.
 * @returns {Promise<string>} - The extracted main content of the web page, or an empty string if the fetch fails.
 */
async function fetchPageContent(link) {
  try {
    const response = await fetch(link);
    if (!response.ok) {
      return ""; // skip if fetch fails
    }
    const text = await response.text();
    return extractMainContent(text, link);
  } catch (error) {
    console.error(`Error fetching page content for ${link}:`, error);
    return "";
  }
}

/**
 * Extracts the main content from an HTML document by removing script, style, head, nav, footer, iframe, and image elements, and then returning the text content of the body element with whitespace trimmed.
 *
 * @param {string} html - The HTML content of the web page.
 * @param {string} link - The URL of the web page.
 * @returns {string} - The extracted main content of the web page.
 */
function extractMainContent(html, link) {
  const $ = html.length ? cheerio.load(html) : null;
  $("script, style, head, nav, footer, iframe, img").remove();
  return $("body").text().replace(/\s+/g, " ").trim();
}

/**
 * Fetches the content of a web page at the given link, splits the text into chunks, and creates a vector store from the chunks. Then, it searches the vector store for the most similar chunks to the given message and returns them.
 *
 * @param {object} item - An object with `link` and `title` properties representing a web page.
 * @param {number} textChunkSize - The size of each text chunk in characters.
 * @param {number} textChunkOverlap - The number of characters to overlap between adjacent text chunks.
 * @param {string} message - The message to search for similar content.
 * @param {number} numberOfSimilarityResults - The number of similar results to return.
 * @returns {Promise<object[]>} - An array of objects representing the most similar text chunks to the given message, or `null` if the fetched content is too short.
 */
async function fetchAndProcess(
  item,
  textChunkSize,
  textChunkOverlap,
  message,
  numberOfSimilarityResults
) {
  const htmlContent = await fetchPageContent(item.link);
  if (htmlContent && htmlContent.length < 250) return null;
  const splitText = await new RecursiveCharacterTextSplitter({
    chunkSize: textChunkSize,
    chunkOverlap: textChunkOverlap
  }).splitText(htmlContent);
  const vectorStore = await MemoryVectorStore.fromTexts(
    splitText,
    { link: item.link, title: item.title },
    embeddings
  );
  return await vectorStore.similaritySearch(message, numberOfSimilarityResults);
}

/**
 * Generates a set of follow-up questions based on the provided text.
 *
 * @param {string} responseText - The text to generate follow-up questions for.
 * @returns {Promise<string[]>} - An array of 3 follow-up questions.
 */
async function generateFollowUpQuestions(responseText) {
  const groqResponse = await openai.chat.completions.create({
    model: "mixtral-8x7b-32768",
    messages: [
      {
        role: "system",
        content:
          "You are a question generator. Generate 3 follow-up questions based on the provided text. Return the questions in an array format."
      },
      {
        role: "user",
        content: `Generate 3 follow-up questions based on the following text:\n\n${responseText}\n\nReturn the questions in the following format: ["Question 1", "Question 2", "Question 3"]`
      }
    ]
  });
  return JSON.parse(groqResponse.choices[0].message.content);
}

module.exports = {
  rephraseInput,
  normalizeData,
  searchEngineForSources,
  fetchPageContent,
  extractMainContent,
  fetchAndProcess,
  generateFollowUpQuestions
};
