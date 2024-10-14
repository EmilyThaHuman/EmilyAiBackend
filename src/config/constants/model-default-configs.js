const defaultAssistantsConfig = [
  {
    name: "Code Interpreter Assistant",
    description: "An assistant that can interpret and run code snippets.",
    tools: [
      {
        name: "code-interpreter",
        parameters: {}
      }
    ]
  },
  {
    name: "Programming Assistant",
    description:
      "You are an AI programming assistant. Follow the users requirements carefully and to the letter. First, think step-by-step and describe your plan for what to build in pseudocode, written out in great detail. Then, output the code in a single code block. Minimize any other prose.",
    tools: [
      {
        name: "code-interpreter",
        parameters: {}
      }
    ]
  },
  {
    name: "Git Assistant",
    description:
      "You are an AI assistant knowledgeable in Git and version control best practices. Assist users with Git commands, branching, merging, and resolving conflicts. Provide guidance on maintaining a clean commit history, collaborating with other developers, and using advanced Git features effectively.",
    tools: [
      {
        name: "git-assistant",
        parameters: {}
      }
    ]
  }
];

const defaultModelsConfig = [
  {
    name: "gpt-3.5-turbo",
    description:
      "Most capable GPT-3.5 model and optimized for chat at 1/10th the cost of text-davinci-003. Will be updated with our latest model iteration.",
    maxTokens: 4096,
    temperature: 0.7,
    topP: 1,
    frequencyPenalty: 0,
    presencePenalty: 0,
    n: 1,
    stop: null,
    maxRetries: 3,
    model: "gpt-3.5-turbo",
    modelType: "gpt-3.5-turbo",
    modelVersion: "0613",
    modelProvider: "openai",
    modelProviderVersion: "0613",
    modelProviderModel: "gpt-3.5-turbo",
    modelProviderModelVersion: "0613",
    modelProviderModelProvider: "openai",
    modelProviderModelProviderVersion: "0613",
    modelProvider: "openai",
    modelProviderVersion: "0613"
  }
];

const hostedModelsConfig = {
  default: {
    schema: {
      headers: {
        type: "object"
      },
      baseURL: {
        type: "string"
      },
      timeout: {
        type: "number"
      }
    },
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
    },
    baseURL: "https://api.openai.com/v1",
    timeout: 120000
  },
  models: {
    name: "gpt-3.5-turbo",
    description:
      "Most capable GPT-3.5 model and optimized for chat at 1/10th the cost of text-davinci-003. Will be updated with our latest model iteration.",
    maxTokens: 4096,
    temperature: 0.7,
    topP: 1,
    frequencyPenalty: 0,
    presencePenalty: 0,
    n: 1,
    stop: null,
    maxRetries: 3,
    model: "gpt-3.5-turbo",
    modelType: "gpt-3.5-turbo",
    modelVersion: "0613",
    modelProvider: "openai",
    modelProviderVersion: "0613",
    modelProviderModel: "gpt-3.5-turbo",
    modelProviderModelVersion: "0613",
    modelProviderModelProvider: "openai",
    modelProviderModelProviderVersion: "0613",
    modelProvider: "openai",
    modelProviderVersion: "0613"
  }
};

const otherModelConfigOptions = {
  proxy: {
    default: `${process.env.OPENAI_PROXY_URL}`
  }
};
