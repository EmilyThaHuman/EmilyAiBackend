const { default: axios } = require("axios");
const { PromptTemplate } = require("@langchain/core/prompts");
const { ChatOpenAI } = require("@langchain/openai");
const { SystemMessage, HumanMessage } = require("@langchain/core/messages");
const { getEnv } = require("@utils/processing/api");
const { logger } = require("@config/logging");
const { logChatDataError } = require("@utils/processing/utils/loggingFunctions");
const throttle = require("lodash/throttle");

const perplexityConfig = {
  model: "llama-3.1-sonar-small-128k-online",
  return_citations: true,
  return_images: false,
  search_recency_filter: "month",
  stream: false,
  max_tokens: 1024,
  temperature: 0.5
};

const openAIConfig = {
  model: getEnv("OPENAI_API_CHAT_COMPLETION_MODEL"),
  temperature: 0.2,
  maxTokens: 500,
  apiKey: process.env.OPENAI_API_PROJECT_KEY
};
const chatOpenAI = new ChatOpenAI(openAIConfig);

const cache = new Map();

const getCachedOrFetch = async (key, fetchFn) => {
  if (cache.has(key)) return cache.get(key);
  const result = await fetchFn();
  cache.set(key, result);
  return result;
};

const batchSummarizeMessages = async (messagesBatch, chatOpenAI) => {
  return Promise.all(messagesBatch.map((messages) => summarizeMessages(messages, chatOpenAI)));
};

const withRetry = async (fn, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise((resolve) => setTimeout(resolve, 1000 * Math.pow(2, i)));
    }
  }
};

const extractKeywords = async (text) => {
  const systemMessage = new SystemMessage(
    "You are a helpful assistant that extracts main keywords from given text."
  );
  const humanMessage = new HumanMessage(
    `Extract the main keywords from the following text:\n\n${text}\n\nProvide the keywords as a comma-separated list.`
  );

  const response = await chatOpenAI.invoke([systemMessage, humanMessage]);
  logger.info(`Extracted keywords: ${response.content}`);
  return response.content.split(",").map((keyword) => keyword.trim());
};

const summarizeMessages = async (messages, chatOpenAI) => {
  const summarizeFunction = {
    name: "summarize_messages",
    description:
      "Summarize a list of chat messages with an overall summary and individual message summaries including their IDs",
    parameters: {
      type: "object",
      properties: {
        overallSummary: {
          type: "string",
          description: "An overall summary of the chat messages"
        },
        individualSummaries: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: {
                type: "string",
                description: "The ID of the chat message"
              },
              summary: {
                type: "string",
                description: "A summary of the individual chat message"
              }
            },
            required: ["id", "summary"]
          }
        }
      },
      required: ["overallSummary", "individualSummaries"]
    }
  };
  const response = await chatOpenAI.completionWithRetry({
    model: getEnv("OPENAI_API_CHAT_COMPLETION_MODEL"),
    messages: [
      { role: "system", content: "You are a helpful assistant that summarizes chat messages." },
      {
        role: "user",
        content: `Summarize these messages. Provide an overall summary and a summary for each message with its corresponding ID: ${JSON.stringify(messages)}`
      }
    ],
    functions: [summarizeFunction],
    function_call: { name: "summarize_messages" }
  });
  const functionCall = response.choices[0].message.function_call;
  if (functionCall && functionCall.name === "summarize_messages") {
    const { overallSummary, individualSummaries } = JSON.parse(functionCall.arguments);
    return {
      overallSummary,
      individualSummaries
    };
  }
  return { overallSummary: "Unable to generate summary", individualSummaries: [] };
};

const extractSummaries = (summaryResponse) => {
  const overallSummaryString = summaryResponse.overallSummary;
  const individualSummariesArray = summaryResponse.individualSummaries.map((summary) => ({
    id: summary.id,
    summary: summary.summary
  }));

  return {
    overallSummaryString,
    individualSummariesArray
  };
};

const handleSummarization = async (messages, chatOpenAI, sessionId) => {
  try {
    const summary = await summarizeMessages(messages.slice(-5), chatOpenAI);
    const { overallSummaryString, individualSummariesArray } = extractSummaries(summary);
    logger.info(`Overall Summary: ${overallSummaryString}`);
    logger.info(`Individual Summaries: ${JSON.stringify(individualSummariesArray)}`);
    return summary;
  } catch (error) {
    const chatData = { sessionId, messages };
    logChatDataError("handleSummarization", chatData, error);
    throw error;
  }
};

async function performPerplexityCompletion(prompt, perplexityApiKey) {
  if (!prompt || typeof prompt !== "string") {
    throw new Error("Invalid prompt: Prompt must be a non-empty string");
  }
  if (!perplexityApiKey || typeof perplexityApiKey !== "string") {
    throw new Error("Invalid API key: API key must be a non-empty string");
  }
  try {
    // const data = {
    //   model: "llama-3.1-sonar-small-128k-online",
    //   messages: [
    //     {
    //       role: "system",
    //       content:
    //         "Provide a concise answer. Include in-text citations in the format [citation_number], and return a separate list of citations."
    //     },
    //     { role: "user", content: prompt }
    //   ],
    //   return_citations: true,
    //   return_images: false,
    //   search_recency_filter: "month",
    //   stream: false,
    //   max_tokens: 1024,
    //   temperature: 0.5
    // };
    const data = {
      ...perplexityConfig,
      messages: [
        {
          role: "system",
          content:
            "Provide a concise answer. Include in-text citations in the format [citation_number], and return a separate list of citations."
        },
        { role: "user", content: prompt }
      ]
    };
    const config = {
      method: "post",
      url: "https://api.perplexity.ai/chat/completions",
      headers: {
        Authorization: `Bearer ${perplexityApiKey}`,
        "Content-Type": "application/json"
      },
      data: data
    };
    logger.info(`Perplexity completion: ${prompt}`);
    const response = await axios(config);
    if (!response.data || !response.data.choices || !response.data.choices[0]) {
      throw new Error("Invalid response format from Perplexity API");
    }

    const completion = response.data.choices[0].message.content.trim();
    const citations = response.data.choices[0].message.citations || [];
    logger.info(`Perplexity completion response: ${completion} - Citations: ${citations.length}`);

    return {
      pageContent: completion,
      metadata: {
        source: "Perplexity AI",
        citations
      }
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response) {
        console.error(
          `Perplexity API error: ${error.response.status} - ${JSON.stringify(error.response.data)}`
        );
        throw new Error(`Perplexity API error: ${error.response.status}`);
      } else if (error.request) {
        console.error("No response received from Perplexity API");
        throw new Error("No response received from Perplexity API");
      } else {
        console.error("Error setting up the request:", error.message);
        throw new Error("Error setting up the request to Perplexity API");
      }
    } else {
      console.error("Unexpected error during Perplexity completion:", error);
      throw new Error("Unexpected error during Perplexity completion");
    }
  }
}

async function rephraseInput(inputString) {
  console.log(`4. Rephrasing input`);
  const groqResponse = await openai.chat.completions.create({
    model: "mixtral-8x7b-32768",
    messages: [
      {
        role: "system",
        content:
          "You are a rephraser and always respond with a rephrased version of the input that is given to a search engine API. Always be succint and use the same words as the input. ONLY RETURN THE REPHRASED VERSION OF THE INPUT."
      },
      { role: "user", content: inputString }
    ]
  });
  console.log(`5. Rephrased input and got answer from Groq`);
  return groqResponse.choices[0].message.content;
}

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
    inputVariables: ["input"]
  });

  const chain = new ChatOpenAI({ prompt: promptTemplate });
  const result = await chain.invoke({ input });
  return result.text;
};

const throttledPerplexityCompletion = throttle(performPerplexityCompletion, 1000);

module.exports = {
  summarizeMessages,
  extractSummaries,
  handleSummarization,
  performPerplexityCompletion,
  generateOptimizedPrompt,
  extractKeywords,
  rephraseInput,
  throttledPerplexityCompletion
};
