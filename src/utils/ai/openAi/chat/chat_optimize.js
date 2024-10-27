// services/utils.js
const dotenv = require("dotenv");
const { ChatOpenAI } = require("@langchain/openai");
const crypto = require("crypto");
const { getEnv } = require("@utils/processing/api");
const { logger } = require("@config/logging");

dotenv.config();

const openai = new ChatOpenAI({
  apiKey: getEnv("OPENAI_API_PROJECT_KEY"),
  modelName: getEnv("OPENAI_API_CHAT_COMPLETION_MODEL"),
  temperature: 0.7,
  maxTokens: 150
});

/**
 * Helper function to create chat completions.
 * @param {Array} messages - Array of message objects for the chat.
 * @param {number} max_tokens - Maximum tokens for the response.
 * @param {number} temperature - Temperature setting for the response.
 * @returns {Promise<object>} - The response from OpenAI.
 */
async function createChatCompletion(messages, max_tokens = 150, temperature = 0.7) {
  try {
    const response = await openai.completionWithRetry({
      model: getEnv("OPENAI_API_CHAT_COMPLETION_MODEL"),
      messages,
      max_tokens,
      temperature
    });
    return response.data.choices[0].message.content.trim();
  } catch (error) {
    logger.error(
      "Error in createChatCompletion:",
      error.response ? error.response.data : error.message
    );
    throw new Error("OpenAI API request failed.");
  }
}

/**
 * Generates a concise and descriptive title for a chat session.
 * @param {string} firstPrompt - The user's first prompt.
 * @returns {Promise<string>} - Generated chat title.
 */
async function generateChatTitle(firstPrompt) {
  if (!process.env.OPENAI_API_PROJECT_KEY) {
    throw new Error("OpenAI API key is not configured.");
  }

  const messages = [
    { role: "user", content: firstPrompt },
    {
      role: "system",
      content: `Generate a concise and descriptive title for this chat session based on the user's first prompt. The title should be no more than five words and encapsulate the main topic or purpose of the conversation.

Examples:
- 'I need help planning my vacation to Italy.' becomes Vacation Planning GPT ✈️
- 'Can you assist me in understanding quantum physics?' becomes Quantum Physics GPT 🔬
`
    }
  ];

  const title = await createChatCompletion(messages, 10, 0.7);
  return title;
}

/**
 * Summarizes the user's query to capture the main points.
 * @param {string} userQuery - The user's original query.
 * @returns {Promise<string>} - Summarized version of the query.
 */
async function summarizeUserQuery(userQuery) {
  const messages = [
    { role: "user", content: userQuery },
    {
      role: "system",
      content: "Please provide a concise summary of the above query, highlighting the main points."
    }
  ];

  const summary = await createChatCompletion(messages, 60, 0.5);
  return summary;
}

/**
 * Categorizes the user's query into predefined categories.
 * @param {string} userQuery - The user's original query.
 * @returns {Promise<string>} - Category of the query.
 */
async function categorizeUserQuery(userQuery) {
  const messages = [
    { role: "user", content: userQuery },
    {
      role: "system",
      content: `Categorize the above query into one of the following categories: 
- Technical Support
- Sales Inquiry
- General Information
- Feedback
- Other

Respond with only the category name.`
    }
  ];

  const category = await createChatCompletion(messages, 10, 0.3);
  return category;
}

/**
 * Extracts keywords from the user's query.
 * @param {string} userQuery - The user's original query.
 * @returns {Promise<string[]>} - Array of extracted keywords.
 */
async function extractKeywords(userQuery) {
  const messages = [
    { role: "user", content: userQuery },
    {
      role: "system",
      content: "Extract the most relevant keywords from the above query as a comma-separated list."
    }
  ];

  const keywordsString = await createChatCompletion(messages, 50, 0.5);
  const keywords = keywordsString.split(",").map((keyword) => keyword.trim());
  return keywords;
}

/**
 * Expands the user's query to include more context or details.
 * @param {string} userQuery - The user's original query.
 * @returns {Promise<string>} - Expanded query.
 */
async function expandQuery(userQuery) {
  const messages = [
    {
      role: "system",
      content: `Expand the following query with additional context and details: "${userQuery}"`
    }
  ];

  const expandedQuery = await createChatCompletion(messages, 150, 0.5);
  return expandedQuery;
}

/**
 * Generates an outline for the response based on the user's query.
 * @param {string} userQuery - The user's original query.
 * @returns {Promise<string>} - Response outline.
 */
async function generateResponseOutline(userQuery) {
  const messages = [
    {
      role: "system",
      content: `Create an outline for responding to the following query. The outline should include main points and subpoints but no full sentences. Query: "${userQuery}"`
    }
  ];

  const outline = await createChatCompletion(messages, 100, 0.3);
  return outline;
}

/**
 * Generates actionable items based on the user's query.
 * @param {string} userQuery - The user's original query.
 * @returns {Promise<string[]>} - Array of action items.
 */
async function generateActionItems(userQuery) {
  const messages = [
    {
      role: "system",
      content: `Identify actionable steps or tasks from the following query. Respond with a numbered list. Query: "${userQuery}"`
    }
  ];

  const actionItemsText = await createChatCompletion(messages, 100, 0.5);
  const actionItems = actionItemsText
    .split("\n")
    .map((item) => item.replace(/^\d+\.\s*/, "").trim())
    .filter((item) => item);
  return actionItems;
}

/**
 * Generates follow-up questions based on the user's query.
 * @param {string} userQuery - The user's original query.
 * @returns {Promise<string[]>} - Array of follow-up questions.
 */
async function generateFollowUpQuestions(userQuery) {
  const messages = [
    {
      role: "system",
      content: `Based on the following query, generate three insightful follow-up questions to further engage the user. Query: "${userQuery}"`
    }
  ];

  const questionsText = await createChatCompletion(messages, 100, 0.7);
  const questions = questionsText
    .split("\n")
    .map((q) => q.replace(/^\d+\.\s*/, "").trim())
    .filter((q) => q);
  return questions;
}

/**
 * Validates whether the user's query aligns with predefined intents.
 * @param {string} userQuery - The user's original query.
 * @returns {Promise<boolean>} - True if intent is valid, else false.
 */
async function validateUserIntent(userQuery) {
  const validIntents = ["Technical Support", "Sales Inquiry", "General Information", "Feedback"];

  try {
    const category = await categorizeUserQuery(userQuery);
    return validIntents.includes(category);
  } catch (error) {
    logger.error("Error validating user intent:", error.message);
    return false;
  }
}

/**
 * Generates metadata for the user's query.
 * @param {string} userId - The ID of the user making the query.
 * @param {string} ipAddress - The IP address of the user.
 * @returns {object} - Metadata object.
 */
function generateMetadata(userId, ipAddress) {
  return {
    queryId: crypto.randomBytes(16).toString("hex"),
    userId,
    timestamp: new Date(),
    platform: "Web", // or 'Mobile', etc.
    ipAddress
  };
}

module.exports = {
  generateChatTitle,
  summarizeUserQuery,
  categorizeUserQuery,
  extractKeywords,
  expandQuery,
  generateResponseOutline,
  generateActionItems,
  generateFollowUpQuestions,
  validateUserIntent,
  generateMetadata
};
