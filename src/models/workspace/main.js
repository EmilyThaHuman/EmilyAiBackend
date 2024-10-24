const mongoose = require("mongoose");
const { Schema } = mongoose;
const { createSchema, createModel } = require("../utils/schema");
const { logger } = require("@config/logging");

// =============================
// [WORKSPACES]
//  - The workspace schema is used to store information workspaces in the chat.
//  - Workspaces are used to organize chatSessions, files, and other resources.
//  - The primary data within each workspaces is:
//    - Active Chat Session: The active chat session within the workspace.
//    - Folders: An array of folders within the works
// =============================
const workspaceSchema = createSchema({
  userId: { type: Schema.Types.ObjectId, ref: "User" },
  folders: [{ type: Schema.Types.ObjectId, ref: "Folder" }],
  files: [{ type: Schema.Types.ObjectId, ref: "File" }],
  chatSessions: [{ type: Schema.Types.ObjectId, ref: "ChatSession" }],
  assistants: [{ type: Schema.Types.ObjectId, ref: "Assistant" }],
  tools: [{ type: Schema.Types.ObjectId, ref: "Tool" }],
  presets: [{ type: Schema.Types.ObjectId, ref: "Preset" }],
  prompts: [{ type: Schema.Types.ObjectId, ref: "Prompt" }],
  models: [{ type: Schema.Types.ObjectId, ref: "ChatModel" }],
  collections: [{ type: Schema.Types.ObjectId, ref: "Collection" }],

  selectedPreset: { type: Schema.Types.ObjectId, ref: "Preset" },
  name: { type: String, required: false },
  imagePath: { type: String },
  active: { type: Boolean, default: false },

  defaultContextLength: { type: Number },
  defaultTemperature: { type: Number },

  embeddingsProvider: { type: String },
  instructions: { type: String },
  sharing: { type: String },
  includeProfileContext: { type: Boolean },
  includeWorkspaceInstructions: { type: Boolean },
  isHome: { type: Boolean, default: false },
  activeSessionId: String,

  type: {
    type: String,
    required: false,
    enum: [
      "home",
      "profile",
      "assistant",
      "collection",
      "model",
      "tool",
      "preset",
      "prompt",
      "file"
    ]
  }
});

workspaceSchema.index({ userId: 1 });

workspaceSchema.methods.getWorkspaceWithAllResources = function () {
  return this.populate([
    { path: "folders", select: "name" },
    { path: "files", select: "fileName" },
    { path: "chatSessions", select: "sessionId" },
    { path: "assistants", select: "name" },
    { path: "tools", select: "name" },
    { path: "models", select: "name" },
    { path: "presets", select: "name" },
    { path: "collections", select: "name" }
  ]).execPopulate();
};
workspaceSchema.methods.getWorkspaceWithFolders = function () {
  return this.populate("folders").execPopulate();
};
workspaceSchema.methods.getWorkspaceWithFolders = function () {
  return this.populate({
    path: "folders",
    select: "name path"
  }).execPopulate();
};

workspaceSchema.pre("save", async function (next) {
  logger.info("Workspaceschema pre-save");

  next();
});

// =============================
// [FOLDERS] name, workspaceId
// =============================
const folderSchema = new Schema(
  {
    // -- RELATIONSHIPS
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },

    // -- CHILDREN
    files: [{ type: Schema.Types.ObjectId, ref: "File" }],
    prompts: [{ type: Schema.Types.ObjectId, ref: "Prompt" }],
    chatSessions: [{ type: Schema.Types.ObjectId, ref: "ChatSession" }],
    assistants: [{ type: Schema.Types.ObjectId, ref: "Assistant" }],
    tools: [{ type: Schema.Types.ObjectId, ref: "Tool" }],
    models: [{ type: Schema.Types.ObjectId, ref: "ChatModel" }],
    presets: [{ type: Schema.Types.ObjectId, ref: "Preset" }],
    collections: [{ type: Schema.Types.ObjectId, ref: "Collection" }],

    // -- experimental fields --
    space: {
      type: String,
      required: false,
      enum: [
        "workspaces",
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
    items: [{ type: Schema.Types.ObjectId, refPath: "space" }],

    // -- REQUIRED FIELDS
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    type: {
      type: String,
      required: false,
      enum: [
        "workspaces",
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
    metadata: {
      fileSize: Number,
      fileType: String,
      lastModified: Date,
      createdAt: Date,
      updatedAt: Date,
      originalName: String
    },

    // -- ADDITIONAL FIELDS

    parentFolderId: { type: Schema.Types.ObjectId, ref: "Folder" },
    parent: { type: Schema.Types.ObjectId, ref: "Folder", index: true },
    path: { type: String, index: true },
    level: { type: Number, default: 0 }
  },
  { timestamps: true }
);

// Indexes
folderSchema.index({ workspaceId: 1, space: 1 });
folderSchema.index({ userId: 1, workspaceId: 1, name: 1 }, { unique: true });
folderSchema.index({ path: 1, workspaceId: 1 });

// Pre-save Middleware
folderSchema.pre("save", async function (next) {
  try {
    logger.info("Folder schema pre-save");

    // Handle space-related logic
    if (this.isNew || this.isModified("space")) {
      const allowedFields = {
        files: ["files"],
        prompts: ["prompts"],
        chatSessions: ["chatSessions"],
        assistants: ["assistants"],
        tools: ["tools"],
        models: ["models"],
        presets: ["presets"],
        collections: ["collections"]
      };

      const selectedFields = allowedFields[this.space];

      if (selectedFields) {
        Object.keys(allowedFields).forEach((field) => {
          if (!selectedFields.includes(field)) {
            this[field] = undefined;
          }
        });
      }

      if (this.items && this.items.length > 0) {
        this.items = this.items.filter((item) => item.ref === this.space);
      }
    }

    // Handle path and level
    if (this.isNew || this.isModified("parent")) {
      const parent = this.parent
        ? await this.constructor.findById(this.parent).select("path level").lean().exec()
        : null;
      this.path = parent ? `${parent.path}/${this._id}` : `/${this._id}`;
      this.level = parent ? parent.level + 1 : 0;
    }

    // Update metadata
    if (this.isModified("name")) {
      this.metadata.originalName = this.name;
    }

    next();
  } catch (error) {
    logger.error(`Error in pre-save middleware: ${error.message}`, { folderId: this._id });
    next(error);
  }
});

// Virtuals
folderSchema.virtual("subfolders", {
  ref: "Folder",
  localField: "_id",
  foreignField: "parent"
});

// Methods

// Retrieve all descendants
folderSchema.methods.getAllDescendants = async function () {
  return this.model("Folder")
    .find({ path: new RegExp(`^${this.path}/`) })
    .lean()
    .exec();
};

// Retrieve folder with parent
folderSchema.methods.getFolderWithParent = async function () {
  return this.populate("parentFolder").execPopulate();
};

// Update metadata efficiently
folderSchema.methods.updateMetadata = async function (metadata) {
  Object.assign(this.metadata, metadata);
  return this.save();
};

// Populate specific fields
folderSchema.methods.populateFields = function (fields) {
  return this.populate(fields).execPopulate();
};

// Retrieve recursive subfolders optimized
folderSchema.methods.getRecursiveSubfoldersOptimized = async function () {
  return this.model("Folder")
    .find({ path: new RegExp(`^${this.path}/`) })
    .lean()
    .exec();
};

// Static Methods

// Paginate folders
folderSchema.statics.paginateFolders = async function (filter, options) {
  const { page = 1, limit = 10, sort = { createdAt: -1 } } = options;
  const skip = (page - 1) * limit;

  const folders = await this.find(filter).sort(sort).skip(skip).limit(limit).lean().exec();

  const total = await this.countDocuments(filter).exec();

  return {
    folders,
    total,
    page,
    pages: Math.ceil(total / limit)
  };
};

// Find multiple folders with population
folderSchema.statics.findMultipleFolders = async function (folderIds, populateOptions = []) {
  return this.find({ _id: { $in: folderIds } })
    .populate(populateOptions)
    .lean()
    .exec();
};

// Find by type with pagination
folderSchema.statics.findByType = async function (type, workspaceId, options = {}) {
  const { page = 1, limit = 10, sort = { createdAt: -1 } } = options;
  const skip = (page - 1) * limit;

  const folders = await this.find({ type, workspaceId })
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .lean()
    .exec();

  const total = await this.countDocuments({ type, workspaceId }).exec();

  return {
    folders,
    total,
    page,
    pages: Math.ceil(total / limit)
  };
};

// Bulk insert folders
folderSchema.statics.bulkInsertFolders = async function (foldersData) {
  try {
    return this.insertMany(foldersData, { ordered: false });
  } catch (error) {
    logger.error(`Bulk insert error: ${error.message}`);
    throw error;
  }
};

// Aggregate folders
folderSchema.statics.aggregateFolders = async function (pipeline) {
  try {
    return this.aggregate(pipeline).exec();
  } catch (error) {
    logger.error(`Aggregation error: ${error.message}`, { pipeline });
    throw error;
  }
};

// Query Helpers
folderSchema.query.byWorkspaceAndType = function (workspaceId, type) {
  return this.where({ workspaceId, type });
};

// Soft delete method
folderSchema.methods.softDelete = async function () {
  this.deleted = true;
  return this.save();
};

// Method to get all folders with matching workspaceId and space value

const Workspace = createModel("Workspace", workspaceSchema);
const Folder = createModel("Folder", folderSchema);

// const FileWorkspace = createModel("FileWorkspace", workspaceFilesSchema);
// const PromptWorkspace = createModel("PromptWorkspace", workspacePromptSchema);
// const CollectionWorkspace = createModel("CollectionWorkspace", workspaceCollectionSchema);
// const ModelWorkspace = createModel("ModelWorkspace", workspaceModelSchema);
// const PresetWorkspace = createModel("PresetWorkspace", workspacePresetsSchema);
// const AssistantWorkspace = createModel("AssistantWorkspace", workspaceAssistantSchema);
// const ToolWorkspace = createModel("ToolWorkspace", workspaceToolSchema);

module.exports = {
  Workspace,
  Folder
};
