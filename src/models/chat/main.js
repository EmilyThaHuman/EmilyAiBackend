const mongoose = require('mongoose');
const { Schema } = mongoose;
const { logger } = require('@/config/logging');
const { createSchema, createModel } = require('../utils/schema');
// =============================
// [MESSAGES] content, role, files, sessionId
// =============================
const chatMessageSchema = createSchema({
  // -- RELATIONSHIPS
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  sessionId: { type: Schema.Types.ObjectId, ref: 'ChatSession' },
  assistantId: { type: Schema.Types.ObjectId, ref: 'Assistant' },
  files: [{ type: Schema.Types.ObjectId, ref: 'File' }],

  // -- REQUIRED FIELDS
  content: { type: String, required: false, maxlength: 1000000 },
  code: { type: String, required: false, maxlength: 1000000 },
  imagePaths: [{ type: String }],
  model: { type: String },
  role: {
    type: String,
    required: false,
    enum: ['system', 'user', 'assistant', 'function', 'tool'],
  },
  sequenceNumber: Number,

  // -- ADDITIONAL FIELDS
  type: String,
  data: {
    content: String,
    additional_kwargs: {},
  },
  summary: {
    type: mongoose.Schema.Types.Mixed, // Allows storing any data type, including objects
    required: false,
  },
  tokens: { type: Number, required: false },
  localEmbedding: String,
  openaiEmbedding: String,
  sharing: String,
  metadata: {
    type: mongoose.Schema.Types.Mixed,
  },

  // metadata: {
  //   type: Map,
  //   of: Schema.Types.Mixed,
  //   default: {
  //     createdAt: Date.now(),
  //     updatedAt: Date.now(),
  //     sessionId: String,
  //     assistantId: String,
  //     files: [],
  //     content: '',
  //   },
  // },
});
chatMessageSchema.index({ sessionId: 1, createdAt: 1 });

chatMessageSchema.pre('save', async function (next) {
  if (this.isNew) {
    const existingMessage = await this.constructor.findOne({ content: this.content });
    if (existingMessage) {
      return next(new Error('A message with this content already exists'));
    }
    this.tokens = this.content.split(' ').length; // Simplified token calculation
  }
  next();
});
chatMessageSchema.statics.createMessage = async function (messageData) {
  const message = new this(messageData);
  await message.save();
  return message;
};
chatMessageSchema.statics.getMessagesBySession = async function (sessionId, limit = 50, skip = 0) {
  return this.find({ sessionId }).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('files');
};
chatMessageSchema.methods.updateContent = async function (newContent) {
  this.content = newContent;
  this.updatedAt = Date.now();
  return this.save();
};
chatMessageSchema.methods.generateSummary = async function () {
  // Implement logic to generate summary, possibly using an AI service
  // This is a placeholder implementation
  this.summary = this.content.substring(0, 100) + '...';
  return this.save();
};
chatMessageSchema.methods.calculateTokens = function () {
  this.tokens = this.content.split(' ').length;
  return this.save();
};

chatMessageSchema.pre('save', async function (next) {
  if (this.isNew) {
    const existingMessage = await this.constructor.findOne({ content: this.content });
    if (existingMessage) {
      return next(new Error('A message with this content already exists'));
    }

    await mongoose
      .model('ChatSession')
      .findByIdAndUpdate(
        this.sessionId,
        { $push: { messages: this._id } },
        { new: true, useFindAndModify: false }
      );
  }
  this.updatedAt = Date.now();
  next();
});

chatMessageSchema.pre('findOneAndUpdate', async function (next) {
  const update = this.getUpdate();
  if (update.content) {
    const existingMessage = await this.model.findOne({
      content: update.content,
      _id: { $ne: this.getQuery()._id },
    });
    if (existingMessage) {
      return next(new Error('A message with this content already exists'));
    }
  }
  next();
});
// I need you to fix and optimize my Rag Chat Bot App's History/Session/Message saving logic. The way I want it to would is after a messagge gets added and saved, that message should have its _id value pushed into chatSession.messages which is an array of refIds each of which connects to a saved message. Below is my custom chatsession model for reference:
// =============================
// [CHAT SESSIONS]
// =============================
const chatSessionSchema = createSchema({
  // -- RELATIONSHIPS (REQUIRED)
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace' },

  // -- RELATIONSHIPS (OPTIONAL)
  folderId: { type: Schema.Types.ObjectId, ref: 'Folder' },
  assistantId: { type: Schema.Types.ObjectId, ref: 'Assistant' },

  // -- REQUIRED FIELDS
  embeddingsProvider: { type: String, required: false },
  contextLength: { type: Number, required: false },
  includeProfileContext: { type: Boolean, required: false, default: false },
  includeWorkspaceInstructions: { type: Boolean, required: false, default: false },
  model: { type: String, required: false, default: 'gpt-4-turbo-preview' },
  name: { type: String, required: false, default: 'Default Chat Session' },
  prompt: { type: String, required: false },

  systemPrompt: { type: Schema.Types.ObjectId, ref: 'Prompt' },
  tools: [{ type: Schema.Types.ObjectId, ref: 'Tool' }],
  messages: [
    {
      type: Schema.Types.ObjectId,
      ref: 'ChatMessage',
    },
  ],
  history: [{ type: Schema.Types.ObjectId, ref: 'Message' }],
  files: [{ type: Schema.Types.ObjectId, ref: 'File' }],

  // -- EXPERIMENTAL FIELDS --
  promptHistory: { type: Array, required: false },
  completionHistory: { type: Array, required: false },

  topic: { type: String, required: false, default: 'No Topic' },
  active: { type: Boolean, required: false, default: true },
  summary: {
    type: mongoose.Schema.Types.Mixed, // Allows storing any data type, including objects
    required: false,
  },
  stats: {
    tokenUsage: { type: Number, default: 0 },
    messageCount: { type: Number, default: 0 },
  },
  apiKey: { type: String, required: false },
  settings: {
    type: Map,
    of: Schema.Types.Mixed,
    default: {
      contextCount: 15,
      maxTokens: 2000, // max length of the completion
      temperature: 0.7,
      model: 'gpt-4-1106-preview',
      topP: 1,
      n: 4,
      debug: false,
      summarizeMode: false,
    },
  },
  langChainSettings: {
    type: Map,
    of: Schema.Types.Mixed,
    default: {
      maxTokens: 2000, // max length of the completion
      temperature: 0.7,
      modelName: '',
      // streamUsage: true,
      streaming: true,
      openAIApiKey: '',
      organization: 'reed_tha_human',
      tools: [
        {
          type: 'function',
          function: {
            name: 'summarize_messages',
            description:
              'Summarize a list of chat messages with an overall summary and individual message summaries including their IDs',
            parameters: {
              type: 'object',
              properties: {
                overallSummary: {
                  type: 'string',
                  description: 'An overall summary of the chat messages',
                },
                individualSummaries: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: {
                        type: 'string',
                        description: 'The ID of the chat message',
                      },
                      summary: {
                        type: 'string',
                        description: 'A summary of the individual chat message',
                      },
                    },
                    required: ['id', 'summary'],
                  },
                },
              },
              required: ['overallSummary', 'individualSummaries'],
            },
          },
        },
        {
          type: 'function',
          function: {
            name: 'fetchSearchResults',
            description:
              'Fetch search results for a given query using SERP API used to aid in being  PRIVATE INVESTIGATOR',
            parameters: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'Query string to search for',
                },
              },
              required: ['query'],
            },
          },
        },
      ],
      code_interpreter: 'auto',
      function_call: 'auto',
    },
  },
  tuning: {
    type: Map,
    of: Schema.Types.Mixed,
    default: {
      debug: { type: Boolean, required: false },
      summary: { type: String, required: false },
      summarizeMode: { type: Boolean, required: false },
    },
  },
  activeSessionId: { type: String, required: false },
});
chatSessionSchema.index({ userId: 1, workspaceId: 1 });

chatSessionSchema.statics.createSession = async function (sessionData) {
  const session = new this(sessionData);
  await session.save();
  return session;
};
// [ChatHistory][Function 1] Add ChatMessage
chatSessionSchema.methods.addMessage = async function (messageData) {
  const newMessage = await ChatMessage.create({ ...messageData, sessionId: this._id });
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
    .populate('files');
};
chatSessionSchema.methods.updateSettings = async function (newSettings) {
  this.settings = { ...this.settings, ...newSettings };
  return this.save();
};
chatSessionSchema.methods.calculateTokenUsage = async function () {
  const messages = await this.model('ChatMessage').find({ sessionId: this._id });
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
chatSessionSchema.pre('save', async function (next) {
  this.updatedAt = Date.now();
  if (this.isNew) {
    let uniqueName = this.name;
    let counter = 1;
    const originalName = this.name;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      try {
        const existingSession = await this.constructor.findOne({
          userId: this.userId,
          workspaceId: this.workspaceId,
          name: uniqueName,
        });
        if (!existingSession) {
          this.name = uniqueName;
          break;
        }
        uniqueName = `${originalName} (${counter})`;
        counter++;
      } catch (error) {
        return next(error);
      }
    }
  }
  next();
});
// =============================
// [ASSISTANTS / TOOLS]
// =============================
const toolSchema = createSchema({
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace' },
  sessionId: { type: Schema.Types.ObjectId, ref: 'ChatSession' },
  folderId: { type: Schema.Types.ObjectId, ref: 'Folder' },
  assistantId: { type: Schema.Types.ObjectId, ref: 'Assistant' },
  name: String,
  description: String,
  url: String,
  schema: Schema.Types.Mixed,
  customHeaders: Schema.Types.Mixed,
  sharing: String,
  defaultSchema: {
    type: Object,
    required: false,
    default: {
      type: 'function',
      function: {
        name: '',
        description: '',
        parameters: {
          type: 'object',
          properties: {
            /* -- input properties -- */
          },
          required: [
            /* -- input required properties -- */
          ],
        },
      },
    },
  },
});
toolSchema.pre('save', async function (next) {
  logger.info('Tool pre-save hook');
  this.updatedAt = Date.now();

  next();
});
const assistantToolSchema = createSchema({
  toolId: { type: Schema.Types.ObjectId, ref: 'Tool' },
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
});
const assistantSchema = createSchema({
  // -- RELATIONSHIPS (REQUIRED)
  userId: { type: Schema.Types.ObjectId, ref: 'User' },

  // -- RELATIONSHIPS (OPTIONAL)
  workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace' },
  folderId: { type: Schema.Types.ObjectId, ref: 'Folder' },

  // REQUIRED FIELDS
  contextLength: { type: Number, required: false },
  description: { type: String, required: false },
  embeddingsProvider: { type: String, required: false },
  includeProfileContext: { type: Boolean, required: false, default: false },
  includeWorkspaceInstructions: { type: Boolean, required: false, default: false },
  model: { type: String, required: false, default: 'gpt-4-turbo-preview' },
  name: { type: String, required: false, default: 'Default Chat Assistant' },
  imagePath: { type: String, required: false },
  prompt: { type: String, required: false },

  // ADDITIONALS FIELDS
  sharing: { type: String, required: false, default: 'private' },
  instructions: { type: String, required: false },
  tools: [{ type: Schema.Types.ObjectId, ref: 'Tool' }],
  toolResources: {
    codeInterpreter: {
      fileIds: [{ type: Schema.Types.ObjectId, ref: 'File' }],
    },
  },
  temperature: { type: Number, required: false, default: 0.9 },
  topP: {
    type: Number,
    required: false,
    default: 1.0,
  },
  responseFormat: {
    type: String,
    required: false,
    default: 'json',
  },
});

const Tool = createModel('Tool', toolSchema);
const AssistantTool = createModel('AssistantTool', assistantToolSchema);
const ChatSession = createModel('ChatSession', chatSessionSchema);
const Assistant = createModel('Assistant', assistantSchema);
const ChatMessage = createModel('ChatMessage', chatMessageSchema);
const ChatHistory = createModel('Message', chatMessageSchema);

module.exports = {
  ChatSession,
  ChatMessage,
  ChatHistory,
  Assistant,
  Tool,
  AssistantTool,
  // BaseMessage,
};
