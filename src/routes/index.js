// routes/index.js
const { chatRoutes, chatAttachmentRoutes, chatSessionRoutes } = require("./chat-sessions");
const {
  modelRoutes,
  presetRoutes,
  toolRoutes,
  promptRoutes,
  collectionRoutes
} = require("./chat-items");
const { userBaseRoutes, authRoutes } = require("./user");
const { workspaceRoutes } = require("./workspaces");
const { hostedModelRoutes } = require("./chat-hosted");
const { fileRoutes } = require("./files");
const { crawlRoutes } = require("./chat-tools");

const setupRoutes = (app) => {
  app.use("/api/files", fileRoutes);
  app.use("/api/crawl", crawlRoutes);
  app.use("/api/auth", authRoutes);
  app.use("/api/user", userBaseRoutes);
  app.use("/api/chat/v1", chatRoutes); // <-- Main Route
  app.use("/api/chat/workspaces", workspaceRoutes);
  app.use("/api/chat/sessions", chatSessionRoutes);
  app.use("/api/chat/presets", presetRoutes);
  app.use("/api/chat/tools", toolRoutes);
  app.use("/api/chat/models", modelRoutes);
  app.use("/api/chat/prompts", promptRoutes);
  app.use("/api/chat/collections", collectionRoutes);
  app.use("/api/chat/hosted", hostedModelRoutes);
  app.use("/api/chat/files", chatAttachmentRoutes);
  app.use("/api/chat/messages", chatAttachmentRoutes);
};

module.exports = setupRoutes;
