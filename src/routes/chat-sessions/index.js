const chatAssistantRoutes = require("./assistants");
const chatRoutes = require("./chat-v1");
const chatAttachmentRoutes = require("./attachments");
const chatSessionRoutes = require("./session");

module.exports = {
  chatAssistantRoutes,
  chatRoutes,
  chatSessionRoutes,
  chatAttachmentRoutes
};
