// models/PromptTemplate.js

const mongoose = require('mongoose');

const PromptTemplateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  template: {
    type: String,
    required: true,
  },
  variables: {
    type: [String],
    required: true,
  },
  description: String,
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('PromptTemplate', PromptTemplateSchema);
