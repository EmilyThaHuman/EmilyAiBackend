const mongoose = require('mongoose');
const { Schema } = mongoose;
const { createSchema, createModel } = require('../utils/schema');

// =============================
// [MODELS]
// =============================
const modelSchema = createSchema({
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace' },
  folderId: { type: Schema.Types.ObjectId, ref: 'Folder' },
  apiKey: { type: String, required: false },
  baseUrl: { type: String, required: false },
  modelId: { type: String, required: false },
  label: { type: String },
  contextLength: { type: Number },
  maxToken: { type: Number },
  defaultToken: { type: Number },
  name: {
    type: String,
    required: false,
  },
  description: {
    type: String,
  },
  isDefault: {
    type: Boolean,
    default: false,
  },
});

const Model = createModel('Model', modelSchema);

module.exports = {
  modelSchema,
  Model,
};
