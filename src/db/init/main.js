const { logger } = require("@config/logging");
const { ChatSession, Assistant } = require("@models/chat");
const { Workspace, Folder } = require("@models/workspace");
const {
  generateChatTitle,
  summarizeUserQuery,
  categorizeUserQuery,
  extractKeywords,
  expandQuery,
  generateResponseOutline,
  generateActionItems,
  generateFollowUpQuestions
} = require("@utils/ai/openAi/chat/chat_utils");
const { uniqueId } = require("lodash");

const createWorkspace = async (user) => {
  const workspaceData = {
    userId: user._id,
    folders: [],
    files: [],
    chatSessions: [],
    assistants: [],
    tools: [],
    presets: [],
    prompts: [],
    models: [],
    collections: [],

    selectedPreset: null,
    name: "Home Workspace",
    imagePath: "http://localhost:3001/static/avatar3.png",
    active: true,

    defaultContextLength: 4000,
    defaultTemperature: 0.9,

    embeddingsProvider: "openai",
    instructions: "",
    sharing: "private",
    includeProfileContext: false,
    includeWorkspaceInstructions: false,
    isHome: true,
    type: "home"
  };

  const workspace = new Workspace(workspaceData);
  await workspace.save();
  return workspace;
};

const createFolders = async (user, workspace) => {
  const folders = [];
  const folderTypes = [
    "files",
    "prompts",
    "chatSessions",
    "assistants",
    "tools",
    "models",
    "presets",
    "collections"
  ];

  for (const type of folderTypes) {
    let uniqueName = uniqueId(`${type}_folder`);
    let counter = 1;

    // Ensure the folder name is unique within the user's workspace
    while (
      await Folder.exists({ userId: user._id, workspaceId: workspace._id, name: uniqueName })
    ) {
      uniqueName = `${type}_folder-${counter}`;
      counter += 1;
    }

    const folderData = {
      userId: user._id,
      workspaceId: workspace._id,
      name: uniqueName,
      description: `${type} folder`, // Default description, can be customized
      space: type // Directly setting the space based on folder type
    };

    const folder = new Folder(folderData);
    await folder.save();
    folders.push(folder);

    // Update the workspace's folders array
    workspace.folders.push(folder._id);
  }

  // Save the workspace after updating folders
  await workspace.save();

  return folders;
};

const createAssistant = async (user, folder, file, overrides = {}) => {
  try {
    const assistantData = {
      // RELATIONS
      userId: user._id,
      workspaceId: folder.workspaceId,
      folderId: folder._id,
      // REQUIRED FIELDS with defaults
      name: overrides.name || "React Component Generator",
      systemInstructions:
        overrides.systemInstructions ||
        "Focus on generating optimized, reusable React components using best practices with modern hooks and functional patterns. Prioritize using Material-UI for styling.",
      model: overrides.model || "gpt-4-turbo-preview",
      fileSearch: overrides.fileSearch !== undefined ? overrides.fileSearch : true, // Enable file search to reference code examples
      codeInterpreter: overrides.codeInterpreter !== undefined ? overrides.codeInterpreter : true, // Enable code interpreter for logic understanding
      functions: overrides.functions || [],
      // SETTINGS
      responseFormat: overrides.responseFormat || "json_object",
      temperature: overrides.temperature !== undefined ? overrides.temperature : 0.7, // Lower temperature for more deterministic outputs
      topP: overrides.topP !== undefined ? overrides.topP : 0.9,
      // ADDITIONAL INSTRUCTIONS
      instructions:
        overrides.instructions ||
        "Generate high-quality React components using functional components and hooks. Include clear prop definitions, modular CSS-in-JS styling with Material-UI, and emphasize code readability and performance. Ensure the code adheres to React 18 standards.",

      description:
        "Assistant for generating React components with Material-UI styling and functional components.",
      imagePath: "/public/images/default-assistant.png",
      sharing: "private",
      contextLength: 4000,
      embeddingsProvider: "openai",
      toolResources: {
        codeInterpreter: {
          fileIds: [file._id]
        }
      }
    };

    const assistant = new Assistant(assistantData);
    await assistant.save();
    return assistant;
  } catch (error) {
    logger.error("Error creating assistant:", error);
    throw error;
  }
};

const createChatSession = async (user, workspace, assistant, folder) => {
  // Initial setup for the first prompt
  const firstPrompt = "Let's start our first conversation.";

  // Generate the chat title using the initial prompt
  // const title = await generateChatTitle(firstPrompt);

  // // Summarize the prompt for quick reference later
  // const summary = await summarizeUserQuery(firstPrompt);

  // Categorize the session based on the first prompt
  // const category = await categorizeUserQuery(firstPrompt);

  // // Extract keywords from the prompt to enhance search capabilities
  // const keywords = await extractKeywords(firstPrompt);

  // // Expand the query for added context to improve chat quality
  // const expandedQuery = await expandQuery(firstPrompt);

  // // Generate a response outline to structure future messages
  // const responseOutline = await generateResponseOutline(firstPrompt);

  // // Generate actionable items that could help guide the chat
  // const actionItems = await generateActionItems(firstPrompt);

  // // Generate follow-up questions for engaging the user further
  // const followUpQuestions = await generateFollowUpQuestions(firstPrompt);

  // Calculate initial token usage based on the first prompt
  const initialTokenUsage = firstPrompt.split(" ").length; // Simple token estimation

  const chatSessionData = {
    name: "title" || "First Chat",
    topic: "Getting Started",
    userId: user._id,
    workspaceId: workspace._id,
    assistantId: assistant._id,
    folderId: folder._id,
    model: "gpt-4-turbo-preview",
    prompt: firstPrompt,
    active: true,
    activeSessionId: null,
    settings: {
      maxTokens: 500,
      temperature: 0.7,
      model: "gpt-4-turbo-preview",
      topP: 1,
      n: 1,
      debug: false,
      summarizeMode: false
    },
    messages: [],
    stats: {
      tokenUsage: initialTokenUsage || 0,
      messageCount: 1 // Counting the first prompt as the initial message
    },
    tuning: {
      debug: false,
      summary: "summary of session" || "",
      summarizeMode: false
    }
    // category: category || "General Information",
    // keywords: keywords || [],
    // expandedQuery: expandedQuery || "",
    // responseOutline: responseOutline || "",
    // actionItems: actionItems || [],
    // followUpQuestions: followUpQuestions || []
  };

  // Create a new chat session with the enriched data
  const chatSession = new ChatSession(chatSessionData);

  // Save the chat session to the database
  await chatSession.save();

  // Update token usage based on the entire session after saving
  await chatSession.calculateTokenUsage();

  return chatSession;
};

module.exports = {
  createWorkspace,
  createFolders,
  createAssistant,
  createChatSession
};
// const createChatSession = async (user, workspace, assistant, folder) => {
//   // Generate the chat title using the initial prompt
//   const firstPrompt = "Let's start our first conversation.";
//   const title = await generateChatTitle(firstPrompt);

//   // Summarize the prompt for quick reference later
//   const summary = await summarizeUserQuery(firstPrompt);

//   // Categorize the session based on the first prompt
//   const category = await categorizeUserQuery(firstPrompt);

//   // Extract keywords from the prompt to enhance search capabilities
//   const keywords = await extractKeywords(firstPrompt);

//   // Expand the query for added context to improve chat quality
//   const expandedQuery = await expandQuery(firstPrompt);

//   // Generate a response outline to structure future messages
//   const responseOutline = await generateResponseOutline(firstPrompt);

//   // Generate actionable items that could help guide the chat
//   const actionItems = await generateActionItems(firstPrompt);

//   // Generate follow-up questions for engaging the user further
//   const followUpQuestions = await generateFollowUpQuestions(firstPrompt);

//   const chatSessionData = {
//     name: title || "First Chat",
//     topic: title,
//     userId: user._id,
//     workspaceId: workspace._id,
//     assistantId: assistant._id,
//     folderId: folder._id,
//     model: "gpt-4-turbo-preview",
//     prompt: firstPrompt,
//     active: true,
//     activeSessionId: null,
//     settings: {
//       maxTokens: 500,
//       temperature: 0.7,
//       model: "gpt-4-turbo-preview",
//       topP: 1,
//       n: 1,
//       debug: false,
//       summarizeMode: false
//     },
//     messages: [],
//     stats: {
//       tokenUsage: 0,
//       messageCount: 0
//     },
//     tuning: {
//       debug: false,
//       summary: summary || "",
//       summarizeMode: false
//     },
//     category: category || "General Information",
//     keywords: keywords || [],
//     expandedQuery: expandedQuery || "",
//     responseOutline: responseOutline || "",
//     actionItems: actionItems || [],
//     followUpQuestions: followUpQuestions || []
//   };

//   const chatSession = new ChatSession(chatSessionData);
//   await chatSession.save();
//   return chatSession;
// };

// const createChatSession = async (user, workspace, assistant, folder) => {
//   const chatSessionData = {
//     name: "First Chat",
//     topic: "Getting Started",
//     userId: user._id,
//     workspaceId: workspace._id,
//     assistantId: assistant._id,
//     folderId: folder._id,
//     model: "gpt-4-turbo-preview",
//     prompt: "Let's start our first conversation.",
//     active: true,
//     activeSessionId: null,
//     settings: {
//       maxTokens: 500,
//       temperature: 0.7,
//       model: "gpt-4-turbo-preview",
//       topP: 1,
//       n: 1,
//       debug: false,
//       summarizeMode: false
//     },
//     messages: [],
//     stats: {
//       tokenUsage: 0,
//       messageCount: 0
//     },
//     tuning: {
//       debug: false,
//       summary: "",
//       summarizeMode: false
//     }
//   };

//   const chatSession = new ChatSession(chatSessionData);
//   await chatSession.save();
//   return chatSession;
// };
