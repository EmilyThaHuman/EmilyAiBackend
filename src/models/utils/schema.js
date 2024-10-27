const mongoose = require("mongoose");
const { Schema, model } = mongoose;
const { logger } = require("@config/logging");

// Enhanced error handling function to log and handle errors more effectively
function handleError(error, message = "An error occurred") {
  logger.error(`${message}: ${error.message}`, { stack: error.stack });
  if (process.env.NODE_ENV !== "production") {
    console.error(`${message}:`, error); // For local development debugging
  }
  throw new Error(message); // Re-throw the error to be handled upstream
}

// Create the schema and model definitions
const newSnippetSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  snippet: { type: String, required: true, trim: true }
});

const commonSchemaFields = {
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date }
};

const createSchemaFields = (fields) => ({
  ...fields,
  ...commonSchemaFields
});

const createSchema = (fields, options = {}) =>
  new Schema(createSchemaFields(fields), { timestamps: true, ...options });

const createModel = (name, schema) => {
  try {
    if (!name || !schema) {
      throw new Error("Model name and schema are required to create a model.");
    }
    return model(name, schema);
  } catch (error) {
    handleError(error, `Failed to create model: ${name}`);
  }
};

const createSnippetModel = createModel("Snippet", newSnippetSchema);

module.exports = {
  createSchema,
  createModel,
  createSnippetModel
};
// .populate({

//   path: "folders",
//   populate: [
//     { path: "files" },
//     { path: "chatSessions" },
//     { path: "assistants" },
//     { path: "prompts" },
//     { path: "collections" },
//     { path: "models" },
//     { path: "tools" },
//     { path: "presets" },
//     { path: "items" }
//   ]
// })
// const mongoose = require("mongoose");
// const { User } = require("../user");
// const { Schema, model } = mongoose;
// const { logger } = require("@config/logging");

// const newSnippetSchema = new mongoose.Schema({
//   title: String,
//   snippet: String
// });
// const commonSchemaFields = {
//   createdAt: { type: Date, default: Date.now },
//   updatedAt: { type: Date }
// };
// const createSchemaFields = (fields) => ({
//   ...fields,
//   ...commonSchemaFields
// });
// const createSchema = (fields, options = {}) =>
//   new Schema(createSchemaFields(fields), { timestamps: true, ...options });
// const createModel = (name, schema) => model(name, schema);
// const createSnippetModel = createModel("Snippet", newSnippetSchema);
// // Example function to find and populate a user
// async function findAndPopulateUser(userId) {
//   try {
//     const user = await User.findById(userId)
//       .populate({
//         path: "workspaces",
//         populate: [
//           // {
//           //   path: "folders",
//           //   populate: [
//           //     // Populate both specific arrays and items in folders
//           //     { path: "files" },
//           //     { path: "prompts" },
//           //     { path: "tools" },
//           //     { path: "models" },
//           //     { path: "presets" },
//           //     { path: "assistants" },
//           //     { path: "collections" },
//           //     { path: "chatSessions" },
//           //     {
//           //       path: "items"
//           //       // Mongoose uses refPath to determine the model, so no need to specify 'model' here
//           //     }
//           //   ]
//           // },
//           { path: "folders" },
//           { path: "files" },
//           { path: "chatSessions" },
//           { path: "assistants" },
//           { path: "prompts" },
//           { path: "collections" },
//           { path: "models" },
//           { path: "tools" },
//           { path: "presets" }
//         ]
//       })
//       .populate({
//         path: "folders",
//         populate: [
//           { path: "files" },
//           { path: "chatSessions" },
//           { path: "assistants" },
//           { path: "prompts" },
//           { path: "collections" },
//           { path: "models" },
//           { path: "tools" },
//           { path: "presets" },
//           { path: "items" }
//         ]
//       })
//       .populate({
//         path: "chatSessions",
//         populate: [{ path: "messages" }, { path: "tools" }, { path: "files" }]
//       })
//       .populate("assistants")
//       .populate("prompts")
//       .populate("files")
//       .populate("collections")
//       .populate("models")
//       .populate("tools")
//       .populate("presets")
//       .exec();

//     logger.info(user);
//     return user;
//   } catch (error) {
//     logger.error("Error fetching user:", error);
//     throw error;
//   }
// }

// module.exports = {
//   createSchema,
//   createModel,
//   createSnippetModel,
//   findAndPopulateUser
// };
