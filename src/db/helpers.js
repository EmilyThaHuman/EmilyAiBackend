/* eslint-disable no-dupe-keys */
require("dotenv").config();
const bcrypt = require("bcrypt");
const path = require("path");
const fs = require("node:fs/promises");
const { ChatSession, Assistant } = require("@models/chat");
const { Workspace, Folder } = require("@models/workspace");
const { uniqueId } = require("lodash");
const { User } = require("@models/user");
const { Collection } = require("@models/main");
const { Prompt, File, Tool, Preset, Model } = require("@models/chat");
const { presets, files, prompts, models, tools } = require("@lib");
const { initialPresets } = presets;
const { initialUserFiles } = files;
const { initialModels } = models;
const { initialUserPrompts } = prompts;
const { tools: initialTools } = tools;
const { ALLOWED_FILE_TYPES_ABBR, SUPPORTED_MIME_TYPES_ABBR } = require("@config/constants");
const { logger } = require("@config/logging");
const { getEnv } = require("@utils/processing/api");

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
  const sessionId = chatSession._id;
  await chatSession.tokenizeAllMessages(sessionId);

  return chatSession;
};

const createNewUser = async ({ username, email, password }) => {
  // Generate a full default user object using the schema's static method
  const defaultUserData = User.generateDefaultUser();

  // Hash the provided password
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  // Override default user data with the specific details provided by the user
  const newUser = new User({
    ...defaultUserData,
    username,
    email,
    "auth.password": passwordHash
  });

  await newUser.save();
  return newUser;
};

const saveInitialPrompts = async (userId, workspaceId, folderId) => {
  try {
    const promptsToSave = initialUserPrompts.map((prompt) => ({
      userId,
      workspaceId,
      folderId,
      name: prompt.name,
      content: prompt.content,
      role: "user",
      type: prompt.type,
      sharing: prompt.sharing,
      rating: prompt.rating,
      tags: prompt.tags
    }));

    const savedPrompts = await Prompt.insertMany(promptsToSave);
    return savedPrompts;
  } catch (error) {
    logger.error("Error saving prompts:", error);
    throw error;
  }
};

const saveInitialFiles = async (userId, workspaceId, folderId) => {
  try {
    const filesToSave = await Promise.all(
      initialUserFiles
        .filter((file) => {
          const fileExtension = path.extname(file.name).substring(1).toLowerCase();
          if (!ALLOWED_FILE_TYPES_ABBR.includes(fileExtension)) {
            logger.warn(`Skipping unsupported file type: .${fileExtension}`);
            return false; // Skip unsupported files
          }
          return true;
        })
        .map(async (file) => {
          const fileExtension = path.extname(file.name).substring(1).toLowerCase();
          const mimeType = SUPPORTED_MIME_TYPES_ABBR[fileExtension] || "application/octet-stream";

          // Read file data
          const filePath = file.path;
          try {
            await fs.access(filePath); // Check if file exists
          } catch (err) {
            logger.warn(`File does not exist: ${filePath}`);
            return null;
          }
          const fileStats = await fs.stat(filePath);
          const fileSize = fileStats.size;
          const fileData = await fs.readFile(filePath);

          // Determine if the file is text or binary
          const textFileTypes = ["txt", "md", "html", "json", "csv", "tsv", "jsx", "js"];
          const isTextFile = textFileTypes.includes(fileExtension);
          const content = isTextFile ? fileData.toString("utf8") : null;

          return {
            userId,
            workspaceId,
            folderId,
            name: file.name,
            filePath: filePath,
            content: content, // Only store content for text files
            size: fileSize,
            type: fileExtension,
            mimeType: mimeType,
            originalFileType: fileExtension,
            data: fileData, // Raw file data as Buffer
            space: "files",
            metadata: {
              fileSize: fileSize,
              fileType: fileExtension,
              lastModified: fileStats.mtime
            },
            createdAt: new Date(),
            updatedAt: new Date()
          };
        })
    );

    const validFiles = filesToSave.filter((file) => file !== null);
    const savedFiles = await File.insertMany(validFiles);
    logger.info("Initial files saved successfully");
    return savedFiles;
  } catch (error) {
    logger.error("Error saving initial files:", error);
    throw error;
  }
};

const saveInitialTools = async (userId, workspaceId, folderId, assistantId) => {
  try {
    if (!initialTools || !Array.isArray(initialTools) || initialTools.length === 0) {
      logger.warn("No tools to save or tools is not properly defined");
      return [];
    }
    const toolsToSave = initialTools.map((tool, index) => ({
      userId,
      workspaceId,
      folderId,
      assistantId,
      name: tool.function.name || `Tool ${index + 1}`,
      description: tool.function.description || "No description provided",
      schema: JSON.stringify(tool.function)
    }));

    const savedTools = await Tool.insertMany(toolsToSave);
    logger.info("All tools have been saved successfully.");
    return savedTools;
  } catch (error) {
    logger.error("Error saving tools:", error);
    throw error;
  }
};

const saveInitialPresets = async (userId, workspaceId, folderId) => {
  try {
    const presetsToSave = initialPresets.map((preset) => ({
      userId,
      workspaceId,
      folderId,
      name: preset.name,
      model: preset.model,
      temperature: preset.temperature,
      maxTokens: preset.maxTokens,
      topP: preset.topP,
      frequencyPenalty: preset.frequencyPenalty,
      presencePenalty: preset.presencePenalty,
      prompt: preset.prompt,
      stop: preset.stop,
      n: preset.n,
      contextLength: preset.contextLength,
      embeddingsProvider: preset.embeddingsProvider,
      systemPrompt: preset.systemPrompt,
      assistantPrompt: preset.assistantPrompt,
      functions: preset.functions,
      includeProfileContext: preset.includeProfileContext,
      includeWorkspaceInstructions: preset.includeWorkspaceInstructions,
      sharing: preset.sharing
    }));

    const savedPresets = await Preset.insertMany(presetsToSave);
    return savedPresets;
  } catch (error) {
    logger.error("Error saving presets:", error);
    throw error;
  }
};

const saveInitialModels = async (userId, workspaceId, folderId) => {
  try {
    const modelsToSave = initialModels.map((model) => ({
      userId,
      workspaceId,
      folderId,
      name: model.name,
      description: model.description,
      modelId: model.modelId,
      sharing: model.sharing,
      apiKey: model.apiKey,
      baseUrl: model.baseUrl
    }));

    const savedModels = await Model.insertMany(modelsToSave);
    return savedModels;
  } catch (error) {
    logger.error("Error saving models:", error);
    throw error;
  }
};

const saveInitialCollections = async (userId, workspaceId, folderId) => {
  const initialCollections = [
    {
      name: "Text Analysis Collection",
      description: "A collection of datasets and tools optimized for text analysis and NLP.",
      sharing: "private"
    },
    {
      name: "Image Processing Collection",
      description:
        "A collection containing resources for image recognition and computer vision tasks.",
      sharing: "shared"
    },
    {
      name: "Data Science Tools Collection",
      description:
        "Comprehensive datasets and models for various data science and machine learning tasks.",
      sharing: "public"
    }
  ];

  try {
    const collectionsToSave = initialCollections.map((collection) => ({
      userId,
      workspaceId,
      folderId,
      name: collection.name,
      description: collection.description,
      sharing: collection.sharing,
      items: collection.items
    }));
    const savedCollections = await Collection.insertMany(collectionsToSave);
    return savedCollections;
  } catch (error) {
    logger.error("Error saving collections:", error);
    throw error;
  }
};

/**
 * Initializes user data by creating a workspace, folders, and saving the new user.
 * @param {Object} newUser - The new user object to initialize data for.
 * @param {string} accessToken - The access token for the new user.
 * @param {string} refreshToken - The refresh token for the new user.
 * @returns {Object} An object containing the new user, workspace, and folders.
 * @throws {Error} If there is an error during initialization.
 */
const initializeUserData = async (newUser, accessToken, refreshToken) => {
  try {
    // Create workspace and folders concurrently
    const workspace = await createWorkspace(newUser);
    const folders = await createFolders(newUser, workspace);

    // Map folder space to folder documents
    const folderMap = folders.reduce((acc, folder) => {
      acc[folder.space] = folder;
      return acc;
    }, {});

    // Helper function to update entities with items
    const updateEntitiesWithItems = (entities, items, property) => {
      items.forEach((item) => {
        entities.forEach((entity) => {
          entity[property].push(item._id);
        });
      });
    };

    // Save initial prompts
    const promptsFolder = folderMap["prompts"];
    const savedPrompts = await saveInitialPrompts(newUser._id, workspace._id, promptsFolder._id);
    updateEntitiesWithItems([newUser, workspace, promptsFolder], savedPrompts, "prompts");
    updateEntitiesWithItems([promptsFolder], savedPrompts, "items");
    await promptsFolder.save(); // Save the folder after updating

    // Save initial files
    const filesFolder = folderMap["files"];
    const savedFiles = await saveInitialFiles(newUser._id, workspace._id, filesFolder._id);
    updateEntitiesWithItems([newUser, workspace, filesFolder], savedFiles, "files");
    updateEntitiesWithItems([filesFolder], savedFiles, "items");
    await filesFolder.save(); // Save the folder after updating

    // Use one of the saved files to create assistant
    const assistantFolder = folderMap["assistants"];
    const assistant = await createAssistant(newUser, assistantFolder, savedFiles[0]);
    updateEntitiesWithItems([newUser, workspace, assistantFolder], [assistant], "assistants");
    updateEntitiesWithItems([assistantFolder], [assistant], "items");
    await assistantFolder.save(); // Save the folder after updating

    // Save initial tools
    const toolsFolder = folderMap["tools"];
    const savedTools = await saveInitialTools(
      newUser._id,
      workspace._id,
      toolsFolder._id,
      assistant._id
    );
    updateEntitiesWithItems([newUser, workspace, toolsFolder], savedTools, "tools");
    updateEntitiesWithItems([toolsFolder], savedTools, "items");
    await toolsFolder.save(); // Save the folder after updating

    // Save initial presets
    const presetsFolder = folderMap["presets"];
    const savedPresets = await saveInitialPresets(newUser._id, workspace._id, presetsFolder._id);
    updateEntitiesWithItems([newUser, workspace, presetsFolder], savedPresets, "presets");
    updateEntitiesWithItems([presetsFolder], savedPresets, "items");
    await presetsFolder.save(); // Save the folder after updating

    // Save initial models
    const modelsFolder = folderMap["models"];
    const savedModels = await saveInitialModels(newUser._id, workspace._id, modelsFolder._id);
    updateEntitiesWithItems([newUser, workspace, modelsFolder], savedModels, "models");
    updateEntitiesWithItems([modelsFolder], savedModels, "items");
    await modelsFolder.save(); // Save the folder after updating

    // Save initial collections
    const collectionsFolder = folderMap["collections"];
    const savedCollections = await saveInitialCollections(
      newUser._id,
      workspace._id,
      collectionsFolder._id
    );
    updateEntitiesWithItems(
      [newUser, workspace, collectionsFolder],
      savedCollections,
      "collections"
    );
    updateEntitiesWithItems([collectionsFolder], savedCollections, "items");
    await collectionsFolder.save(); // Save the folder after updating

    // Create chat session
    const chatSessionFolder = folderMap["chatSessions"];
    const chatSession = await createChatSession(newUser, workspace, assistant, chatSessionFolder);
    updateEntitiesWithItems([workspace, chatSessionFolder], [chatSession], "chatSessions");
    updateEntitiesWithItems([chatSessionFolder], [chatSession], "items");
    await chatSessionFolder.save(); // Save the folder after updating

    // Save workspace and user
    workspace.assistants.push(assistant._id);
    workspace.chatSessions.push(chatSession._id);
    await workspace.save();

    newUser.workspaces.push(workspace._id);
    newUser.assistants.push(assistant._id);
    newUser.chatSessions.push(chatSession._id);

    newUser.isActive = true;
    newUser.hasOnboarded = true;
    newUser.homeWorkspaceId = workspace._id;

    // Update user profile
    newUser.profile.bio = "No bio provided";
    newUser.profile.username = newUser.username || "No username provided";
    newUser.profile.displayName = "No display name provided";
    newUser.profile.envKeyMap["openaiApiKey"] = getEnv("OPENAI_API_PROJECT_KEY");
    newUser.profile.openai = {
      apiKey: getEnv("OPENAI_API_PROJECT_KEY"),
      organizationId: process.env.OPENAI_API_ORG_ID,
      apiVersion: "",
      projects: [
        {
          name: process.env.OPENAI_API_PROJECT_NAME,
          id: process.env.OPENAI_API_PROJECT_ID,
          organizationId: process.env.OPENAI_API_ORG_ID,
          organizationName: process.env.OPENAI_API_ORG_NAME,
          apiKey: getEnv("OPENAI_API_PROJECT_KEY"),
          apiVersion: "",
          default: true,
          users: [
            {
              userId: newUser._id,
              role: "admin",
              readWrite: true
            }
          ]
        }
      ]
    };

    await newUser.save();

    return { newUser, workspace, folders };
  } catch (error) {
    logger.error(`Error initializing user data: ${error.message}`);
    throw new Error("Failed to initialize user data");
  }
};

module.exports = {
  createWorkspace,
  createFolders,
  createAssistant,
  createChatSession,
  createNewUser,
  initializeUserData
};
