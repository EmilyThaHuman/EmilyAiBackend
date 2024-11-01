// routes/user/local.js
const express = require("express");
const userController = require("../../controllers");
const { User } = require("@models/user");
const { logger } = require("@config/logging");
const { Workspace } = require("@models/workspace");
const router = express.Router();

// --- INITIALIZE ROUTES ---
router.post("/signup", userController.registerUser);
router.post("/login", userController.loginUser);
router.get("/session", (req, res) => {
  if (req.session.user) {
    res.json({ session: req.session.user });
  } else {
    res.status(401).json({ message: "No active session" });
  }
});
router.post("/check-username", async (req, res) => {
  const { username } = req.body;

  if (!username) {
    return res.status(400).json({ message: "Username is required" });
  }

  try {
    const user = await User.findOne({ username: username.toLowerCase() });
    res.status(200).json({ isAvailable: !user });
  } catch (error) {
    logger.error("Error checking username:", error);
    const errorMessage = error.message || "An unexpected error occurred";
    const errorCode = error.status || 500;
    res.status(errorCode).json({ message: errorMessage });
  }
});
router.post("/logout", userController.logoutUser);
router.post("/refresh-token", userController.refreshAccessToken);

// --- INITIALIZE ROUTES ---
router.post("/:userId/addApiKey", userController.addApiKey);
router.put("/:userId/profile", userController.updateProfile);
router.get("/:userId/workspaces", async (req, res) => {
  try {
    const workspaces = await Workspace.find({ userId: req.params.userId })
      .populate("chatSessions")
      .populate("folders")
      .populate("files")
      .populate("prompts")
      .populate("assistants");

    // Process the workspaces to use getRequiredData methods
    const processedWorkspaces = workspaces.map((workspace) => {
      // Process files
      if (workspace.files && Array.isArray(workspace.files)) {
        workspace.files = workspace.files.map((file) => {
          if (typeof file.getRequiredData === "function") {
            return file.getRequiredData();
          } else {
            // Handle the case where getRequiredData is not available
            return file;
          }
        });
      }

      // Process prompts
      if (workspace.prompts && Array.isArray(workspace.prompts)) {
        workspace.prompts = workspace.prompts.map((prompt) => {
          if (typeof prompt.getRequiredData === "function") {
            return prompt.getRequiredData();
          } else {
            return prompt;
          }
        });
      }

      // Process assistants
      if (workspace.assistants && Array.isArray(workspace.assistants)) {
        workspace.assistants = workspace.assistants.map((assistant) => {
          if (typeof assistant.getRequiredData === "function") {
            return assistant.getRequiredData();
          } else {
            return assistant;
          }
        });
      }

      // Similarly for chatSessions and folders if they have getRequiredData methods
      // Process chatSessions
      if (workspace.chatSessions && Array.isArray(workspace.chatSessions)) {
        workspace.chatSessions = workspace.chatSessions.map((session) => {
          if (typeof session.getRequiredData === "function") {
            return session.getRequiredData();
          } else {
            return session;
          }
        });
      }

      // Process folders
      if (workspace.folders && Array.isArray(workspace.folders)) {
        workspace.folders = workspace.folders.map((folder) => {
          if (typeof folder.getRequiredData === "function") {
            return folder.getRequiredData();
          } else {
            return folder;
          }
        });
      }

      // Now convert the workspace to a plain object, if necessary
      return workspace.toObject();
    });

    res.status(200).json(processedWorkspaces);
  } catch (error) {
    logger.error(`[ERROR] [${new Date().toLocaleTimeString()}] ERR: :userId/workspaces:`, error);
    res.status(500).json({ message: "Error fetching workspaces", error: error.message });
  }
});

router.get("/:userId/workspaces/home", async (req, res) => {
  try {
    const workspaces = await Workspace.find({ userId: req.params.userId })
      .populate("chatSessions")
      .populate("folders")
      .populate("prompts")
      .populate("files")
      .populate("assistants");
    const homeWorkspace = workspaces.find((workspace) => workspace.type === "Home");
    res.status(200).json(homeWorkspace);
  } catch (error) {
    res.status(500).json({ message: "Error fetching workspaces", error: error.message });
  }
});
// --- AUTHENTICATION ROUTES ---
router.get("/validate-token", userController.validateToken);

// --- USER PROFILE ROUTES ---
router.get("/profile-image/:userId", userController.getProfileImage);

module.exports = router;
