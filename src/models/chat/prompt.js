const { logger } = require("@config/logging");
const mongoose = require("mongoose");
const { Schema } = mongoose;
const { createSchema, createModel } = require("../utils/schema");

// =============================
// [PROMPTS] createdBy, name, role, content, description, tags
// =============================
const promptSchema = createSchema({
  // -- RELATIONSHIPS
  userId: { type: Schema.Types.ObjectId, ref: "User" },
  workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace" },
  // -- OPTIONAL RELATIONSHIPS
  folderId: { type: Schema.Types.ObjectId, ref: "Folder" },

  // -- REQUIRED FIELDS
  name: { type: String, required: true, index: true },
  content: { type: String, required: true },

  // -- ADDITIONAL FIELDS
  description: String,
  role: { type: String, enum: ["system", "user", "assistant"] },
  type: String,
  sharing: { type: String, enum: ["private", "public", "workspace"] },
  rating: { type: Number, min: 0, max: 5 },
  tags: [String],
  metadata: {
    type: Map,
    of: Schema.Types.Mixed,
    default: {
      name: "default prompt",
      content: "A default prompt.",
      createdBy: "default",
      description: "",
      type: "",
      style: "",
      props: {},
      tags: []
    }
  }
});
promptSchema.index({ userId: 1, name: 1 }, { unique: true });

promptSchema.pre("save", async function (next) {
  logger.info("Prompt pre-save hook");

  next();
});

const Prompt = createModel("Prompt", promptSchema);

module.exports = {
  promptSchema,
  Prompt
};
