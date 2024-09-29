const mongoose = require('mongoose');
const { Schema } = mongoose;
const { createSchema, createModel } = require('../utils/schema');

// =============================
// [PRESETS]
// =============================
const presetSchema = createSchema({
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace' },
  folderId: { type: Schema.Types.ObjectId, ref: 'Folder' },
  name: { type: String, required: false },
  temperature: { type: Number, required: false },
  maxTokens: { type: Number, required: false },
  topP: { type: Number, required: false },
  frequencyPenalty: { type: Number, required: false },
  presencePenalty: { type: Number, required: false },
  n: { type: Number, required: false },
  contextLength: { type: Number, required: false },
  embeddingsProvider: { type: String, required: false },
  systemPrompt: { type: String, required: false },
  assistantPrompt: { type: String, required: false },
  functions: {
    type: Array,
    required: false,
  },
  includeProfileContext: { type: Boolean, required: false },
  includeWorkspaceInstructions: { type: Boolean, required: false },
  model: { type: String, required: false },
  prompt: { type: String, required: false },
  sharing: { type: String },
});

const Preset = createModel('Preset', presetSchema);

module.exports = {
  presetSchema,
  Preset,
};
