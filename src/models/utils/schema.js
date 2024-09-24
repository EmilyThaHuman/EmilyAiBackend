const mongoose = require('mongoose');
const { User } = require('../user');
const { Schema, model } = mongoose;
const { logger } = require('@/config/logging');

const newSnippetSchema = new mongoose.Schema({
  title: String,
  snippet: String,
});
const commonSchemaFields = {
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date },
};
const createSchemaFields = (fields) => ({
  ...fields,
  ...commonSchemaFields,
});
const createSchema = (fields, options = {}) =>
  new Schema(createSchemaFields(fields), { timestamps: true, ...options });
const createModel = (name, schema) => model(name, schema);
const createSnippetModel = createModel('Snippet', newSnippetSchema);
// Example function to find and populate a user
async function findAndPopulateUser(userId) {
  try {
    const user = await User.findById(userId)
      .populate({
        path: 'workspaces',
        populate: [
          { path: 'folders' },
          { path: 'chatSessions' },
          { path: 'assistants' },
          { path: 'prompts' },
          { path: 'files' },
          { path: 'collections' },
          { path: 'models' },
          { path: 'tools' },
          { path: 'presets' },
        ],
      })
      .populate({
        path: 'folders',
        populate: [
          { path: 'chatSessions' },
          { path: 'assistants' },
          { path: 'prompts' },
          { path: 'files' },
          { path: 'collections' },
          { path: 'models' },
          { path: 'tools' },
          { path: 'presets' },
        ],
      })
      .populate({
        path: 'chatSessions',
        populate: [{ path: 'messages' }, { path: 'tools' }, { path: 'files' }],
      })
      .populate('assistants')
      .populate('prompts')
      .populate('files')
      .populate('collections')
      .populate('models')
      .populate('tools')
      .populate('presets')
      .exec();

    logger.info(user);
    return user;
  } catch (error) {
    logger.error('Error fetching user:', error);
    throw error;
  }
}

module.exports = {
  createSchema,
  createModel,

  createSnippetModel,
  findAndPopulateUser,
};
