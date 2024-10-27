const mongoose = require("mongoose");
const { Schema } = mongoose;
const { createSchema, createModel } = require("../utils/schema");

// =============================
// [MODELS]
// =============================
const modelSchema = createSchema({
  // -- RELATIONSHIPS
  userId: { type: Schema.Types.ObjectId, ref: "User" },
  workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace" },
  folderId: { type: Schema.Types.ObjectId, ref: "Folder" },

  // -- REQUIRED FIELDS
  sharing: {
    type: String,
    enum: ["private", "public", "shared"],
    default: "private",
    required: true
  },
  apiKey: { type: String, required: false },
  baseUrl: { type: String, required: false },
  name: {
    type: String,
    required: false
  },
  description: {
    type: String
  },
  modelId: { type: String, required: false }
});

const Model = createModel("ChatModel", modelSchema);

module.exports = {
  modelSchema,
  Model
};
