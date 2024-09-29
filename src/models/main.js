const mongoose = require('mongoose');
const { Schema } = mongoose;
const { createSchema, createModel } = require('./utils');

// =============================
// [COLLECTIONS]
// =============================
const collectionSchema = createSchema({
  folderId: { type: Schema.Types.ObjectId, ref: 'Folder' },
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  name: String,
  description: String,
  sharing: String,
});
const assistantCollectionSchema = createSchema({
  assistantId: { type: Schema.Types.ObjectId, ref: 'Assistant' },
  collectionId: { type: Schema.Types.ObjectId, ref: 'Collection' },
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
});
// =============================
// [APP]
// =============================
const textBufferSchema = createSchema({
  builders: { type: Array, of: String, default: [] },
  prefix: { type: String, default: '' },
  suffix: { type: String, default: '' },
});

const Collection = createModel('Collection', collectionSchema);
const AssistantCollection = createModel('AssistantCollection', assistantCollectionSchema);
const TextBuffer = createModel('TextBuffer', textBufferSchema);

module.exports = {
  collectionSchema,
  assistantCollectionSchema,
  textBufferSchema,
  Collection,
  AssistantCollection,
  TextBuffer,
};
