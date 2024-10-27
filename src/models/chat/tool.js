// models/Tool.js
const mongoose = require("mongoose");
const { Schema } = mongoose;
const { logger } = require("@config/logging");
const { createSchema, createModel } = require("../utils/schema");

// =============================
// [ASSISTANTS / TOOLS]
// =============================
const toolSchema = createSchema({
  userId: { type: Schema.Types.ObjectId, ref: "User" },
  workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace" },
  sessionId: { type: Schema.Types.ObjectId, ref: "ChatSession" },
  folderId: { type: Schema.Types.ObjectId, ref: "Folder" },
  assistantId: { type: Schema.Types.ObjectId, ref: "Assistant" },
  name: String,
  description: String,
  url: String,
  schema: Schema.Types.Mixed,
  customHeaders: Schema.Types.Mixed,
  sharing: String
  // defaultSchema: {
  //   type: Object,
  //   required: false,
  //   default: {
  //     type: 'function',
  //     function: {
  //       name: '',
  //       description: '',
  //       parameters: {
  //         type: 'object',
  //         properties: {
  //           /* -- input properties -- */
  //         },
  //         required: [
  //           /* -- input required properties -- */
  //         ],
  //       },
  //     },
  //   },
  // },
});

// Method to get only the required data
toolSchema.statics.getRequiredData = function () {
  return {
    name: this.name,
    description: this.description,
    url: this.url,
    schema: this.schema,
    type: this.type
  };
};

// Pre-save hook
toolSchema.pre("save", async function (next) {
  logger.info("Tool pre-save hook");
  this.updatedAt = Date.now();
  next();
});

const assistantToolSchema = createSchema({
  toolId: { type: Schema.Types.ObjectId, ref: "Tool" },
  userId: { type: Schema.Types.ObjectId, ref: "User" }
});

const Tool = createModel("Tool", toolSchema);
const AssistantTool = createModel("AssistantTool", assistantToolSchema);

module.exports = { Tool, AssistantTool };
