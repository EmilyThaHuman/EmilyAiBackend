const initialPresets = [
  {
    name: "Basic QA Chat Bot",
    model: "gpt-3.5-turbo",
    temperature: 0.2,
    maxTokens: 200,
    topP: 0.9,
    frequencyPenalty: 0.5,
    presencePenalty: 0.3,
    prompt: "You are an assistant focused on answering questions accurately and concisely.",
    stop: ["\n", "User:"],
    n: 1,
    contextLength: 4096,
    embeddingsProvider: "OpenAI",
    systemPrompt:
      "The user will ask you factual questions. Respond with clear and concise answers.",
    assistantPrompt: "I will do my best to provide accurate and relevant information.",
    functions: ["search", "retrieve_documents"],
    includeProfileContext: true,
    includeWorkspaceInstructions: false,
    sharing: "private"
  },
  {
    name: "Creative Writing Assistant",
    model: "gpt-4",
    temperature: 0.8,
    maxTokens: 800,
    topP: 0.95,
    frequencyPenalty: 0.1,
    presencePenalty: 0.6,
    prompt:
      "You are a creative writing assistant that helps generate engaging story ideas and narrative arcs.",
    stop: ["###", "End of story"],
    n: 2,
    contextLength: 8192,
    embeddingsProvider: "OpenAI",
    systemPrompt:
      "The user seeks assistance with creative writing. Generate imaginative and detailed suggestions.",
    assistantPrompt: "Let's craft a unique story with compelling characters and an engaging plot.",
    functions: ["generate_story_ideas", "suggest_plot_twists"],
    includeProfileContext: false,
    includeWorkspaceInstructions: true,
    sharing: "workspace"
  },
  {
    name: "Technical Code Helper",
    model: "code-davinci-002",
    temperature: 0.1,
    maxTokens: 1500,
    topP: 0.85,
    frequencyPenalty: 0.3,
    presencePenalty: 0.4,
    prompt: "You are an AI specialized in providing technical guidance and code snippets.",
    stop: ["```", "// End of code"],
    n: 1,
    contextLength: 4096,
    embeddingsProvider: "Pinecone",
    systemPrompt:
      "The user needs help with coding problems. Offer precise solutions with best practices.",
    assistantPrompt: "I'm here to provide you with clean and efficient code examples.",
    functions: ["debug_code", "suggest_best_practices"],
    includeProfileContext: true,
    includeWorkspaceInstructions: true,
    sharing: "public"
  }
];

module.exports = {
  initialPresets
};
