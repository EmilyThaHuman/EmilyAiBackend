// Import required modules using CommonJS require statements
const OpenAI = require("openai");

// Retrieve environment variables
const apiKey = process.env.OPENAI_API_PROJECT_KEY;
const shouldLog = process.env.OPENAI_LOG === "true";
const defaultModel = "gpt-4";

/**
 * Parses a text string to extract a JSON object from markup text.
 *
 * @param {string} text - The text containing JSON within markup.
 * @returns {Object} The parsed JSON object.
 * @throws {Error} If the JSON cannot be parsed from the text.
 */
const getJsonFromMarkupText = (text) => {
  try {
    const jsonParse = JSON.parse(text);
    if (typeof jsonParse === "object") {
      return jsonParse;
    } else {
      throw new Error("Invalid JSON response");
    }
  } catch (err) {
    try {
      const jsonStart = text.indexOf("```");
      const isJsonMarkup = text.indexOf("```json") !== -1;
      const jsonEnd = text.lastIndexOf("```");
      const jsonText = text.substring(jsonStart + (isJsonMarkup ? 7 : 3), jsonEnd);

      const json = JSON.parse(jsonText);
      return json;
    } catch (markupParseError) {
      console.debug(markupParseError);
      throw new Error("Invalid JSON response");
    }
  }
};

/**
 * Extracts JSX code from markup text.
 *
 * @param {string} text - The text containing JSX within markup.
 * @returns {string} The extracted JSX code.
 * @throws {Error} If the JSX cannot be parsed from the text.
 */
const getJsxFromMarkupText = (text) => {
  try {
    const jsxStart = text.indexOf("```");
    if (jsxStart === -1) {
      console.error("Invalid jsx response");
      return "";
    }
    const tsxMarkupPosition = text.indexOf("```tsx");
    const typescriptMarkupPosition = text.indexOf("```typescript");

    if (tsxMarkupPosition !== -1) {
      const jsxEnd = text.indexOf("```", tsxMarkupPosition + 6);
      const typescriptText = text.substring(tsxMarkupPosition + 6, jsxEnd);
      return typescriptText;
    } else if (typescriptMarkupPosition !== -1) {
      const jsxEnd = text.indexOf("```", typescriptMarkupPosition + 13);
      const isTypescriptMarkup = text.indexOf("```typescript") !== -1;
      const typescriptText = text.substring(
        jsxMarkupPosition + (isTypescriptMarkup ? 13 : 3),
        jsxEnd
      );
      return typescriptText;
    } else {
      const jsxEnd = text.indexOf("```", jsxStart + 3);
      const typescriptText = text.substring(jsxStart + 3, jsxEnd);
      return typescriptText;
    }
  } catch (markupParseError) {
    console.debug(markupParseError);
    throw new Error("Invalid jsx response");
  }
};

/**
 * Extracts all JSX code snippets from markup text.
 *
 * @param {string} text - The text containing multiple JSX snippets within markup.
 * @param {string[]} [foundMarkups=[]] - An array to accumulate found JSX snippets.
 * @returns {string[]} An array of extracted JSX code snippets.
 * @throws {Error} If any JSX snippet cannot be parsed.
 */
const getAllJsxFromMarkupText = (text, foundMarkups = []) => {
  try {
    const jsxStart = text.indexOf("```");
    if (jsxStart === -1) {
      return foundMarkups;
    }
    const tsxMarkupPosition = text.indexOf("```tsx", jsxStart);
    const typescriptMarkupPosition = text.indexOf("```typescript", jsxStart);

    if (tsxMarkupPosition !== -1) {
      const jsxEnd = text.indexOf("```", tsxMarkupPosition + 6);
      const typescriptText = text.substring(tsxMarkupPosition + 6, jsxEnd);
      foundMarkups.push(typescriptText);
      const restOfText = text.substring(jsxEnd + 3);
      return getAllJsxFromMarkupText(restOfText, foundMarkups);
    } else if (typescriptMarkupPosition !== -1) {
      const jsxEnd = text.indexOf("```", typescriptMarkupPosition + 13);
      const typescriptText = text.substring(typescriptMarkupPosition + 13, jsxEnd);
      foundMarkups.push(typescriptText);
      const restOfText = text.substring(jsxEnd + 3);
      return getAllJsxFromMarkupText(restOfText, foundMarkups);
    } else {
      const genericJsxStart = text.indexOf("```", jsxStart);
      const jsxEnd = text.indexOf("```", genericJsxStart + 3);
      if (jsxEnd !== -1) {
        const typescriptText = text.substring(genericJsxStart + 3, jsxEnd);
        foundMarkups.push(typescriptText);
        const restOfText = text.substring(jsxEnd + 3);
        return getAllJsxFromMarkupText(restOfText, foundMarkups);
      } else {
        return foundMarkups;
      }
    }
  } catch (markupParseError) {
    console.debug(markupParseError);
    throw new Error("Invalid jsx response");
  }
};

/**
 * Replaces multiple consecutive spaces with a single space in the given content.
 *
 * @param {string} content - The content string to process.
 * @returns {string} The processed content with double spaces replaced by single spaces.
 */
const replaceDoubleSpaces = (content) => {
  // Split the input string into lines
  const lines = content.split("\n");

  // Iterate through each line and replace double spaces with single spaces
  const processedLines = lines.map((line) => line.replace(/ {2,}/g, " "));

  // Join the processed lines back together with new lines
  const result = processedLines.join("\n");

  return result;
};

/**
 * Removes extra spaces from the content of each message in the messages array.
 *
 * @param {Object[]} messages - An array of message objects.
 * @param {string} messages[].content - The content of the message.
 * @returns {Object[]} A new array of messages with spaces replaced.
 */
const removeSpacesFromMessages = (messages) => {
  return messages.map((message) => {
    return {
      ...message,
      content: replaceDoubleSpaces(message.content)
    };
  });
};

/**
 * Class responsible for interacting with the OpenAI API to generate chat responses.
 */
class ChatBot {
  /**
   * Creates an instance of ChatBot.
   *
   * @param {string} [model=defaultModel] - The OpenAI model to use.
   */
  constructor(model = defaultModel) {
    this.openai = new OpenAI({ apiKey, maxRetries: 100 });
    this.model = model;
  }

  /**
   * Sends a chat request to the OpenAI API with the given messages.
   *
   * @param {Object[]} messages - An array of message objects.
   * @returns {Promise<Object[]>} An array of response choices from OpenAI.
   */
  async callChat(messages) {
    const apiMessages = removeSpacesFromMessages(messages);
    if (shouldLog) console.debug("ChatBot ~ Request:", apiMessages);
    const params = {
      model: this.model,
      messages: apiMessages
    };

    const response = await this.openai.chat.completions.create(params);
    if (shouldLog) console.debug("ChatBot ~ response:", response.choices);

    const choices = response.choices;
    return choices;
  }

  /**
   * Retrieves a single response from the OpenAI API based on the provided prompt.
   *
   * @param {string} prompt - The prompt to send to the OpenAI API.
   * @returns {Promise<Object>} The assistant's response message.
   * @throws {Error} If no response is received from OpenAI.
   */
  async getResponse(prompt) {
    const apiMessages = [{ role: "system", content: prompt }];

    const choices = await this.callChat(apiMessages);
    const rawMessage = choices[0].message;
    if (!rawMessage) throw new Error("No response from OpenAI");
    if (shouldLog) console.debug("ChatBot ~ message:", rawMessage);
    return rawMessage;
  }

  /**
   * Retrieves and parses JSX responses from the OpenAI API.
   *
   * @param {Object[]} messages - An array of message objects.
   * @returns {Promise<string[]>} An array of extracted JSX code snippets.
   */
  async getTypescriptResponse(messages) {
    const choices = await this.callChat(messages);
    const rawMessage = choices[0].message;
    if (shouldLog) console.debug("ChatBot ~ message:", rawMessage);
    if (!rawMessage) throw new Error("No response from OpenAI");

    try {
      const message = getAllJsxFromMarkupText(rawMessage.content, []);

      if (shouldLog) console.debug("ChatBot ~ parsed:", message);
      return message;
    } catch (error) {
      console.debug(error);
    }
  }

  /**
   * Retrieves and parses JSON responses from the OpenAI API.
   *
   * @param {Object[]} messages - An array of message objects.
   * @returns {Promise<Object>} The parsed JSON response.
   */
  async getJsonResponse(messages) {
    const choices = await this.callChat(messages);
    const rawMessage = choices[0].message;
    if (shouldLog) console.debug("ChatBot ~ message:", rawMessage);
    if (!rawMessage) throw new Error("No response from OpenAI");

    try {
      const message = getJsonFromMarkupText(rawMessage.content);

      if (shouldLog) console.debug("ChatBot ~ parsed:", message);
      return message;
    } catch (error) {
      console.debug(error);
    }
  }
}

// Export the ChatBot class
module.exports = {
  ChatBot
};
