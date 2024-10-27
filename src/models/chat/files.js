const mongoose = require("mongoose");
const { Schema } = mongoose;
const { createSchema, createModel } = require("../utils/schema");
const { logger } = require("@config/logging");

// =============================
// [FILES]
// =============================
const fileSchema = createSchema({
  // -- RELATIONSHIPS
  userId: { type: Schema.Types.ObjectId, ref: "User" },
  workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace" },
  sessionId: { type: Schema.Types.ObjectId, ref: "ChatSession" },
  folderId: { type: Schema.Types.ObjectId, ref: "Folder" },
  messageId: { type: Schema.Types.ObjectId, ref: "ChatMessage" },

  // -- REQUIRED FIELDS
  name: { type: String, required: false },
  description: { type: String, required: false },
  content: { type: String, required: false },
  type: {
    type: String,
    required: false,
    enum: [
      "txt",
      "pdf",
      "doc",
      "docx",
      "md",
      "html",
      "json",
      "csv",
      "tsv",
      "jsx",
      "js",
      "png",
      "jpg",
      "jpeg",
      "gif"
    ]
  },
  size: { type: Number, required: false },
  tokens: { type: Number, required: false },
  filePath: { type: String, required: false },

  // -- ADDITIONAL FIELDS
  originalFileType: { type: String, required: false },
  data: { type: Buffer, required: false },
  space: {
    type: String,
    required: false,
    enum: [
      "chatSessions",
      "assistants",
      "files",
      "models",
      "tools",
      "presets",
      "prompts",
      "collections"
    ]
  },
  sharing: { type: String },
  mimeType: { type: String, required: false },
  metadata: {
    fileSize: Number,
    fileType: String,
    lastModified: Date
  }
});

fileSchema.index({ space: 1, createdAt: 1 });

// Method to get only the required data
fileSchema.statics.getRequiredData = function () {
  return {
    name: this.name,
    description: this.description,
    content: this.content,
    metadata: {
      userId: this.userId,
      workspaceId: this.workspaceId,
      folderId: this.folderId,
      fileId: this.fileId,
      type: this.type,
      size: this.size,
      mimeType: this.mimeType,
      filePath: this.filePath,
      sharing: this.sharing,
      space: this.space,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    }
  };
};

// Pre-save middleware
fileSchema.pre("save", async function (next) {
  logger.info("File pre-save hook");
  this.updatedAt = Date.now();

  next();
});

const assistantFileSchema = createSchema({
  userId: { type: Schema.Types.ObjectId, ref: "User" },
  workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace" },
  assistantId: { type: Schema.Types.ObjectId, ref: "Assistant" },
  fileId: { type: Schema.Types.ObjectId, ref: "File" }
});

const chatFileSchema = createSchema({
  userId: { type: Schema.Types.ObjectId, ref: "User" },
  workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace" },
  sessionId: { type: Schema.Types.ObjectId, ref: "ChatSession" },
  fileId: { type: Schema.Types.ObjectId, ref: "File" }
});
chatFileSchema.pre("updateOne", function (next) {
  this.set({ updatedAt: Date.now() });
  next();
});

const collectionFileSchema = createSchema({
  userId: { type: Schema.Types.ObjectId, ref: "User" },
  workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace" },
  fileId: { type: Schema.Types.ObjectId, ref: "File" },
  collectionId: { type: Schema.Types.ObjectId, ref: "Collection" }
});

const messageFileItemSchema = createSchema({
  userId: { type: Schema.Types.ObjectId, ref: "User" },
  workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace" },
  messageId: { type: Schema.Types.ObjectId, ref: "ChatMessage" },
  fileItemId: { type: Schema.Types.ObjectId, ref: "FileItem" }
});

// messageFileItemSchema.index({ message_id: 1 });
messageFileItemSchema.pre("updateOne", function (next) {
  this.set({ updated_at: Date.now() });
  next();
});

const fileItemSchema = createSchema({
  userId: { type: Schema.Types.ObjectId, ref: "User" },
  fileId: { type: Schema.Types.ObjectId, ref: "File" },
  content: { type: String, required: false },
  tokens: { type: Number, required: false },
  localEmbedding: String,
  openaiEmbedding: String,
  sharing: String
});

const File = createModel("File", fileSchema);
const ChatFile = createModel("ChatFile", chatFileSchema);
const CollectionFile = createModel("CollectionFile", collectionFileSchema);
const MessageFileItem = createModel("MessageFileItem", messageFileItemSchema);
const FileItem = createModel("FileItem", fileItemSchema);
const AssistantFile = createModel("AssistantFile", assistantFileSchema);

module.exports = {
  File,
  ChatFile,
  CollectionFile,
  MessageFileItem,
  FileItem,
  AssistantFile
};
