// models/Assistant.js
const mongoose = require("mongoose");
const { Schema } = mongoose;
const { createSchema, createModel } = require("../utils/schema");
const { logger } = require("@config/logging");

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

assistantSchema.index({ userId: 1, workspaceId: 1 });

// Method to get only the required data
assistantSchema.statics.getRequiredData = function () {
  return {
    name: this.name,
    systemInstructions: this.systemInstructions,
    model: this.model,
    fileSearch: this.fileSearch,
    codeInterpreter: this.codeInterpreter,
    functions: this.functions,
    responseFormat: this.responseFormat,
    temperature: this.temperature,
    topP: this.topP,
    instructions: this.instructions,
    toolResources: this.toolResources
  };
};

assistantSchema.pre("save", async function (next) {
  logger.info("Assistant pre-save hook");

  if (this.isNew) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      // Check if the assistant is already in the workspace's assistants
      const workspace = await mongoose.model("Workspace").findById(this.workspaceId);
      if (!workspace.assistants.includes(this._id)) {
        // Add the assistant to the workspace's assistants
        await mongoose.model("Workspace").findByIdAndUpdate(
          this.workspaceId,
          {
            $addToSet: { assistants: this._id }
          },
          { session }
        );
      }

      await session.commitTransaction();
      session.endSession();
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      logger.error("Error in Assistant pre-save hook:", error);
      return next(error);
    }
  }
  next();
});

const Assistant = createModel("Assistant", assistantSchema);

module.exports = { Assistant };
