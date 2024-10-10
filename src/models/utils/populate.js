// // /* eslint-disable node/no-missing-require */
// const mongoose = require("mongoose");
// const { User } = require("../user");
// const { logger } = require("@config/logging");

// // Enhanced error handling function
// const handleError = (error, message = "An error occurred") => {
//   logger.error(`${message}: ${error.message}`, { stack: error.stack });
//   if (process.env.NODE_ENV !== "production") {
//     console.error(`${message}:`, error);
//   }
//   throw new Error(message);
// };

// // Centralized model mapping
// const MODEL_MAP = {
//   files: "File",
//   prompts: "Prompt",
//   chatSessions: "ChatSession",
//   assistants: "Assistant",
//   tools: "Tool",
//   models: "ChatModel",
//   presets: "Preset",
//   collections: "Collection"
// };

// // Helper function to create populate objects
// const createPopulateObject = (path, nestedPopulate = null) => ({
//   path,
//   ...(nestedPopulate && { populate: nestedPopulate })
// });

// // Enhanced function to find and populate a user
// const findAndPopulateUser = async (userId) => {
//   try {
//     if (!mongoose.Types.ObjectId.isValid(userId)) {
//       throw new Error(`Invalid userId: ${userId}`);
//     }

//     const workspacePopulate = [
//       createPopulateObject("folders", {
//         path: "items",

//         model: (doc) => MODEL_MAP[doc.space] || null
//       }),
//       ...Object.keys(MODEL_MAP).map((path) => createPopulateObject(path))
//     ];

//     const user = await User.findById(userId)
//       .populate(createPopulateObject("workspaces", workspacePopulate))
//       .populate(
//         createPopulateObject("chatSessions", [
//           { path: "messages" },
//           { path: "tools" },
//           { path: "files" }
//         ])
//       )
//       .populate(Object.keys(MODEL_MAP))
//       .lean()
//       .exec();

//     if (!user) {
//       throw new Error(`User with ID ${userId} not found.`);
//     }

//     logger.info(`Successfully fetched user with ID ${userId}`);
//     return user;
//   } catch (error) {
//     handleError(error, "Error fetching user");
//   }
// };

// module.exports = { findAndPopulateUser };
// const mongoose = require("mongoose");
// const { User } = require("../user");
// const { Schema, model } = mongoose;
// const { logger } = require("@config/logging");

// // Enhanced error handling function
// function handleError(error, message = "An error occurred") {
//   logger.error(`${message}: ${error.message}`, { stack: error.stack });
//   if (process.env.NODE_ENV !== "production") {
//     console.error(`${message}:`, error);
//   }
//   throw error; // Throw the original error to preserve stack trace
// }

// // Mapping of space types to model names
// const SPACE_TO_MODEL = {
//   files: "File",
//   prompts: "Prompt",
//   chatSessions: "ChatSession",
//   assistants: "Assistant",
//   tools: "Tool",
//   models: "Model",
//   presets: "Preset",
//   collections: "Collection"
// };

// // Enhanced function to find and populate a user
// async function findAndPopulateUser(userId) {
//   if (!mongoose.Types.ObjectId.isValid(userId)) {
//     throw new Error(`Invalid userId: ${userId}`);
//   }

//   try {
//     const user = await User.findById(userId)
//       .populate({
//         path: "workspaces",
//         populate: [
//           {
//             path: "folders",
//             populate: {
//               path: "items",
//               model: (doc) => SPACE_TO_MODEL[doc.space] || null
//             }
//           },
//           ...Object.keys(SPACE_TO_MODEL).map((path) => ({ path }))
//         ]
//       })
//       .populate({
//         path: "chatSessions",
//         populate: ["messages", "tools", "files"]
//       })
//       .populate(Object.keys(SPACE_TO_MODEL))
//       .lean()
//       .exec();

//     if (!user) {
//       throw new Error(`User with ID ${userId} not found.`);
//     }

//     logger.info(`Successfully fetched user with ID ${userId}`);
//     return user;
//   } catch (error) {
//     handleError(error, `Error fetching user with ID ${userId}`);
//   }
// }

// module.exports = { findAndPopulateUser };
const mongoose = require("mongoose");
const { User } = require("../user");
const { logger } = require("@config/logging");

// Enhanced error handling function to log and handle errors more effectively
function handleError(error, message = "An error occurred") {
  logger.error(`${message}: ${error.message}`, { stack: error.stack });
  if (process.env.NODE_ENV !== "production") {
    logger.error(`${message}:`, error); // For local development debugging
  }
  throw new Error(message); // Re-throw the error to be handled upstream
}

async function populateUserFolders(userId) {
  try {
    // Fetch and populate the user document with nested workspace and folder items, and dynamic fields
    logger.info(`Populating user folders for userId: ${userId}`);
    const user = await User.findById(userId)
      .populate({
        path: "workspaces", // Populating each workspace in the workspaces array
        populate: {
          // Nested populate for the folders within each workspace
          path: "folders",
          populate: [
            // {
            //   path: "items",
            //   model: function (doc) {
            //     logger.info(`[DOC] ${doc.space}`);
            //     return doc.space;
            //   }
            // }, // Dynamic ref population
            { path: "files", model: "File" },
            { path: "prompts", model: "Prompt" },
            { path: "chatSessions", model: "ChatSession" },
            { path: "assistants", model: "Assistant" },
            { path: "tools", model: "Tool" },
            { path: "models", model: "ChatModel" },
            { path: "presets", model: "Preset" },
            { path: "collections", model: "Collection" }
          ]
        }
      })
      .exec();

    if (!user) {
      throw new Error("User not found");
    }

    return user;
  } catch (error) {
    logger.error(`Error populating user folders: ${error.message}`);
    throw error;
  }
}
// /**
//  * Populates the `items` and the dynamic folderType field for each folder in all workspaces of a user.
//  *
//  * @param {String} userId - The ID of the user to populate.
//  * @returns {Promise<Object>} - The populated user document.
//  */
// async function populateUserFolders(userId) {
//   // Ensure the folderTypes are defined
//   const folderTypes = [
//     "files",
//     "prompts",
//     "chatSessions",
//     "assistants",
//     "tools",
//     "models",
//     "presets",
//     "collections"
//   ];

//   // Build populate paths
//   const populatePaths = [{ path: "workspaces.folders.items", model: "Item" }];

//   // Add dynamic folderType fields to populate
//   folderTypes.forEach((type) => {
//     populatePaths.push({ path: `workspaces.folders.${type}`, model: "Item" });
//   });

//   try {
//     // Fetch and populate the user document
//     const user = await User.findById(userId).populate(populatePaths).exec();

//     if (!user) {
//       throw new Error("User not found");
//     }

//     return user;
//   } catch (error) {
//     logger.error(`Error populating user folders: ${error.message}`);
//     throw error;
//   }
// }
// Enhanced function to find and populate a user with improved error handling
async function findAndPopulateUser(userId) {
  try {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new Error(`Invalid userId: ${userId}`);
    }

    const userWithWorkspaces = await User.findById(userId)
      .populate({
        path: "workspaces",
        populate: [
          { path: "folders" },
          { path: "files" },
          { path: "chatSessions" },
          { path: "assistants" },
          { path: "prompts" },
          { path: "collections" },
          { path: "models" },
          { path: "tools" },
          { path: "presets" }
        ]
      })
      .populate({
        path: "chatSessions",
        populate: [{ path: "messages" }, { path: "tools" }, { path: "files" }]
      })
      .populate("assistants prompts files collections models tools presets")
      .exec();

    if (!userWithWorkspaces) {
      throw new Error(`User with ID ${userId} not found.`);
    }

    const userWithWorkspacesAndFolders = await populateUserFolders(userId);

    logger.info(`Successfully fetched user with ID ${userId}`);
    return userWithWorkspacesAndFolders;
  } catch (error) {
    handleError(error, "Error fetching user");
  }
}

module.exports = { findAndPopulateUser };
// .populate({
//   path: "workspaces",
//   populate: {
//     path: "folders",
//     model: "Folder",
//     populate: [
//       { path: "files" },
//       { path: "chatSessions" },
//       { path: "assistants" },
//       { path: "prompts" },
//       { path: "collections" },
//       { path: "models" },
//       { path: "tools" },
//       { path: "presets" }
//     ]
//     // model: (doc) => SPACE_TO_MODEL[doc.space] || null
//   }
//   // Populate folders within workspaces
// })
