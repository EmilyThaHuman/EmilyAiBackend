const { logger } = require("@config/logging");
const { ChatSession, Assistant } = require("@models/chat");
const { Workspace, Folder } = require("@models/workspace");
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

const folderTypes = [
  "Workspace",
  "ChatSession",
  "Assistant",
  "File",
  "ChatModel",
  "Tool",
  "Prompt",
  "Preset",
  "Collection"
];
function convertToFolderType(type) {
  // Check if the input is one of the allowed folder types
  if (!folderTypes.includes(type)) {
    throw new Error(`Invalid type: ${type}. Must be one of: ${folderTypes.join(", ")}`);
  }

  // Convert the first character to lowercase and append 's'
  const modifiedType = type.charAt(0).toLowerCase() + type.slice(1) + "s";

  return modifiedType;
}
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

// const createFolders = async (user, workspace) => {
//   const folders = [];

//   for (const type of folderTypes) {
//     // skip workspace folder type
//     if (type === "Workspace") continue;
//     let uniqueName = uniqueId(`${type}_folder`);
//     let counter = 1;

//     // Ensure the folder name is unique within the user's workspace
//     while (
//       await Folder.exists({ userId: user._id, workspaceId: workspace._id, name: uniqueName })
//     ) {
//       uniqueName = `${type}_folder-${counter}`;
//       counter += 1;
//     }

//     const folderData = {
//       userId: user._id,
//       workspaceId: workspace._id,
//       name: uniqueName,
//       description: `${type} folder`, // Default description, can be customized
//       space: convertToFolderType(type),
//     };

//     const folder = new Folder(folderData);
//     await folder.save();
//     folders.push(folder);

//     // Update the workspace's folders array
//     workspace.folders.push(folder._id);
//   }

//   // Save the workspace after updating folders
//   await workspace.save();

//   return folders;
// };

const createChatSession = async (user, workspace, assistant, folder) => {
  const chatSessionData = {
    name: "First Chat",
    topic: "Getting Started",
    userId: user._id,
    workspaceId: workspace._id,
    assistantId: assistant._id,
    folderId: folder._id,
    model: "gpt-4-turbo-preview",
    prompt: "Let's start our first conversation.",
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
      tokenUsage: 0,
      messageCount: 0
    },
    tuning: {
      debug: false,
      summary: "",
      summarizeMode: false
    }
  };

  const chatSession = new ChatSession(chatSessionData);
  await chatSession.save();
  return chatSession;
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

module.exports = {
  createWorkspace,
  createFolders,
  createAssistant,
  createChatSession
};
