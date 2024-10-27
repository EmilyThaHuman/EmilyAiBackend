const multer = require("multer");
const crypto = require("crypto");
const path = require("path");
const fs = require("fs/promises");
const { logger } = require("@config/logging");
const { getBucket } = require("./connect");
const { File } = require("@models/chat");

/**
 * Configure multer for file uploads.
 */
const storage = multer.memoryStorage();
const upload = multer({ storage });

/**
 * Handle file upload and store it in GridFS.
 * @function handleFileUpload
 */
const handleFileUpload = async (req, res) => {
  upload.single("file")(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      logger.error(`Multer error: ${err.message}`);
      return res.status(400).json({ error: `File upload error: ${err.message}` });
    } else if (err) {
      logger.error(`Unknown error: ${err.message}`);
      return res.status(500).json({ error: "An unknown error occurred during file upload" });
    }

    if (!req.file) {
      logger.warn("No file uploaded");
      return res.status(400).json({ error: "No file uploaded" });
    }

    try {
      const { workspaceId, userId, folderId, space } = req.body;

      if (!workspaceId || !userId) {
        logger.warn("Missing required fields");
        return res.status(400).json({ error: "workspaceId and userId are required" });
      }

      const fileData = req.file.buffer;
      const ext = path.extname(req.file.originalname).toLowerCase();
      const filename = crypto.randomBytes(16).toString("hex") + ext;
      const bucket = getBucket();

      const uploadStream = bucket.openUploadStream(filename, {
        contentType: req.file.mimetype,
        metadata: {
          workspaceId,
          userId,
          folderId,
          originalName: req.file.originalname,
          uploadDate: new Date(),
          space
        }
      });

      uploadStream.end(fileData);

      uploadStream.on("finish", async () => {
        logger.info(`File stored in GridFS with filename: ${filename}`);

        const newFile = new File({
          userId,
          workspaceId,
          folderId: folderId || null,
          name: req.file.originalname,
          size: req.file.size,
          filePath: `/uploads/${uploadStream.id}`,
          type: ext.slice(1) || "txt",
          mimeType: req.file.mimetype
        });

        await newFile.save();

        res.json({
          message: "File uploaded and associated successfully",
          file: {
            id: newFile._id,
            filename,
            originalname: req.file.originalname,
            size: req.file.size
          }
        });
      });

      uploadStream.on("error", (error) => {
        logger.error(`Error in file upload stream: ${error.message}`);
        res.status(500).json({ error: "Internal server error during file upload" });
      });
    } catch (error) {
      logger.error(`Unexpected error in file upload handler: ${error.message}`);
      res
        .status(500)
        .json({ error: "Unexpected error during file upload", details: error.message });
    }
  });
};

module.exports = {
  upload,
  handleFileUpload
};
