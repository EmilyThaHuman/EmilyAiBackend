// utils/openAIUtils.js
// import { OpenAI } from 'langchain/llms/openai';
// import { PromptTemplate } from 'langchain/prompts';
// import { LLMChain } from 'langchain/chains';
// import { initializeVectorStore } from './vectorStore.js';

const { ChatOpenAI, OpenAIEmbeddings } = require('@langchain/openai');
const { PromptTemplate } = require('@langchain/core/prompts');
const { PineconeStore } = require('@langchain/pinecone');
const { createPineconeIndex } = require('../pinecone');
const { Pinecone } = require('@pinecone-database/pinecone');
const { getEnv } = require('@/utils/api');
const fs = require('fs').promises;
const path = require('path');
const { logger } = require('@/config/logging');
// const doctrine = require('doctrine');
// const jsdoc2md = require('jsdoc-to-markdown');
const cheerio = require('cheerio');
const axios = require('axios');
const { SystemMessage, HumanMessage } = require('@langchain/core/messages');
const { cleanJSONString } = require('@/utils/processing');

const uiLibraries = [
  { name: 'React', sitemap: 'https://reactjs.org/sitemap.xml' },
  { name: 'Vue', sitemap: 'https://vuejs.org/sitemap.xml' },
  { name: 'Angular', sitemap: 'https://angular.io/generated/sitemap.xml' },
  { name: 'Svelte', sitemap: 'https://svelte.dev/sitemap.xml' },
  { name: 'Tailwind CSS', sitemap: 'https://tailwindcss.com/sitemap.xml' },
  { name: 'Material-UI', sitemap: 'https://mui.com/sitemap.xml' },
  { name: 'Radix UI', sitemap: 'https://www.radix-ui.com/sitemap.xml' },
  { name: 'Chakra UI', sitemap: 'https://chakra-ui.com/sitemap.xml' },
  { name: 'Ant Design', sitemap: 'https://ant.design/sitemap.xml' },
  { name: 'Bootstrap', sitemap: 'https://getbootstrap.com/sitemap.xml' },
  { name: 'Semantic UI', sitemap: 'https://semantic-ui.com/sitemap.xml' },
  { name: 'Bulma', sitemap: 'https://bulma.io/sitemap.xml' },
  { name: 'Foundation', sitemap: 'https://get.foundation/sitemap.xml' },
];

const chatOpenAI = new ChatOpenAI({
  model: getEnv('OPENAI_API_CHAT_COMPLETION_MODEL'),
  temperature: 0.7,
  maxTokens: 500,
  apiKey: process.env.OPENAI_API_PROJECT_KEY, // Ensure your API key is set in the environment variables
});
// async function generateAndLintCode(prompt) {
//   const generatedCode = await generateCodeFromPrompt(prompt);

//   const eslint = new ESLint({ fix: true });
//   const results = await eslint.lintText(generatedCode);
//   const lintedCode = results[0].output || generatedCode;

//   const formattedCode = prettier.format(lintedCode, {
//     parser: 'babel',
//     semi: true,
//     singleQuote: true,
//     trailingComma: 'es5',
//   });

//   return formattedCode;
// }
const generateOptimizedPrompt = async (input) => {
  const template = `
    Given the user input: {input}

    Generate an optimized prompt that:
    1. Clarifies any ambiguities in the input
    2. Adds relevant context or background information
    3. Specifies the desired output format or structure
    4. Encourages a comprehensive and detailed response
    5. Includes any necessary constraints or guidelines

    Optimized prompt:
  `;

  const promptTemplate = new PromptTemplate({
    template: template,
    inputVariables: ['input'],
  });

  const chain = new ChatOpenAI({ prompt: promptTemplate });
  const result = await chain.call({ input });
  return result.text;
};
const performSemanticSearch = async (query, k = 3) => {
  const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY,
  });
  // Initialize OpenAI embeddings
  let embedder;
  try {
    embedder = new OpenAIEmbeddings({
      modelName: 'text-embedding-3-small',
      apiKey: process.env.OPENAI_API_PROJECT_KEY,
      dimensions: 512,
    });
  } catch (error) {
    throw new Error('Failed to initialize OpenAI embeddings: ' + error.message);
  }
  const vectorStore = await PineconeStore.fromExistingIndex(embedder, {
    pineconeIndex: await createPineconeIndex(pinecone, getEnv('PINECONE_NAMESPACE_1')),
    namespace: 'chat-history',
    textKey: 'text',
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
    inputVariables: ['context', 'input'],
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
    inputVariables: ['text'],
  });

  const result = await chatOpenAI.invoke(promptTemplate.format({ text }));
  return result.text;
};

// Function to extract keywords from the user query
const extractKeywords = async (text) => {
  const systemMessage = new SystemMessage(
    'You are a helpful assistant that extracts main keywords from given text.'
  );
  const humanMessage = new HumanMessage(
    `Extract the main keywords from the following text:\n\n${text}\n\nProvide the keywords as a comma-separated list.`
  );

  const response = await chatOpenAI.invoke([systemMessage, humanMessage]);
  logger.info(`Extracted keywords: ${response.content}`);
  return response.content.split(',').map((keyword) => keyword.trim());
};

// Function to identify mentioned libraries and component types
const identifyLibrariesAndComponents = async (query) => {
  try {
    const systemMessage = new SystemMessage(
      'You are a helpful assistant that identifies UI libraries, JS libraries, and component types mentioned in a query.'
    );
    const humanMessage = new HumanMessage(
      `Analyze the following query and identify any mentioned UI libraries, JS libraries, and component types:
        Query: ${query}
        Provide the results in the following JSON format:
        {
          "uiLibraries": ["library1", "library2"],
          "jsLibraries": ["library1", "library2"],
          "componentTypes": ["component1", "component2"]
        }`
    );

    const response = await chatOpenAI.invoke([systemMessage, humanMessage]);
    logger.info(`Identified libraries and components: ${response.content}`);
    const parsedResponse = JSON.parse(cleanJSONString(response.content));
    return {
      uiLibraries: parsedResponse.uiLibraries,
      jsLibraries: parsedResponse.jsLibraries,
      componentTypes: parsedResponse.componentTypes,
    };
  } catch (error) {
    logger.error(`Error identifying libraries and components: ${error}`);
    return { uiLibraries: [], jsLibraries: [], componentTypes: [] };
  }
};

// Function to get the documentation URL for a specific library and component
const getDocumentationUrl = async (library, componentType) => {
  try {
    const matchingLibrary = uiLibraries.find(
      (lib) => lib.name.toLowerCase() === library.toLowerCase()
    );
    if (!matchingLibrary) return null;

    const sitemapUrl = matchingLibrary.sitemap;
    const response = await axios.get(sitemapUrl);
    const $ = cheerio.load(response.data, { xmlMode: true });

    const relevantUrls = $('url')
      .map((_, el) => {
        const url = $(el).find('loc').text();
        if (url.toLowerCase().includes(componentType.toLowerCase())) {
          return url;
        }
      })
      .get();

    return relevantUrls[0] || null;
  } catch (error) {
    logger.error(`Error getting documentation URL: ${error}`);
    return null;
  }
};

// Function to scrape documentation content
const scrapeDocumentation = async (url) => {
  const response = await axios.get(url);
  const $ = cheerio.load(response.data);

  // Customize this based on the structure of the documentation pages
  const content = $('main').text();
  return content;
};

// Main function to process the user query and retrieve relevant documentation
const processQuery = async (query) => {
  const keywords = await extractKeywords(query);
  const { uiLibraries, jsLibraries, componentTypes } = await identifyLibrariesAndComponents(query);

  let documentationContent = [];

  if (uiLibraries.length > 0 && componentTypes.length > 0) {
    for (const library of uiLibraries) {
      for (const componentType of componentTypes) {
        const docUrl = await getDocumentationUrl(library, componentType);
        if (docUrl) {
          const content = await scrapeDocumentation(docUrl);
          documentationContent.push({ library, componentType, content });
        }
      }
    }
  } else if (componentTypes.length > 0) {
    // If no specific library is mentioned, scrape three random libraries
    const randomLibraries = uiLibraries.sort(() => 0.5 - Math.random()).slice(0, 3);

    for (const library of randomLibraries) {
      for (const componentType of componentTypes) {
        const docUrl = await getDocumentationUrl(library.name, componentType);
        if (docUrl) {
          const content = await scrapeDocumentation(docUrl);
          documentationContent.push({ library: library.name, componentType, content });
        }
      }
    }
  }

  return {
    keywords,
    uiLibraries,
    jsLibraries,
    componentTypes,
    documentationContent,
  };
};

// Function to generate the optimization prompt
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
    inputVariables: ['libraries', 'query', 'docSnippets'],
  });

  const libraries = [...results.uiLibraries, ...results.jsLibraries].join(', ');
  const docSnippets = results.documentationContent
    .map((doc) => `${doc.library} - ${doc.componentType}:\n${doc.content}\n`)
    .join('\n');

  return promptTemplate.format({
    libraries,
    query,
    docSnippets,
  });
};

async function savePromptBuild(
  systemContent,
  assistantInstructions,
  formattedPrompt,
  // eslint-disable-next-line no-unused-vars
  fileName = 'prompt_build.txt'
) {
  const newFileName = `prompt-build_${new Date().toISOString().replace(/[:.]/g, '-')}.txt`;
  const promptBuildFile = path.join(
    __dirname,
    '..',
    '..',
    '..',
    '..',
    '/public/static/files',
    newFileName
  );
  const promptBuild = `
    SYSTEM PROMPT: ${systemContent}

    ASSISTANT INSTRUCTIONS: ${assistantInstructions}

    FORMATTED PROMPT: ${formattedPrompt}
  `;

  try {
    await fs.writeFile(promptBuildFile, promptBuild);
    logger.info(`Prompt build saved to ${promptBuildFile}`);
  } catch (error) {
    logger.error(`Error saving prompt build: ${error}`);
  }
}
function parseIfNecessary(obj) {
  if (typeof obj === 'string') {
    try {
      return JSON.parse(obj); // Attempt to parse the string into an object
    } catch (error) {
      console.error('Failed to parse object:', error);
      return null; // Return null or handle the error as needed
    }
  }
  return obj; // Return as is if it's already an object
}

function formatResponseForDocument(content) {
  const { text, formatting = [], lists = [], codeBlocks = [], latex = [] } = content;
  let formattedText = text;

  // Utility function to apply formatting rules
  function applyFormatting(text, formattingRules) {
    if (!Array.isArray(formattingRules)) return text;
    formattingRules.sort((a, b) => b.start - a.start); // Sort descending

    formattingRules.forEach((rule) => {
      const { type, start, end, level, url } = rule;
      const substring = text.slice(start, end);
      let replacement = substring;

      switch (type) {
        case 'bold':
          replacement = `**${substring}**`;
          break;
        case 'italic':
          replacement = `*${substring}*`;
          break;
        case 'underline':
          replacement = `__${substring}__`;
          break;
        case 'code':
          replacement = `\`${substring}\``;
          break;
        case 'link':
          replacement = `[${substring}](${url})`;
          break;
        case 'header':
          replacement = `${'#'.repeat(level || 1)} ${substring}`;
          break;
        case 'strikethrough':
          replacement = `~~${substring}~~`;
          break;
        default:
          break;
      }
      text = text.slice(0, start) + replacement + text.slice(end);
    });
    return text;
  }

  // Apply list formatting and convert it to a table-like format if necessary
  function applyLists(text, listRules) {
    if (!Array.isArray(listRules)) return text;
    listRules.sort((a, b) => b.start - a.start);

    listRules.forEach((list) => {
      const listItems = list.items.map((item) => `- ${item}`).join('\n');
      text = text.slice(0, list.start) + listItems + text.slice(list.end);
    });
    return text;
  }

  // Apply code block formatting
  function applyCodeBlocks(text, codeBlockRules) {
    if (!Array.isArray(codeBlockRules)) return text;
    codeBlockRules.sort((a, b) => b.start - a.start);

    codeBlockRules.forEach((block) => {
      const codeBlock = `\`\`\`${block.language || ''}\n${block.code || text.slice(block.start, block.end)}\n\`\`\``;
      text = text.slice(0, block.start) + codeBlock + text.slice(block.end);
    });
    return text;
  }

  // Apply LaTeX formatting
  function applyLatex(text, latexRules) {
    if (!Array.isArray(latexRules)) return text;
    latexRules.sort((a, b) => b.start - a.start);

    latexRules.forEach((expression) => {
      const latexContent = text.slice(expression.start, expression.end);
      const formattedLatex = `$$${latexContent}$$`;
      text = text.slice(0, expression.start) + formattedLatex + text.slice(expression.end);
    });
    return text;
  }

  // Function to create a table from data if necessary
  function createTableFromContent(content) {
    // Example of assuming content is in a specific format
    const tableHeader = '| Column 1 | Column 2 | Column 3 |\n| --- | --- | --- |\n'; // Example header
    const tableRows = content
      .map((row) => `| ${row.col1} | ${row.col2} | ${row.col3} |`)
      .join('\n');
    return tableHeader + tableRows;
  }

  // Apply all formatting progressively
  formattedText = applyFormatting(formattedText, formatting);
  formattedText = applyLists(formattedText, lists);
  formattedText = applyCodeBlocks(formattedText, codeBlocks);
  formattedText = applyLatex(formattedText, latex);

  // Check if a table needs to be generated from the content
  if (Array.isArray(content.tableData)) {
    // Assuming content.tableData holds tabular data
    formattedText += createTableFromContent(content.tableData);
  }

  return formattedText;
}

function formatResponse(obj) {
  // Parse the object if it's a string
  const parsedObj = parseIfNecessary(obj);

  if (!parsedObj) {
    throw new Error('Invalid object format');
  }

  const {
    message: { role, content },
  } = parsedObj;

  // Get the fully formatted content
  const formattedText = formatResponseForDocument(content);

  // Return the structured message as markdown
  return JSON.stringify({
    role, // Optionally include the role
    type: 'markdown',
    content: formattedText,
  });
}

async function saveChatCompletion(
  systemContent,
  assistantInstructions,
  formattedPrompt,
  fullResponse, // Contains the message content that needs to be formatted
  // eslint-disable-next-line no-unused-vars
  fileName = 'chat_completion.txt'
) {
  const newFileName = `chat-completion_${new Date().toISOString().replace(/[:.]/g, '-')}.txt`;
  const chatCompletionFile = path.join(
    __dirname,
    '..',
    '..',
    '..',
    '..',
    '/public/static/files',
    newFileName
  );

  try {
    // Parse and apply the formatting logic on `fullResponse` using the `formatResponse` function
    let formattedContent = formatResponse(fullResponse);

    // Construct the content to save, including system content, assistant instructions, and the prompt
    const chatCompletionContent = `
      CHAT COMPLETION RESPONSE: ${formattedContent}
    `;

    // Write the formatted chat completion to the specified file
    await fs.writeFile(chatCompletionFile, chatCompletionContent);
    logger.info(`Chat completion saved to ${chatCompletionFile}`);
  } catch (error) {
    logger.error(`Error saving chat completion: ${error}`);
  }
}
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
module.exports = {
  generateOptimizedPrompt,
  generateOptimizationPrompt,
  performSemanticSearch,
  generateResponse,
  summarizeText,
  extractKeywords,
  savePromptBuild,
  // generateDocumentation,
  // extractJSDocComments,
  // getCustomTemplate,
  identifyLibrariesAndComponents,
  getDocumentationUrl,
  scrapeDocumentation,
  processQuery,
  saveChatCompletion,
  formatResponse,
  formatResponseForDocument,
};
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
