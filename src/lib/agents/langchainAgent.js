// 0. Initial setup instructions

// a. Clone the repository: https://github.com/vercel-labs/ai/tree/main/examples/next-openai
// b. Get an API key from OpenAI platform: https://platform.openai.com/account/api-keys
// c. Upgrade langchain to the latest version using npm: npm update langchain@latest
// d. Remove the ".example" from the ".env.local" file
// e. OPTIONAL: Go to https://smith.langchain.com/, create a new project, and put environment variables into the ".env" file
// f. Get your API key from langsmith.com and add it to the ".env" file

// 1. Import necessary modules for chat functionality and schema validation

// a. Import DynamicTool and DynamicStructuredTool classes for creating custom tools
import { DynamicTool, DynamicStructuredTool } from "langchain/tools";

// b. Import the ChatOpenAI class for using the OpenAI model in the chat
import { ChatOpenAI } from "langchain/chat_models/openai";

// c. Import the createToolCallingAgent function and AgentExecutor for setting up the agent executor
import { createToolCallingAgent, AgentExecutor } from "langchain/agents";

// d. Import the WikipediaQueryRun class for fetching information from Wikipedia
import { WikipediaQueryRun } from "langchain/tools";

// e. Import the streamText function for streaming text responses
import { streamText } from "ai";

// f. Import zod for schema validation
import * as z from "zod";

// 2. Specify the execution runtime as 'edge'
export const runtime = "edge";

// 3. Define the POST method to handle incoming requests
export async function POST(req, res) {
  // 4. Extract message data from the incoming request
  const { messages } = await req.json();

  // 5. Initialize the ChatOpenAI model with specified configurations
  const model = new ChatOpenAI({ temperature: 0, streaming: true });

  // 6. Set up a Wikipedia query tool for fetching relevant information
  const wikipediaQuery = new WikipediaQueryRun({
    topKResults: 1,
    maxDocContentLength: 300
  });

  // 7. Define a tool named 'foo' for demonstration purposes
  const foo = new DynamicTool({
    name: "foo",
    description: "Returns the answer to what foo is",
    func: async () => {
      console.log("Triggered foo function");
      return 'The value of foo is "This is a demo for YouTube"';
    }
  });

  // 8. Define a structured tool to fetch cryptocurrency prices from the CoinGecko API
  const fetchCryptoPrice = new DynamicStructuredTool({
    name: "fetchCryptoPrice",
    description: "Fetches the current price of a specified cryptocurrency",
    schema: z.object({
      cryptoName: z.string(),
      vsCurrency: z.string().optional().default("USD")
    }),
    func: async (options) => {
      console.log("Triggered fetchCryptoPrice function with options:", options);
      const { cryptoName, vsCurrency } = options;
      const url = `https://api.coingecko.com/api/v3/simple/price?ids=${cryptoName}&vs_currencies=${vsCurrency}`;
      const response = await fetch(url);
      const data = await response.json();
      return data[cryptoName.toLowerCase()][vsCurrency.toLowerCase()].toString();
    }
  });

  // 9. List all the tools to be used by the agent during execution
  const tools = [wikipediaQuery, foo, fetchCryptoPrice];

  // 10. Initialize the agent and executor with the provided tools and model
  const agent = createToolCallingAgent({ llm: model, tools });
  const executor = AgentExecutor.fromAgentAndTools({
    agent,
    tools,
    returnIntermediateSteps: true
  });

  // 11. Extract the most recent input message from the array of messages
  const input = messages[messages.length - 1].content;

  // 12. Execute the agent with the provided input to get a response
  const result = await executor.run(input);

  // 13. Break the result into individual word chunks for streaming
  const chunks = result.split(" ");

  // 14. Define the streaming mechanism to send chunks of data to the client
  const responseStream = new ReadableStream({
    async start(controller) {
      for (const chunk of chunks) {
        const bytes = new TextEncoder().encode(chunk + " ");
        controller.enqueue(bytes);
        await new Promise((r) => setTimeout(r, Math.floor(Math.random() * 20 + 10)));
      }
      controller.close();
    }
  });

  // 15. Send the created stream as a response to the client
  return streamText(responseStream);
}
