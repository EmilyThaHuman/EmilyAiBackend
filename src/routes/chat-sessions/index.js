const chatAssistantRoutes = require("./assistantRoutes");
const chatRoutes = require("./chat-v1");
const chatAttachmentRoutes = require("./attachmentRoutes");
const chatSessionRoutes = require("./sessionRoutes");

module.exports = {
  chatAssistantRoutes,
  chatRoutes,
  chatSessionRoutes,
  chatAttachmentRoutes
};
