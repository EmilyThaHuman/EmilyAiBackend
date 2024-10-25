// routes/index.js
const { chatRoutes, chatAttachmentRoutes, chatSessionRoutes } = require("./chat-sessions");
const { chatSettingsRoutes } = require("./chat-items");
const { userBaseRoutes } = require("./user");
const { workspaceRoutes } = require("./workspaces");
const { hostedModelRoutes } = require("./chat-hosted");

const setupRoutes = (app) => {
  app.use("/api/user", userBaseRoutes);
  app.use("/api/chat/v1", chatRoutes); // <-- Main Route
  app.use("/api/chat", chatSettingsRoutes);
  app.use("/api/chat/hosted", hostedModelRoutes);
  // app.use("/api/chat/copilot", copilotKitRoutes);
  app.use("/api/chat/workspaces", workspaceRoutes);
  app.use("/api/chat/files", chatAttachmentRoutes);
  app.use("/api/chat/messages", chatAttachmentRoutes);
  app.use("/api/chat/sessions", chatSessionRoutes);
};

module.exports = setupRoutes;
