const { logger } = require("@config/logging");
const { User } = require("@models/user");
const { Workspace, Folder } = require("@models/workspace");
const { Preset: ChatPreset, Tool: ChatTool, Model: ChatModel, Prompt, PromptTemplate } = require("@models/chat");
const { Collection: ChatCollection } = require("@models/main");

const createChatSettingsController = (Model, entityName, arrayRef) => {
  return {
    getAll: async (req, res) => {
      try {
        const { workspaceId } = req.params;
        let entities;

        if (workspaceId) {
          // Find the workspace and get the relevant reference array
          const workspace = await Workspace.findById(workspaceId);
          if (!workspace) {
            return res.status(404).json({ message: `Workspace not found` });
          }

          // Determine the reference array based on the entityName
          const referenceArray = workspace[arrayRef];
          if (!referenceArray) {
            return res.status(404).json({ message: `No ${entityName}s found in the workspace` });
          }

          logger.info(`Fetching ${entityName}s for workspace ${workspaceId}`);
          logger.info(`Reference array: ${referenceArray}`);
          // Fetch entities by IDs
          entities = await Model.find({ _id: { $in: referenceArray } });
        } else {
          // If no workspaceId is provided, fetch all entities
          const allEntities = await Model.find();
          // Filter out entities that are not in the reference array
          entities = allEntities.filter((entity) => referenceArray.includes(entity._id.toString()));
        }

        res.status(200).json(entities);
      } catch (error) {
        res.status(500).json({ message: `Error fetching ${entityName}s`, error: error.message });
      }
    },

    getById: async (req, res) => {
      try {
        const entity = await Model.findById(req.params.id);
        if (!entity) {
          return res.status(404).json({ message: `${entityName} not found` });
        }
        res.status(200).json(entity);
      } catch (error) {
        res.status(500).json({ message: `Error fetching ${entityName}`, error: error.message });
      }
    },
    create: async (req, res) => {
      try {
        logger.info(`Creating new ${entityName}: ${JSON.stringify(req.body)}`);
        const { userId, workspaceId, folderId, ...entityData } = req.body;

        const newEntity = new Model(entityData);
        const savedEntity = await newEntity.save();

        const updatePromises = [];

        if (userId) {
          updatePromises.push(
            User.findByIdAndUpdate(
              userId,
              { $push: { [`${entityName.toLowerCase()}s`]: savedEntity._id } },
              { new: true }
            )
          );
        }

        if (workspaceId) {
          updatePromises.push(
            Workspace.findByIdAndUpdate(
              workspaceId,
              { $push: { [`${entityName.toLowerCase()}s`]: savedEntity._id } },
              { new: true }
            )
          );
        }

        if (folderId) {
          updatePromises.push(
            Folder.findByIdAndUpdate(
              folderId,
              { $push: { [`${entityName.toLowerCase()}s`]: savedEntity._id } },
              { new: true }
            )
          );
        }

        await Promise.all(updatePromises);

        res.status(201).json({
          message: `${entityName} created successfully and associated with user, workspace, and/or folder`,
          data: savedEntity
        });
      } catch (error) {
        res.status(400).json({ message: `Error creating ${entityName}`, error: error.message });
      }
    },

    update: async (req, res) => {
      try {
        const updatedEntity = await Model.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!updatedEntity) {
          return res.status(404).json({ message: `${entityName} not found` });
        }
        res.status(200).json(updatedEntity);
      } catch (error) {
        res.status(400).json({ message: `Error updating ${entityName}`, error: error.message });
      }
    },

    delete: async (req, res) => {
      try {
        const deletedEntity = await Model.findByIdAndDelete(req.params.id);
        if (!deletedEntity) {
          return res.status(404).json({ message: `${entityName} not found` });
        }
        res.status(200).json({ message: `${entityName} deleted successfully` });
      } catch (error) {
        res.status(500).json({ message: `Error deleting ${entityName}`, error: error.message });
      }
    }
  };
};

const ChatPresetController = createChatSettingsController(ChatPreset, "Chat preset", "presets");
const ChatToolController = createChatSettingsController(ChatTool, "Chat tool", "tools");
const ChatModelController = createChatSettingsController(ChatModel, "Chat model", "models");
const ChatPromptController = createChatSettingsController(Prompt, "Prompt", "prompts");
const ChatCollectionController = createChatSettingsController(
  ChatCollection,
  "Chat collection",
  "collections"
);
const PromptTemplateController = createChatSettingsController(
  PromptTemplate,
  "Prompt template",
  "promptTemplates" // This should match the array field in your models
);

module.exports = {
  ChatPresetController,
  ChatToolController,
  ChatModelController,
  ChatPromptController,
  ChatCollectionController,
  PromptTemplateController
};
