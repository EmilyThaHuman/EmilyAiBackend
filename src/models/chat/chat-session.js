// models/ChatSession.js
const mongoose = require("mongoose");
const natural = require("natural");
const { Schema } = mongoose;
const { logger } = require("@config/logging");
const { createSchema, createModel } = require("../utils/schema");

// =============================
// [CHAT SESSIONS]
// =============================
const chatSessionSchema = createSchema(
  {
    // -- RELATIONSHIPS (REQUIRED)
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace" },
    // -- RELATIONSHIPS (OPTIONAL)
    folderId: { type: Schema.Types.ObjectId, ref: "Folder" },
    assistantId: { type: Schema.Types.ObjectId, ref: "Assistant" },
    // -- REQUIRED FIELDS
    name: { type: String, required: false, default: "Default Chat Session" },
    model: { type: String, required: false, default: "gpt-4-turbo-preview" },
    path: { type: String, required: false, default: "/chat" },
    status: {
      type: String,
      enum: ["active", "archived"],
      default: "active"
    },
    active: { type: Boolean, default: true },
    important: { type: Boolean, default: false },
    topic: { type: String, default: "No Topic" },
    title: { type: String, default: "No Title" },
    // -- MESSAGES AND INTERACTIONS
    messages: [{ type: Schema.Types.ObjectId, ref: "ChatMessage" }],
    // -- PROMPT AND TOOL USAGE
    prompt: { type: String },
    systemPrompt: { type: String },
    assistantInstructions: { type: String },
    promptHistory: [{ type: String }],
    completionHistory: [{ type: String }],
    tools: [{ type: Schema.Types.ObjectId, ref: "Tool" }],
    files: [{ type: Schema.Types.ObjectId, ref: "File" }],
    // -- SETTINGS AND CONFIGURATIONS
    embeddingsProvider: { type: String },
    contextLength: { type: Number },
    includeProfileContext: { type: Boolean, default: false },
    includeWorkspaceInstructions: { type: Boolean, default: false },
    apiKey: { type: String },
    // -- ADVANCED SETTINGS
    settings: {
      type: Map,
      of: Schema.Types.Mixed,
      default: {
        contextCount: 15,
        maxTokens: 2000,
        temperature: 0.7,
        model: "gpt-4-1106-preview",
        topP: 1,
        n: 4,
        debug: false,
        summarizeMode: false
      }
    },
    // -- STATS/ANALYSIS FIELDS --
    summary: {
      type: mongoose.Schema.Types.Mixed, // Allows storing any data type, including objects
      required: false
    },
    category: String,
    keywords: [String],
    sentiment: String,
    language: String,
    expandedQuery: String,
    responseOutline: String,
    actionItems: [String],
    followUpQuestions: [String],
    tokens: { type: Number },
    stats: {
      tokenUsage: { type: Number, default: 0 },
      messageCount: { type: Number, default: 0 }
    },
    langChainSettings: {
      type: Map,
      of: Schema.Types.Mixed,
      default: {
        maxTokens: 2000, // max length of the completion
        temperature: 0.7,
        modelName: "",
        // streamUsage: true,
        streaming: true,
        openAIApiKey: "",
        organization: "reed_tha_human",
        tools: [
          {
            type: "function",
            function: {
              name: "summarize_messages",
              description:
                "Summarize a list of chat messages with an overall summary and individual message summaries including their IDs",
              parameters: {
                type: "object",
                properties: {
                  overallSummary: {
                    type: "string",
                    description: "An overall summary of the chat messages"
                  },
                  individualSummaries: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: {
                          type: "string",
                          description: "The ID of the chat message"
                        },
                        summary: {
                          type: "string",
                          description: "A summary of the individual chat message"
                        }
                      },
                      required: ["id", "summary"]
                    }
                  }
                },
                required: ["overallSummary", "individualSummaries"]
              }
            }
          },
          {
            type: "function",
            function: {
              name: "fetchSearchResults",
              description:
                "Fetch search results for a given query using SERP API used to aid in being  PRIVATE INVESTIGATOR",
              parameters: {
                type: "object",
                properties: {
                  query: {
                    type: "string",
                    description: "Query string to search for"
                  }
                },
                required: ["query"]
              }
            }
          }
        ],
        code_interpreter: "auto",
        function_call: "auto"
      }
    },
    // -- TUNING AND DEBUGGING SETTINGS
    tuning: {
      type: Map,
      of: Schema.Types.Mixed,
      default: {
        debug: false,
        summary: "",
        summarizeMode: false
      }
    },
    // -- SYSTEM INFORMATION
    activeSessionId: { type: String },
    // METADATA
    metadata: {
      type: mongoose.Schema.Types.Mixed
    }
  },
  {
    timestamps: true, // Automatically adds `createdAt` and `updatedAt` fields
    minimize: false, // Ensures empty objects are saved instead of being removed
    versionKey: false // Disables the __v field used by Mongoose for document versioning
  }
);

// Indexes
// const indexes = [
//   { fields: { "metadata.name": 1 }, unique: true }, // Unique index on metadata.name
//   { fields: { "metadata.type": 1 } }, // Index on metadata.type
//   { fields: { "metadata.category": 1 } }, // Index on metadata.category
//   { fields: { "metadata.subcategory": 1 } } // Index on metadata.sub
// ];
// // Create indexes
// indexes.forEach((index) => {
//   Schema.index(index.fields, index.unique);
// });

// -- this index is used for querying by userId and workspaceId together
chatSessionSchema.index({ userId: 1, workspaceId: 1 });
// -- this index is used for querying by workspaceId and _id together
chatSessionSchema.index({ workspaceId: 1, _id: 1 });
// -- this index is used for querying by folderId and _id together
chatSessionSchema.index({ folderId: 1, _id: 1 });

// Static methods
chatSessionSchema.statics.createSession = async function (sessionData) {
  const session = new this(sessionData);
  await session.save();
  return session;
};

chatSessionSchema.statics.addSystemPrompt = async function (sessionId, prompt) {
  const session = await this.findById(sessionId);
  if (!session) {
    throw new Error(`Session ${sessionId} not found.`);
  }
  session.systemPrompt = prompt;
  await session.save();

  return session;
};

chatSessionSchema.statics.addAssistantInstructions = async function (sessionId, instructions) {
  const session = await this.findById(sessionId);
  if (!session) {
    throw new Error(`Session ${sessionId} not found.`);
  }
  session.assistantInstructions = instructions;
  await session.save();
  return session;
};

chatSessionSchema.statics.getSession = async function (sessionId) {
  const session = await this.findById(sessionId);
  return session;
};

chatSessionSchema.statics.deleteSession = async function (sessionId) {
  const session = await this.findById(sessionId);
  if (session) {
    // const sessionModel = this;
    const ChatMessage = mongoose.model("ChatMessage");
    const sessionDeletionSession = await mongoose.startSession();
    sessionDeletionSession.startTransaction();
    try {
      // Delete all associated messages
      await ChatMessage.deleteMany({ sessionId: session._id }, { session: sessionDeletionSession });

      // Remove session references from User and Workspace
      await mongoose.model("User").findByIdAndUpdate(
        session.userId,
        {
          $pull: { chatSessions: session._id }
        },
        { session: sessionDeletionSession }
      );

      await mongoose.model("Workspace").findByIdAndUpdate(
        session.workspaceId,
        {
          $pull: { chatSessions: session._id }
        },
        { session: sessionDeletionSession }
      );

      // Remove the session itself
      await session.remove({ session: sessionDeletionSession });

      await sessionDeletionSession.commitTransaction();
      sessionDeletionSession.endSession();
      logger.info(`Chat session ${sessionId} and all associated messages deleted successfully`);
    } catch (error) {
      await sessionDeletionSession.abortTransaction();
      sessionDeletionSession.endSession();
      logger.error(`Error deleting chat session: ${error.message}`);
      throw new Error(`Failed to delete chat session: ${error.message}`);
    }
  }
};

chatSessionSchema.methods.archiveSession = async function () {
  this.status = "archived";
  this.active = false;
  this.updatedAt = Date.now();
  await this.save();
  return this;
};

chatSessionSchema.methods.reactivateSession = async function () {
  if (this.status === "archived") {
    this.status = "active";
    this.active = true;
    this.updatedAt = Date.now();
    await this.save();
    return this;
  }
  throw new Error(`Session ${this._id} is not archived and cannot be reactivated.`);
};

chatSessionSchema.methods.addMessage = async function (messageData) {
  const ChatMessage = mongoose.model("ChatMessage");
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const message = await ChatMessage.createMessage(
      { ...messageData, sessionId: this._id },
      { session }
    );

    // No need to push the message ID again as it's already handled in ChatMessage.createMessage
    // However, if ChatMessage.createMessage doesn't update the session, you need to handle it here
    // Assuming it's already handled, we just need to commit

    await session.commitTransaction();
    session.endSession();
    return message;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    logger.error("Error in ChatSession.addMessage:", error);
    throw error;
  }
};

chatSessionSchema.methods.getHistory = function (limit = 50, skip = 0) {
  return mongoose
    .model("ChatMessage")
    .find({ sessionId: this._id })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate("files");
};

chatSessionSchema.methods.updateSettings = async function (newSettings) {
  this.settings = { ...this.settings, ...newSettings };
  return this.save();
};

chatSessionSchema.methods.tokenizeAllMessages = async function () {
  const ChatMessage = mongoose.model("ChatMessage");

  // Retrieve messages for this session
  const messages = await ChatMessage.find({ sessionId: this._id });
  if (!messages || messages.length === 0) {
    logger.error("No messages found for sessionId:", this._id);
    return [];
  }

  const tokenizer = new natural.WordTokenizer();

  // Tokenize the content of each message and update the token count
  const tokenizedMessages = messages.map((msg) => {
    const tokens = tokenizer.tokenize(msg.content || ""); // Ensure content exists
    return {
      ...msg.toObject(),
      tokens: tokens.length // Store token count (length of token array)
    };
  });

  // Update token usage for the session
  const totalTokenUsage = tokenizedMessages.reduce((sum, message) => sum + message.tokens, 0);
  this.stats.tokenUsage = totalTokenUsage;

  // Save the updated session token usage
  await this.save();

  return tokenizedMessages;
};

chatSessionSchema.methods.updateTokenUsage = async function (tokenizedMessages) {
  const tokenUsage = tokenizedMessages.reduce((sum, message) => sum + message.tokens, 0);
  this.stats.tokenUsage = tokenUsage;
  return this.save();
};

chatSessionSchema.methods.getTokenUsage = function () {
  return this.stats.tokenUsage || 0;
};

chatSessionSchema.methods.addFile = async function (fileId) {
  if (!this.files.includes(fileId)) {
    this.files.push(fileId);
    return this.save();
  }
  return this;
};

// Pre-save hook to ensure unique session names and update related user/workspace
chatSessionSchema.pre("save", async function (next) {
  logger.info("Pre-save hook for ChatSession model");
  if (this.isNew) {
    let uniqueName = this.name;
    let counter = 1;
    const originalName = this.name;

    // Ensure the session name is unique within the user and workspace
    while (true) {
      const existingSession = await this.constructor.findOne({
        userId: this.userId,
        workspaceId: this.workspaceId,
        name: uniqueName
      });
      if (!existingSession) break;
      uniqueName = `${originalName} (${counter++})`;
    }
    this.name = uniqueName;
  }

  if (this.isNew) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      // Add the session to the user's chatSessions
      await mongoose.model("User").findByIdAndUpdate(
        this.userId,
        {
          $addToSet: { chatSessions: this._id }
        },
        { session }
      );

      // Check if the session is already in the workspace's chatSessions
      const workspace = await mongoose.model("Workspace").findById(this.workspaceId);
      if (!workspace.chatSessions.includes(this._id)) {
        // Add the session to the workspace's chatSessions
        await mongoose.model("Workspace").findByIdAndUpdate(
          this.workspaceId,
          {
            $addToSet: { chatSessions: this._id }
          },
          { session }
        );
      }

      await session.commitTransaction();
      session.endSession();
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      logger.error("Error in ChatSession pre-save hook:", error);
      return next(error);
    }
  } else {
    // Update the updatedAt timestamp for existing sessions
    this.updatedAt = Date.now();
  }
  next();
});

const ChatSession = createModel("ChatSession", chatSessionSchema);
module.exports = { ChatSession };
