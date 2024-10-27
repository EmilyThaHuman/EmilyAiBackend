const { getBucket } = require("./connect");
const { logger } = require("@config/logging");

/**
 * Deletes a file from GridFS.
 * @async
 * @function deleteFile
 * @param {string} filename - The name of the file to delete
 */
const deleteFile = async (filename) => {
  try {
    const bucket = getBucket();
    const file = await bucket.find({ filename }).toArray();
    if (!file.length) {
      throw new Error("File not found");
    }
    await bucket.delete(file[0]._id);
    logger.info(`File deleted: ${filename}`);
  } catch (error) {
    logger.error(`Error deleting file: ${error.message}`);
    throw error;
  }
};

/**
 * Filters files based on allowed types.
 * @function fileFilter
 * @param {Object} req - Express request object
 * @param {Object} file - File object
 * @param {function} cb - Callback function
 */
const fileFilter = (req, file, cb) => {
  const allowedTypes = [".txt", ".pdf", ".doc", ".docx"];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type. Only txt, pdf, doc, and docx are allowed."));
  }
};

module.exports = {
  deleteFile,
  fileFilter
};
