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
      .populate("folders");
    res.status(200).json(workspaces);
  } catch (error) {
    res.status(500).json({ message: "Error fetching workspaces", error: error.message });
  }
});

// --- AUTHENTICATION ROUTES ---
router.get("/validate-token", userController.validateToken);

// --- USER PROFILE ROUTES ---
router.get("/profile-image/:userId", userController.getProfileImage);

module.exports = router;
