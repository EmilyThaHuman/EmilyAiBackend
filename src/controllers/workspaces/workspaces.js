const { default: mongoose } = require("mongoose");
const { logger } = require("@config/logging");
const { ChatSession, Preset, Tool, Model, Prompt, Assistant, File } = require("@models/chat");
const { User } = require("@models/user");
const { Workspace, Folder } = require("@models/workspace");
const { Collection } = require("@models/main");

const getAllWorkspaces = async (req, res) => {
  try {
    const workspaces = await Workspace.find();
    res.status(200).json(workspaces);
  } catch (error) {
    res.status(500).json({ message: "Error fetching workspaces", error: error.message });
  }
};

const getAllUserWorkspaces = async (req, res) => {
  try {
    const workspaces = await Workspace.find({ userId: req.params.userId })
      .populate("chatSessions")
      .populate("folders");
    res.status(200).json(workspaces);
  } catch (error) {
    res.status(500).json({ message: "Error fetching workspaces", error: error.message });
  }
};
async function fetchWorkspaceAndChatSessions(workspaceId) {
  try {
    // Validate the workspaceId
    if (!mongoose.Types.ObjectId.isValid(workspaceId)) {
      throw new Error("Invalid workspace ID");
    }
    logger.info(`Fetching workspace and chat sessions for workspaceId: ${workspaceId}`);
    // Fetch workspace and chat sessions concurrently
    const [workspace, chatSessions] = await Promise.all([
      Workspace.findById(workspaceId).lean().populate("chatSessions"),
      ChatSession.find({ workspaceId }).lean().populate("messages").populate("systemPrompt")
    ]);
    // logger.info(`workspace: ${workspace}`);
    logger.info(`chatSessions: ${chatSessions}`);
    // Check if workspace exists
    if (!workspace) {
      throw new Error("Workspace not found");
    }

    // Populate workspace with chatSessions
    workspace.chatSessions = chatSessions;

    return {
      workspace,
      chatSessions
    };
  } catch (error) {
    logger.error("Error fetching workspace and chat sessions:", error);
    throw error;
  }
}
async function fetchWorkspaceAndChatSession(workspaceId, chatSessionId) {
  try {
    // Validate the workspaceId and chatSessionId
    if (
      !mongoose.Types.ObjectId.isValid(workspaceId) ||
      !mongoose.Types.ObjectId.isValid(chatSessionId)
    ) {
      throw new Error("Invalid workspace ID or chat session ID");
    }

    logger.info(
      `Fetching workspace and chat session for workspaceId: ${workspaceId} and chatSessionId: ${chatSessionId}`
    );

    // Fetch workspace and specific chat session concurrently
    const [workspace, chatSession] = await Promise.all([
      Workspace.findById(workspaceId).lean(),
      ChatSession.findOne({ _id: chatSessionId, workspaceId })
        .lean()
        .populate("messages")
        .populate("systemPrompt")
    ]);

    // logger.info(`workspace: ${workspace}`);
    logger.info(`chatSession: ${chatSession}`);

    // Check if workspace and chat session exist
    if (!workspace) {
      throw new Error("Workspace not found");
    }
    if (!chatSession) {
      throw new Error("Chat session not found");
    }

    // Populate workspace with the specific chatSession
    workspace.chatSession = chatSession;

    return {
      workspace,
      chatSession
    };
  } catch (error) {
    logger.error("Error fetching workspace and chat session:", error);
    throw error;
  }
}
const createWorkspaceChatSession = async (workspaceId, userId, sessionData) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(workspaceId)) {
      throw new Error("Invalid workspace ID");
    }

    // Check if a chat session already exists for the given workspace and user
    let chatSession = await ChatSession.findOne({ workspaceId, userId })
      .populate("messages")
      .populate("systemPrompt");

    if (!chatSession) {
      logger.info(
        `Creating new chat session for workspaceId: ${workspaceId} and userId: ${userId}`
      );

      // Create a new chat session with the provided sessionData
      const newChatSession = new ChatSession({ workspaceId, userId, ...sessionData });

      // Save the new chat session to the database
      await newChatSession.save();

      logger.info(`Chat session created successfully: ${newChatSession._id}`);

      // Fetch the newly created chat session
      chatSession = await ChatSession.findById(newChatSession._id)
        .populate("messages")
        .populate("systemPrompt");
    } else {
      logger.info(
        `Existing chat session found for workspaceId: ${workspaceId} and userId: ${userId}`
      );
    }

    // Populate the workspace with all chat sessions and other fields
    const workspace = await Workspace.findById(workspaceId)
      .populate({
        path: "chatSessions",
        populate: [{ path: "messages" }, { path: "systemPrompt" }]
      })
      .lean()
      .exec();

    // // Only populate 'documents' and 'folders' if they exist in the schema
    // if (workspace.documents) {
    //   await Workspace.populate(workspace, { path: 'documents' });
    // }
    if (workspace.folders) {
      await Workspace.populate(workspace, { path: "folders" });
    }

    return {
      workspace,
      chatSession
    };
  } catch (error) {
    logger.error("Error creating or fetching chat session:", error);
    throw error;
  }
};
const createWorkspaceFolder = async (userId, workspaceId, space, data) => {
  try {
    // Find the workspace
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      throw new Error("Workspace not found");
    }

    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Create a new workspace folder
    const newWorkspaceFolder = new Folder({
      ...data,
      userId,
      workspaceId,
      space
    });

    // Save the new workspace folder
    const savedWorkspaceFolder = await newWorkspaceFolder.save();

    // Update the workspace with the new folder
    await Workspace.findByIdAndUpdate(workspaceId, {
      $push: { folders: savedWorkspaceFolder._id }
    });

    // Update the user with the new folder
    await User.findByIdAndUpdate(userId, {
      $push: { folders: savedWorkspaceFolder._id }
    });

    return savedWorkspaceFolder;
  } catch (error) {
    throw new Error(`Error creating workspace folder: ${error.message}`);
  }
};
// eslint-disable-next-line no-unused-vars
const fetchWorkspaceAndFolders = async (workspaceId, space) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(workspaceId)) {
      throw new Error("Invalid workspace ID");
    }

    // Fetch workspace and folders concurrently
    const [workspace, folders] = await Promise.all([
      Workspace.findById(workspaceId).lean(),
      Folder.find({ workspaceId, space }).lean()
    ]);

    // Check if workspace exists
    if (!workspace) {
      throw new Error("Workspace not found");
    }

    // Populate each folder with additional entities
    const populatedFolders = await Promise.all(
      folders.map(async (folder) => {
        const [files, prompts, tools, collections, assistants, presets, models] = await Promise.all(
          [
            File.find({ folderId: folder._id }).lean(),
            Prompt.find({ folderId: folder._id }).lean(),
            Tool.find({ folderId: folder._id }).lean(),
            Collection.find({ folderId: folder._id }).lean(),
            Assistant.find({ folderId: folder._id }).lean(),
            Preset.find({ folderId: folder._id }).lean(),
            Model.find({ folderId: folder._id }).lean()
          ]
        );

        return {
          ...folder,
          files,
          prompts,
          tools,
          collections,
          assistants,
          presets,
          models
        };
      })
    );

    // Organize populated folders into a tree structure if needed
    const folderTree = organizeFoldersIntoTree(populatedFolders);

    return {
      workspace,
      folders: folderTree
    };
  } catch (error) {
    logger.error("Error fetching workspace and folders:", error);
    throw error;
  }
};

function organizeFoldersIntoTree(folders) {
  const folderMap = {};
  const rootFolders = [];

  // First pass: create a map of all folders
  folders.forEach((folder) => {
    folderMap[folder._id.toString()] = { ...folder, children: [] };
  });

  // Second pass: build the tree structure
  folders.forEach((folder) => {
    if (folder.parent) {
      const parentFolder = folderMap[folder.parent.toString()];
      if (parentFolder) {
        parentFolder.children.push(folderMap[folder._id.toString()]);
      } else {
        rootFolders.push(folderMap[folder._id.toString()]);
      }
    } else {
      rootFolders.push(folderMap[folder._id.toString()]);
    }
  });

  return rootFolders;
}

const getHomeWorkspace = async (req, res) => {
  const userId = req.params.userId;
  try {
    const homeWorkspace = await Workspace.findOne({
      userId: userId,
      isHome: true
    })
      .populate({
        path: "folders",
        populate: {
          path: "items",
          model: function (doc) {
            // Dynamically determine the model based on folder type
            switch (doc.type) {
              case "prompts":
                return "Prompt";
              case "assistants":
                return "Assistant";
              case "files":
                return "File";
              case "chatSessions":
                return "ChatSession";
              default:
                return null;
            }
          }
        }
      })
      .populate({
        path: "chatSessions",
        populate: {
          path: "messages",
          model: "ChatMessage"
        }
      })
      .populate("assistants")
      .populate("tools")
      .populate("prompts")
      .populate("files");

    if (!homeWorkspace) {
      return res.status(404).json({ error: "Home workspace not found" });
    }

    // Process folders to ensure correct population
    const processedWorkspace = await processWorkspaceFolders(homeWorkspace);

    res.json(processedWorkspace);
  } catch (error) {
    logger.error("Error retrieving home workspace:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const getWorkspaceById = async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.workspaceId)
      .populate({
        path: "folders",
        populate: {
          path: "items",
          model: function (doc) {
            // Dynamically determine the model based on folder type
            switch (doc.type) {
              case "prompts":
                return "Prompt";
              case "assistants":
                return "Assistant";
              case "files":
                return "File";
              case "chatSessions":
                return "ChatSession";
              default:
                return null;
            }
          }
        }
      })
      .populate({
        path: "chatSessions",
        populate: [
          {
            path: "messages",
            model: "ChatMessage"
          },
          {
            path: "folder",
            model: "Folder"
          }
        ]
      })
      .populate({
        path: "assistants",
        populate: {
          path: "folder",
          model: "Folder"
        }
      })
      .populate({
        path: "prompts",
        populate: {
          path: "folder",
          model: "Folder"
        }
      })
      .populate({
        path: "files",
        populate: {
          path: "folder",
          model: "Folder"
        }
      })
      .populate("tools");

    if (!workspace) {
      return res.status(404).json({ message: "Workspace not found" });
    }

    // Process folders to ensure correct population
    const processedWorkspace = await processWorkspaceFolders(workspace);

    res.status(200).json(processedWorkspace);
  } catch (error) {
    res.status(500).json({ message: "Error fetching workspace", error: error.message });
  }
};

// Helper function to process workspace folders
const processWorkspaceFolders = async (workspace) => {
  if (!workspace.folders) return workspace;

  // Create a map of folder types to their respective collections
  const collectionMap = {
    prompts: workspace.prompts,
    assistants: workspace.assistants,
    files: workspace.files,
    chats: workspace.chatSessions
  };

  // Process each folder
  const processedFolders = workspace.folders.map((folder) => {
    const folderType = folder.type;
    const items = collectionMap[folderType] || [];

    // Filter items that belong to this folder
    const folderItems = items.filter(
      (item) => item.folder && item.folder.toString() === folder._id.toString()
    );

    return {
      ...folder.toObject(),
      items: folderItems
    };
  });

  // Return processed workspace
  return {
    ...workspace.toObject(),
    folders: processedFolders
  };
};

const createWorkspace = async (req, res) => {
  try {
    const workspaceData = req.body;

    // Validate required fields
    if (!workspaceData || !workspaceData.userId || !workspaceData.name) {
      return res.status(400).json({ error: "Missing required fields: userId or name" });
    }

    // Create a new workspace
    const newWorkspace = new Workspace({
      userId: workspaceData.userId,
      name: workspaceData.name,
      active: true
    });

    // Save the workspace
    const savedWorkspace = await newWorkspace.save();

    // eslint-disable-next-line no-unused-vars
    const { prompt, tool, model, folder } = workspaceData;
    const presetData = workspaceData.customPreset;

    // Create a new preset
    const newCustomPreset = {
      ...presetData,
      userId: workspaceData.userId,
      workspaceId: savedWorkspace._id,
      name: workspaceData.name,
      includeProfileContext: false,
      includeWorkspaceInstructions: false,
      model: workspaceData.model,
      prompt: "",
      sharing: ""
    };
    const savedPreset = await new Preset(newCustomPreset).save();

    // Create related documents
    const savedPrompt = await new Prompt(prompt).save();
    const savedTool = await new Tool(tool).save();
    const savedModel = await new Model(model).save();

    // Update workspace with related documents
    savedWorkspace.presets.push(savedPreset._id);
    savedWorkspace.prompts.push(savedPrompt._id);
    savedWorkspace.models.push(savedModel._id);
    savedWorkspace.tools.push(savedTool._id);
    savedWorkspace.selectedPreset = savedPreset._id;

    // Create folders
    const folderTypes = [
      "chatSessions",
      "assistants",
      "files",
      "models",
      "tools",
      "presets",
      "prompts",
      "collections"
    ];

    const folders = folderTypes.map((type) => ({
      userId: savedWorkspace.userId,
      workspaceId: savedWorkspace._id,
      name: `${type}_folder`,
      type,
      items: []
    }));

    const savedFolders = await Folder.insertMany(folders);
    const folderIds = savedFolders.map((folder) => folder._id);

    // Update workspace with folders
    await Workspace.findByIdAndUpdate(
      savedWorkspace._id,
      { $push: { folders: { $each: folderIds } } },
      { new: true }
    );

    // Save the updated workspace
    await savedWorkspace.save();

    // Update user with new workspace and preset
    const user = await User.findById(req.user._id);
    user.workspaces.push(savedWorkspace._id);
    user.presets.push(savedPreset._id);
    await user.save();

    // Prepare response
    const responseObj = {
      workspace: await savedWorkspace
        .populate("presets")
        .populate("prompts")
        .populate("models")
        .populate("tools")
        .populate("folders")
        .populate("chatSessions")
        .populate("assistants")
        .populate("files")
    };

    res.status(201).json(responseObj);
  } catch (error) {
    logger.error("Error creating workspace:", error);
    res.status(500).json({ error: "Internal Server Error", message: error.message });
  }
};

const updateWorkspace = async (req, res) => {
  try {
    const updatedWorkspace = await Workspace.findByIdAndUpdate(req.params.id, req.body, {
      new: true
    });
    if (!updatedWorkspace) {
      return res.status(404).json({ message: "Workspace not found" });
    }
    res.status(200).json(updatedWorkspace);
  } catch (error) {
    res.status(400).json({ message: "Error updating workspace", error: error.message });
  }
};

const deleteWorkspace = async (req, res) => {
  try {
    const deletedWorkspace = await Workspace.findByIdAndDelete(req.params.id);
    if (!deletedWorkspace) {
      return res.status(404).json({ message: "Workspace not found" });
    }
    res.status(200).json({ message: "Workspace deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting workspace", error: error.message });
  }
};

module.exports = {
  getAllWorkspaces,
  getUserWorkspaces: getAllUserWorkspaces,
  getAllUserWorkspaces,
  getWorkspaceById,
  createWorkspace,
  updateWorkspace,
  deleteWorkspace,
  getHomeWorkspace,
  fetchWorkspaceAndFolders,
  organizeFoldersIntoTree,
  fetchWorkspaceAndChatSessions,
  fetchWorkspaceAndChatSession,
  createWorkspaceChatSession,
  createWorkspaceFolder
};
