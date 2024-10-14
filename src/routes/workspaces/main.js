const express = require("express");
const { asyncHandler } = require("@utils/api/sync.js");
const {
  getAllWorkspaces,
  getWorkspaceById,
  createWorkspace,
  updateWorkspace,
  deleteWorkspace,
  fetchWorkspaceAndFolders,
  fetchWorkspaceAndChatSessions,
  fetchWorkspaceAndChatSession,
  createWorkspaceChatSession,
  createWorkspaceFolder
} = require("@controllers/workspaces");
const { ChatSession, Preset, Tool, Model, Prompt, Assistant, File } = require("@models/chat");
const { User } = require("@models/user");
const { Workspace, Folder } = require("@models/workspace");
const { Collection } = require("@models/main");

const router = express.Router();

// --- Workspace service ---
router.get("/", asyncHandler(getAllWorkspaces));
router.get("/:workspaceId", asyncHandler(getWorkspaceById));
router.post("/create", asyncHandler(createWorkspace));
router.put("/:workspaceId", asyncHandler(updateWorkspace));
router.delete("/:workspaceId", asyncHandler(deleteWorkspace));
// --- Folders service ---
router.post("/:workspaceId/folders", async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { userId, folderData } = req.body;

    if (!userId || !workspaceId || !folderData.space) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const savedWorkspaceFolder = await createWorkspaceFolder(
      userId,
      workspaceId,
      folderData.space,
      folderData
    );

    res.status(201).json({
      message: "Workspace folder created successfully",
      folder: savedWorkspaceFolder
    });
  } catch (error) {
    res.status(400).json({ message: "Error creating workspace folder", error: error.message });
  }
});
router.get("/:workspaceId/folders/:folderId", async (req, res) => {
  try {
    const { workspaceId, folderId } = req.params;
    // const { space } = req.query;
    const result = await fetchWorkspaceAndFolders(workspaceId, folderId);

    res.json({
      message: `Workspace and folder fetched successfully, workspaceId: ${workspaceId}, folderId: ${folderId}, result: ${JSON.stringify(result)}`,
      workspace: result.workspace,
      folder: result.folder
      //...result,
    });
  } catch (error) {
    console.error(`Error in /folders/:space route: ${error.message}`);
    res.status(500).json({ error: "Error fetching folders", message: error.message });
  }
});
router.get("/:workspaceId/folders/space/:space", async (req, res) => {
  try {
    const { workspaceId, space } = req.params;

    // Fetch folders for the given workspaceId and space
    const folders = await Folder.find({ workspaceId, space }).lean();

    // Determine which item type to fetch based on the space
    let ItemModel;
    switch (space) {
      case "prompts":
        ItemModel = Prompt;
        break;
      case "files":
        ItemModel = File;
        break;
      case "tools":
        ItemModel = Tool;
        break;

      case "models":
        ItemModel = Model;
        break;
      case "presets":
        ItemModel = Preset;
        break;
      case "assistants":
        ItemModel = Assistant;
        break;
      case "collections":
        ItemModel = Collection;
        break;
      case "chatSessions":
        ItemModel = ChatSession;
      // Add other cases for different spaces/item types
      default:
        throw new Error("Invalid space type");
    }

    // Fetch all items of the specified type for the given workspaceId
    const items = await ItemModel.find({ workspaceId }).lean();

    // Populate folders with their items
    const populatedFolders = folders.map((folder) => ({
      ...folder,
      items: items.filter(
        (item) => item.folderId && item.folderId.toString() === folder._id.toString()
      )
    }));

    res.json({
      message: `Workspace folders and ${space} fetched successfully`,
      folders: populatedFolders,
      allItems: items
    });
  } catch (error) {
    console.error(`Error in /folders/:space route: ${error.message}`);
    res.status(500).json({ error: `Error fetching folders and ${space}`, message: error.message });
  }
});

// router.get("/:workspaceId/folders/space/:space", async (req, res) => {
//   try {
//     const { workspaceId, space } = req.params;
//     // const { space } = req.query;
//     const result = await fetchWorkspaceAndFolders(workspaceId, space);
//     res.json({
//       message: `Workspace and folders fetched successfully, space: ${space}, result: ${JSON.stringify(result)}`,
//       workspace: result.workspace,
//       folders: result.folders
//       // ...result,
//     });
//   } catch (error) {
//     console.error(`Error in /folders/:space route: ${error.message}`);
//     res.status(500).json({ error: "Error fetching folders", message: error.message });
//   }
// });
router.get("/:workspaceId/folders/:folderId/items", async (req, res) => {
  try {
    const { workspaceId, folderId } = req.params;
    // const { space } = req.query;
    const result = await fetchWorkspaceAndFolders(workspaceId, folderId);

    res.json({
      message: `Workspace and folder fetched successfully, workspaceId: ${workspaceId}, folderId: ${folderId}, result: ${JSON.stringify(result)}`,
      workspace: result.workspace,
      folder: result.folder
      //...result,
    });
  } catch (error) {
    console.error(`Error in /folders/:space route: ${error.message}`);
    res.status(500).json({ error: "Error fetching folders", message: error.message });
  }
});
router.get("/:workspaceId/folders/:folderId/items/:itemId", async (req, res) => {
  try {
    const { workspaceId, folderId, itemId } = req.params;
    // const { space } = req.query;
    const result = await fetchWorkspaceAndFolders(workspaceId, folderId, itemId);

    res.json({
      message: `Workspace and folder fetched successfully, workspaceId: ${workspaceId}, folderId: ${folderId}, itemId: ${itemId}, result: ${JSON.stringify(result)}`,
      workspace: result.workspace,
      folder: result.folder,
      item: result.item
      //...result,
    });
  } catch (error) {
    console.error(`Error in /folders/:space route: ${error.message}`);
    res.status(500).json({ error: "Error fetching folders", message: error.message });
  }
});
// --- ChatSessions service ---
router.get("/:workspaceId/chatSessions", async (req, res) => {
  try {
    const { workspaceId } = req.params;
    // const { space } = req.query;
    const result = await fetchWorkspaceAndChatSessions(workspaceId);

    res.json({
      message: `Workspace and chatSessions fetched successfully, workspaceId: ${workspaceId}, result: ${JSON.stringify(result)}`,
      workspace: result.workspace,
      chatSessions: result.chatSessions
      // ...result,
    });
  } catch (error) {
    console.error(`Error in /sessions/:space route: ${error.message}`);
    res.status(500).json({ error: "Error fetching folders", message: error.message });
  }
});
router.get("/:workspaceId/chatSessions/:chatSessionId", async (req, res) => {
  try {
    const { workspaceId, chatSessionId } = req.params;
    const result = await fetchWorkspaceAndChatSession(workspaceId, chatSessionId);

    res.json({
      message: `Workspace and chat session fetched successfully, workspaceId: ${workspaceId}, chatSessionId: ${chatSessionId}`,
      workspace: result.workspace,
      chatSession: result.chatSession
    });
  } catch (error) {
    console.error(`Error in /chatSessions/:chatSessionId route: ${error.message}`);
    res.status(500).json({ error: "Error fetching chat session", message: error.message });
  }
});
router.post("/:workspaceId/chatSessions", async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { userId, sessionData } = req.body;

    const result = await createWorkspaceChatSession(workspaceId, userId, sessionData);

    res.json({
      message: `Workspace and chat session fetched successfully for workspaceId: ${workspaceId}`,
      workspace: result.workspace,
      chatSession: result.chatSession
    });
  } catch (error) {
    console.error(`Error in /:workspaceId/chatSessions route: ${error.message}`);
    res
      .status(500)
      .json({ error: "Error creating or fetching chat session", message: error.message });
  }
});

module.exports = router;
