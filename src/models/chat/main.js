const mongoose = require("mongoose");
const { Schema } = mongoose;
const { logger } = require("@config/logging");
const { createSchema, createModel } = require("../utils/schema");
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
chatMessageSchema.statics.createMessage = async function (messageData) {
  const message = new this(messageData);
  await message.save();
  await mongoose
    .model("ChatSession")
    .updateOne(
      { _id: message.sessionId },
      { $push: { messages: message._id }, $inc: { "stats.messageCount": 1 } }
    );
  return message;
};
chatMessageSchema.statics.getMessagesBySession = async function (sessionId, limit = 50, skip = 0) {
  return this.find({ sessionId })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean()
    .populate("files");
};
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
chatMessageSchema.methods.calculateTokens = function () {
  this.tokens = this.content.split(" ").length;
  return this.save();
};
chatMessageSchema.pre("save", async function (next) {
  if (this.isNew) {
    const existingMessage = await this.constructor.findOne({ content: this.content });
    if (existingMessage) {
      return next(new Error("A message with this content already exists"));
    }

    await mongoose
      .model("ChatSession")
      .findByIdAndUpdate(
        this.sessionId,
        { $push: { messages: this._id } },
        { new: true, useFindAndModify: false }
      );
  }
  this.updatedAt = Date.now();
  next();
});
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
// I need you to fix and optimize my Rag Chat Bot App's History/Session/Message saving logic. The way I want it to would is after a messagge gets added and saved, that message should have its _id value pushed into chatSession.messages which is an array of refIds each of which connects to a saved message. Below is my custom chatsession model for reference:
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
    history: [{ type: Schema.Types.ObjectId, ref: "Message" }],
    // -- PROMPT AND TOOL USAGE
    prompt: { type: String },
    systemPrompt: { type: Schema.Types.ObjectId, ref: "Prompt" },
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
    path: String,
    category: String,
    keywords: [String],
    sentiment: String,
    language: String,
    expandedQuery: String,
    responseOutline: String,
    actionItems: [String],
    followUpQuestions: [String],
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
chatSessionSchema.index({ userId: 1, workspaceId: 1 });
chatSessionSchema.statics.createSession = async function (sessionData) {
  const session = new this(sessionData);
  await session.save();
  return session;
};
chatSessionSchema.methods.archiveSession = async function () {
  this.status = "archived";
  this.active = false;
  this.updatedAt = Date.now();
  await this.save();
  return this;
};
// Method to reactivate a chat session
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
// [ChatHistory][Function 1] Add ChatMessage
// chatSessionSchema.methods.addMessage = async function (messageData) {
//   const newMessage = await ChatMessage.create({ ...messageData, sessionId: this._id });
//   this.messages.push(newMessage._id);
//   this.stats.messageCount += 1;
//   await this.save();
//   return newMessage;
// };
// Method to add a message to the session
chatSessionSchema.methods.addMessage = async function (messageData) {
  const newMessage = await mongoose
    .model("ChatMessage")
    .createMessage({ ...messageData, sessionId: this._id });
  this.messages.push(newMessage._id);
  this.stats.messageCount += 1;
  await this.save();
  return newMessage;
};
chatSessionSchema.methods.getHistory = function (limit = 50, skip = 0) {
  return ChatMessage.find({ sessionId: this._id })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate("files");
};
chatSessionSchema.methods.updateSettings = async function (newSettings) {
  this.settings = { ...this.settings, ...newSettings };
  return this.save();
};
chatSessionSchema.methods.calculateTokenUsage = async function () {
  const messages = await ChatMessage.find({ sessionId: this._id });
  this.stats.tokenUsage = messages.reduce((sum, message) => sum + (message.tokens || 0), 0);
  return this.save();
};
chatSessionSchema.methods.addFile = async function (fileId) {
  if (!this.files.includes(fileId)) {
    this.files.push(fileId);
    return this.save();
  }
  return this;
};
chatSessionSchema.statics.deleteSession = async function (sessionId) {
  try {
    const session = await this.findById(sessionId);
    if (session) {
      await mongoose.model("ChatMessage").deleteMany({ sessionId: session._id });
      await session.remove();
      logger.info(`Chat session ${sessionId} and all associated messages deleted successfully`);
    }
  } catch (error) {
    logger.error(`Error deleting chat session: ${error.message}`);
    throw new Error(`Failed to delete chat session: ${error.message}`);
  }
};
chatMessageSchema.methods.markAsImportant = async function () {
  this.metadata = { ...this.metadata, important: true };
  this.updatedAt = Date.now();
  await this.save();
  logger.info(`Message ${this._id} marked as important`);
  return this;
};

chatSessionSchema.pre("save", async function (next) {
  if (this.isNew) {
    let uniqueName = this.name;
    let counter = 1;
    const originalName = this.name;

    // eslint-disable-next-line no-constant-condition
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
  this.updatedAt = Date.now();

  next();
});
// =============================
// [ASSISTANTS / TOOLS]
// =============================
const toolSchema = createSchema({
  userId: { type: Schema.Types.ObjectId, ref: "User" },
  workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace" },
  sessionId: { type: Schema.Types.ObjectId, ref: "ChatSession" },
  folderId: { type: Schema.Types.ObjectId, ref: "Folder" },
  assistantId: { type: Schema.Types.ObjectId, ref: "Assistant" },
  name: String,
  description: String,
  url: String,
  schema: Schema.Types.Mixed,
  customHeaders: Schema.Types.Mixed,
  sharing: String
  // defaultSchema: {
  //   type: Object,
  //   required: false,
  //   default: {
  //     type: 'function',
  //     function: {
  //       name: '',
  //       description: '',
  //       parameters: {
  //         type: 'object',
  //         properties: {
  //           /* -- input properties -- */
  //         },
  //         required: [
  //           /* -- input required properties -- */
  //         ],
  //       },
  //     },
  //   },
  // },
});
toolSchema.pre("save", async function (next) {
  logger.info("Tool pre-save hook");
  this.updatedAt = Date.now();

  next();
});
const assistantToolSchema = createSchema({
  toolId: { type: Schema.Types.ObjectId, ref: "Tool" },
  userId: { type: Schema.Types.ObjectId, ref: "User" }
});
const assistantSchema = createSchema({
  // -- RELATIONSHIPS (REQUIRED)
  userId: { type: Schema.Types.ObjectId, ref: "User" },
  workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace" },

  // -- RELATIONSHIPS (OPTIONAL)
  folderId: { type: Schema.Types.ObjectId, ref: "Folder" },

  // REQUIRED FIELDS
  name: { type: String, required: false, default: "Default Chat Assistant" },
  systemInstructions: { type: String, required: false },
  model: { type: String, required: false, default: "gpt-4-turbo-preview" },
  fileSearch: { type: Boolean, required: false, default: false },
  codeInterpreter: { type: Boolean, required: false, default: false },
  functions: [{ type: Schema.Types.ObjectId, ref: "Tool" }],
  responseFormat: {
    type: String,
    required: false,
    default: "json",
    enum: ["text", "json_object", "json_schema"]
  },
  temperature: { type: Number, required: false, default: 0.9 },
  topP: {
    type: Number,
    required: false,
    default: 1.0
  },

  instructions: { type: String, required: false },
  toolResources: {
    codeInterpreter: {
      fileIds: [{ type: Schema.Types.ObjectId, ref: "File" }]
    }
  }
  // ADDITIONAL FIELDS
  // contextLength: { type: Number, required: false },
  // description: { type: String, required: false },
  // embeddingsProvider: { type: String, required: false },
  // includeProfileContext: { type: Boolean, required: false, default: false },
  // includeWorkspaceInstructions: { type: Boolean, required: false, default: false },
  // imagePath: { type: String, required: false },
  // prompt: { type: String, required: false },
  // sharing: { type: String, required: false, default: 'private' },
});

const Tool = createModel("Tool", toolSchema);
const AssistantTool = createModel("AssistantTool", assistantToolSchema);
const ChatSession = createModel("ChatSession", chatSessionSchema);
const Assistant = createModel("Assistant", assistantSchema);
const ChatMessage = createModel("ChatMessage", chatMessageSchema);
const ChatHistory = createModel("Message", chatMessageSchema);

module.exports = {
  ChatSession,
  ChatMessage,
  ChatHistory,
  Assistant,
  Tool,
  AssistantTool
  // BaseMessage,
};
