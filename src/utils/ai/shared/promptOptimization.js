const { ChatOpenAI, OpenAIEmbeddings } = require("@langchain/openai");
const { PineconeStore } = require("@langchain/pinecone");
const { createPineconeIndex } = require("../pinecone");
const { Pinecone } = require("@pinecone-database/pinecone");
const { getEnv } = require("@utils/processing/api");
const cheerio = require("cheerio");
const axios = require("axios");
const { SystemMessage, HumanMessage } = require("@langchain/core/messages");
const { UI_LIBRARIES } = require("@config/constants");
const { PromptTemplate } = require("@langchain/core/prompts");
const { logger } = require("@config/logging");

const chatOpenAI = new ChatOpenAI({
  model: getEnv("OPENAI_API_CHAT_COMPLETION_MODEL"),
  temperature: 0.2,
  maxTokens: 500,
  apiKey: process.env.OPENAI_API_PROJECT_KEY
});

const performSemanticSearch = async (query, k = 3) => {
  const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY
  });
  // Initialize OpenAI embeddings
  let embedder;
  try {
    embedder = new OpenAIEmbeddings({
      modelName: "text-embedding-3-small",
      apiKey: process.env.OPENAI_API_PROJECT_KEY,
      dimensions: 512
    });
  } catch (error) {
    throw new Error("Failed to initialize OpenAI embeddings: " + error.message);
  }
  const vectorStore = await PineconeStore.fromExistingIndex(embedder, {
    pineconeIndex: await createPineconeIndex(pinecone, getEnv("PINECONE_NAMESPACE_1")),
    namespace: "chat-history",
    textKey: "text"
  });
  const results = await vectorStore.similaritySearch(query, k);
  return results.map((result) => result.pageContent);
};

const generateResponse = async (input, context) => {
  const template = `
    You are a helpful AI assistant. Use the following context to answer the human's question:

    Context: {context}

    Human: {input}
    AI: Let's approach this step-by-step:
  `;

  const promptTemplate = new PromptTemplate({
    template: template,
    inputVariables: ["context", "input"]
  });

  const result = await chatOpenAI.invoke(promptTemplate.format({ context, input }));
  return result.text;
};

const summarizeText = async (text) => {
  const template = `
    Summarize the following text in a concise manner:

    {text}

    Summary:
  `;

  const promptTemplate = new PromptTemplate({
    template: template,
    inputVariables: ["text"]
  });

  const result = await chatOpenAI.invoke(promptTemplate.format({ text }));
  return result.text;
};

const identifyLibrariesAndComponents = async (query) => {
  try {
    const systemMessage = new SystemMessage(
      "You are an AI assistant that identifies UI libraries, JS libraries, and component types mentioned in a query. Respond only with the requested JSON format, nothing else."
    );
    const humanMessage = new HumanMessage(
      `Analyze the following query and identify any mentioned UI libraries, JS libraries, and component types:
      Query: ${query}
      
      Respond ONLY with a JSON object in this exact format:
      {
        "uiLibraries": ["library1", "library2"],
        "jsLibraries": ["library1", "library2"],
        "componentTypes": ["component1", "component2"]
      }
      
      Rules:
      1. Include "React" in both uiLibraries and jsLibraries by default.
      2. If no specific component types are mentioned, include "Component" as a default.
      3. Ensure all arrays are present, even if empty.
      4. Do not include any explanations or additional text outside the JSON object.`
    );

    const response = await chatOpenAI.invoke([systemMessage, humanMessage]);
    logger.info(`Identified libraries and components: ${response.content}`);

    let parsedResponse;
    try {
      // Extract JSON object from the response if necessary
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch : response.content;
      parsedResponse = JSON.parse(jsonString);
    } catch (parseError) {
      logger.error(`Error parsing JSON response: ${parseError}`);
      throw new Error("Invalid JSON response");
    }

    // Ensure all expected properties exist and follow the rules
    const result = {
      uiLibraries: Array.isArray(parsedResponse.uiLibraries)
        ? [...new Set(["React", ...parsedResponse.uiLibraries])]
        : ["React"],
      jsLibraries: Array.isArray(parsedResponse.jsLibraries)
        ? [...new Set(["React", ...parsedResponse.jsLibraries])]
        : ["React"],
      componentTypes:
        Array.isArray(parsedResponse.componentTypes) && parsedResponse.componentTypes.length > 0
          ? parsedResponse.componentTypes
          : ["Component"]
    };

    return result;
  } catch (error) {
    logger.error(`Error identifying libraries and components: ${error}`);
    // Return default values in case of any error
    return {
      uiLibraries: ["React"],
      jsLibraries: ["React"],
      componentTypes: ["App"]
    };
  }
};

/**
 * Retrieves the documentation URL for a specific component type within a given UI library.
 *
 * @async
 * @function getDocumentationUrl
 * @param {string} library - The name of the UI library.
 * @param {string} componentType - The type of component to search for.
 * @returns {Promise<string|null>} A promise that resolves to the documentation URL if found, or null if not found.
 * @throws {Error} If there's an error during the process, it will be logged and the function will return undefined.
 *
 * @description
 * This function performs the following steps:
 * 1. Searches for a matching library in the `uiLibraries` array.
 * 2. If found, retrieves the sitemap URL for that library.
 * 3. Fetches the sitemap XML using axios.
 * 4. Parses the XML using cheerio.
 * 5. Searches for URLs in the sitemap that include the given component type.
 * 6. Returns the first matching URL, or null if no match is found.
 *
 * @example
 * // Usage
 * const url = await getDocumentationUrl('react-bootstrap', 'button');
 * if (url) {
 *   console.log(`Documentation URL: ${url}`);
 * } else {
 *   console.log('Documentation not found');
 * }
 *
 * @requires axios
 * @requires cheerio
 * @requires logger - A custom logging utility
 * @requires uiLibraries - An array of UI library objects with 'name' and 'sitemap' properties
 */
const getDocumentationUrl = async (library, componentType) => {
  try {
    if (!library || !componentType) return null;
    // 1. Use Array.find() with case-insensitive comparison
    const matchingLibrary = UI_LIBRARIES.find(
      (lib) => lib.name.toLowerCase() === library.toLowerCase()
    );
    if (!matchingLibrary) return null;

    // 2. Destructure the sitemap property
    const { sitemap: sitemapUrl } = matchingLibrary;

    // 3. Use axios.get() with a timeout
    const response = await axios.get(sitemapUrl, { timeout: 5000 });

    // 4. Use a more efficient parsing method
    const $ = cheerio.load(response.data, { xmlMode: true });

    // 5. Optimize URL search
    const lowercaseComponentType = componentType.toLowerCase();
    const relevantUrl = $("url loc")
      .filter((_, el) => $(el).text().toLowerCase().includes(lowercaseComponentType))
      .first()
      .text();

    return relevantUrl || null;
  } catch (error) {
    // 6. Improve error logging
    logger.error("Error getting documentation URL:", {
      library,
      componentType,
      error: error.message
    });
    return null;
  }
};

const scrapeDocumentation = async (url) => {
  const response = await axios.get(url);
  const $ = cheerio.load(response.data);

  // Customize this based on the structure of the documentation pages
  const content = $("main").text();
  return content;
};

const generateOptimizationPrompt = async (query, results) => {
  const template = `
    You are an expert in React and the following libraries: {libraries}.
    The user asks: '{query}'.

    Based on the following documentation snippets, provide an optimized solution:

    {docSnippets}

    Optimized solution:
  `;

  const promptTemplate = new PromptTemplate({
    template: template,
    inputVariables: ["libraries", "query", "docSnippets"]
  });

  const libraries = [...results.uiLibraries, ...results.jsLibraries].join(", ");
  const docSnippets = results.documentationContent
    .map((doc) => `${doc.library} - ${doc.componentType}:\n${doc.content}\n`)
    .join("\n");

  return promptTemplate.format({
    libraries,
    query,
    docSnippets
  });
};

function parseIfNecessary(obj) {
  if (typeof obj === "string") {
    try {
      return JSON.parse(obj); // Attempt to parse the string into an object
    } catch (error) {
      console.error("Failed to parse object:", error);
      return null; // Return null or handle the error as needed
    }
  }
  return obj; // Return as is if it's already an object
}

module.exports = {
  generateOptimizationPrompt,
  performSemanticSearch,
  generateResponse,
  summarizeText,
  identifyLibrariesAndComponents,
  getDocumentationUrl,
  scrapeDocumentation,
  parseIfNecessary
};
// function generateDocumentation(code) {
//   const jsdocComments = extractJSDocComments(code);
//   const parsedComments = jsdocComments.map(comment => doctrine.parse(comment, { unwrap: true }));
//   const documentation = jsdoc2md.renderSync({
//     data: parsedComments,
//     template: getCustomTemplate(),
//   });
//   return documentation;
// }

// function extractJSDocComments(code) {
//   const jsdocRegex = /\/\*\*\s*\n([^*]|\*[^/])*\*\//g;
//   const comments = code.match(jsdocRegex);
//   return comments || [];
// }

// function getCustomTemplate() {
//   return `
// # API Documentation

// {{#each this}}
// ## {{name}}

// {{{description}}}

// {{#if params.length}}
// ### Parameters

// | Name | Type | Description |
// |------|------|-------------|
// {{#each params}}
// | {{name}} | {{type.name}} | {{{description}}} |
// {{/each}}
// {{/if}}

// {{#if returns}}
// ### Returns

// {{#each returns}}
// {{#if type}}**{{type.name}}**: {{/if}}{{{description}}}
// {{/each}}
// {{/if}}

// {{#if examples.length}}
// ### Examples

// {{#each examples}}
// \`\`\`javascript
// {{{this}}}
// \`\`\`
// {{/each}}
// {{/if}}

// ---

// {{/each}}
//   `;
// }
// Main execution function
// const executeRagChain = async (userQuery) => {
//   const results = await processQuery(userQuery);
//   const optimizationPrompt = await generateOptimizationPrompt(userQuery, results);

//   // Save the prompt build
//   await savePromptBuild(
//     "You are an AI assistant specializing in React and various UI libraries.",
//     "Provide optimized solutions based on the user's query and the provided documentation.",
//     optimizationPrompt
//   );

//   // Here you would typically send the optimizationPrompt to your LLM for the final response
//   // const finalResponse = await llm.invoke(optimizationPrompt);
//   // return finalResponse;

//   return {
//     results,
//     optimizationPrompt,
//   };
// };
