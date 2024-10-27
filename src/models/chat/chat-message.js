// models/ChatMessage.js
const mongoose = require("mongoose");
const natural = require("natural");
const { Schema } = mongoose;
const { logger } = require("@config/logging");
const { createSchema, createModel } = require("../utils/schema");
const { encode } = require("gpt-tokenizer");

// =============================
// [MESSAGES] content, role, files, sessionId
// =============================
const chatMessageSchema = createSchema({
  // -- RELATIONSHIPS
  userId: { type: Schema.Types.ObjectId, ref: "User" },
  sessionId: { type: Schema.Types.ObjectId, ref: "ChatSession" },
  assistantId: { type: Schema.Types.ObjectId, ref: "Assistant" },
  files: [{ type: Schema.Types.ObjectId, ref: "File" }],

  // -- REQUIRED FIELDS
  content: { type: String, required: false, maxlength: 1000000 },
  code: { type: String, required: false, maxlength: 1000000 },
  imagePaths: [{ type: String }],
  model: { type: String },
  role: {
    type: String,
    enum: ["system", "user", "assistant", "function", "tool"],
    required: true,
    default: "user"
  },
  sequenceNumber: Number,

  // -- ADDITIONAL FIELDS
  type: String,
  data: {
    content: String,
    additional_kwargs: {}
  },
  summary: {
    type: mongoose.Schema.Types.Mixed, // Allows storing any data type, including objects
    required: false
  },
  tokens: { type: Number },
  localEmbedding: String,
  openaiEmbedding: String,
  sharing: String,
  metadata: {
    type: mongoose.Schema.Types.Mixed
  }
});

chatMessageSchema.index({ sessionId: 1, createdAt: 1 });

// Pre-save hook to handle unique content replacement
chatMessageSchema.pre("save", async function (next) {
  logger.info("ChatMessage pre-save hook");

  next();
});

// Pre-findOneAndUpdate hook to prevent duplicate content
chatMessageSchema.pre("findOneAndUpdate", async function (next) {
  const update = this.getUpdate();
  if (update.content) {
    const existingMessage = await this.model.findOne({
      content: update.content,
      _id: { $ne: this.getQuery()._id }
    });
    if (existingMessage) {
      return next(new Error("A message with this content already exists"));
    }
  }
  next();
});

// Static methods
chatMessageSchema.statics.createMessage = async function (messageData) {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const message = new this(messageData);
    await message.save({ session });

    // Update the ChatSession's messages array and increment message count
    await mongoose
      .model("ChatSession")
      .findByIdAndUpdate(
        message.sessionId,
        { $push: { messages: message._id }, $inc: { "stats.messageCount": 1 } },
        { new: true, session }
      );

    await session.commitTransaction();
    session.endSession();
    return message;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    logger.error("Error in ChatMessage.createMessage:", error);
    throw error;
  }
};

chatMessageSchema.statics.getMessagesBySession = async function (sessionId, limit = 50, skip = 0) {
  return this.find({ sessionId })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean()
    .populate("files");
};

// Instance methods
chatMessageSchema.methods.updateContent = async function (newContent) {
  this.content = newContent;
  this.updatedAt = Date.now();
  return this.save();
};

chatMessageSchema.methods.generateSummary = async function () {
  // Implement logic to generate summary, possibly using an AI service
  // This is a placeholder implementation
  this.summary = this.content.substring(0, 100) + "...";
  return this.save();
};

chatMessageSchema.methods.tokenizeMessage = async function (messageId) {
  const message = await ChatMessage.findById(messageId);
  if (!message) {
    throw new Error("Message not found");
  }
  const tokenizer = new natural.WordTokenizer();
  const tokens = tokenizer.tokenize(message.content);
  logger.info(`Message ${messageId} tokenized with ${tokens.length} tokens`);
  this.tokens = tokens.length;
  return this.save();
};

chatMessageSchema.methods.getMessageTokenCount = async (messageId) => {
  const message = await ChatMessage.findById(messageId);
  if (!message) {
    throw new Error("Message not found");
  }
  const tokenizer = new natural.WordTokenizer();
  const tokens = tokenizer.tokenize(message.content);
  logger.info(`Message ${messageId} tokenized with ${tokens.length} tokens`);
  return tokens.length;
};

chatMessageSchema.methods.markAsImportant = async function () {
  this.metadata = { ...this.metadata, important: true };
  this.updatedAt = Date.now();
  await this.save();
  logger.info(`Message ${this._id} marked as important`);
  return this;
};

const ChatMessage = createModel("ChatMessage", chatMessageSchema);

module.exports = { ChatMessage };
