const { Workspace, Folder, User } = require("@models/workspace");
const { logger } = require("@config/logging");

/**
 * Updates related documents in the workspace, folder, and user.
 * @async
 * @function updateRelatedDocuments
 * @param {Object} file - The file object to associate
 */
const updateRelatedDocuments = async (file) => {
  try {
    const updatePromises = [
      Workspace.findByIdAndUpdate(file.workspaceId, {
        $push: { files: file._id }
      }),
      User.findByIdAndUpdate(file.userId, { $push: { files: file._id } })
    ];

    if (file.folderId) {
      updatePromises.push(
        Folder.findByIdAndUpdate(file.folderId, {
          $push: { files: file._id }
        })
      );
    }

    await Promise.all(updatePromises);
    logger.info(`File ${file._id} association process completed.`);
  } catch (error) {
    logger.error(`Error associating file: ${error.message}`);
    throw error;
  }
};

module.exports = {
  updateRelatedDocuments
};
