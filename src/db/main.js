const mongoose = require("mongoose");
const multer = require("multer");
const crypto = require("crypto");
const path = require("path");
const fs = require("node:fs/promises");
const { logger } = require("@config/logging");
const { getEnv } = require("@utils/api");
const { File } = require("@models/chat");
const { Workspace, Folder } = require("@models/workspace");
const { User } = require("@models/user");

let bucket;
let chatgpt;

const loadChatGPT = async () => {
  if (!chatgpt) {
    const { ChatGPTAPI } = await import("chatgpt");
    chatgpt = new ChatGPTAPI({
      apiKey: getEnv("OPENAI_API_PROJECT_KEY")
    });
  }
};

/**
 * Connect to MongoDB and initialize GridFS bucket using Mongoose.
 * @async
 * @function connectDB
 * @returns {Promise<{db: Db, bucket: GridFSBucket, client: MongoClient}>} The MongoDB client instance
 */
const connectDB = async () => {
  try {
    loadChatGPT();
    if (mongoose.connection.readyState !== 1) {
      const connectionString = getEnv("MONGODB_URI") || "mongodb://localhost:27017/test";
      logger.info(`[1] Attempting to connect to MongoDB: ${connectionString}`);

      // Connect to MongoDB using Mongoose
      await mongoose.connect(connectionString);
      logger.info("[2] Mongoose connection established successfully");
      mongoose.set("debug", true);
      logger.info("[2.5] Mongoose debug mode enabled");

      // Initialize GridFS bucket
      const db = mongoose.connection.db;
      bucket = new mongoose.mongo.GridFSBucket(db, { bucketName: "uploads" });
      logger.info("[3] GridFS bucket initialized successfully", {
        bucketName: "uploads"
      });
      const query = await chatgpt.sendMessage("check how much storage is left in my database");
      const results = await db.collection("orders").find(query).toArray(); // Ensure results are in an array format
      for (const result of results) {
        logger.info(`[4] Result: ${result}`);
      }
    }
    return {
      db: mongoose.connection.db,
      bucket,
      client: mongoose.connection.getClient()
    };
  } catch (error) {
    logger.error(`MongoDB connection failed: ${error.message}`);
    throw error;
  }
};

/**
 * Configure multer for file uploads.
 * @constant
 * @type {Object}
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

      // Validate required fields
      if (!workspaceId || !userId) {
        logger.warn("Missing required fields");
        return res.status(400).json({ error: "workspaceId and userId are required" });
      }

      const fileData = req.file.buffer;
      if (!fileData || fileData.length === 0) {
        logger.warn("Empty file uploaded");
        return res.status(400).json({ error: "Empty file uploaded" });
      }

      const ext = path.extname(req.file.originalname).toLowerCase();
      const filename = crypto.randomBytes(16).toString("hex") + ext;

      // Determine the file type based on the extension or default to 'txt'
      let fileType = ext.slice(1) || "txt"; // Default to 'txt' if no extension

      const publicUploadPath = path.join("public", "uploads", filename);
      fs.writeFileSync(publicUploadPath, fileData);

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

        try {
          const newFile = new File({
            userId,
            workspaceId,
            folderId: folderId || null,
            name: req.file.originalname,
            size: req.file.size,
            filePath: `/uploads/${uploadStream.id}`,
            type: fileType, // Use the determined file type
            mimeType: req.file.mimetype,
            metadata: {
              workspaceId,
              userId,
              folderId,
              originalName: req.file.originalname,
              uploadDate: new Date(),
              space
            }
          });

          await newFile.save();

          try {
            await updateRelatedDocuments(newFile);
          } catch (updateError) {
            logger.error(`Error updating related documents: ${updateError.message}`);
            // Consider whether to fail the whole operation or just log the error
          }

          res.json({
            message: "File uploaded and associated successfully",
            file: {
              id: newFile._id,
              filename,
              originalname: req.file.originalname,
              size: req.file.size,
              workspaceId,
              userId,
              folderId: folderId || null,
              name: req.file.originalname,
              filePath: `/uploads/${uploadStream.id}`,
              type: fileType, // Use the determined file type
              metadata: {
                workspaceId,
                userId,
                folderId,
                originalName: req.file.originalname,
                uploadDate: new Date(),
                space,
                name: req.file.originalname,
                lastModified: new Date()
              }
            }
          });
        } catch (saveError) {
          logger.error(`Error saving file metadata: ${saveError.message}`);
          // If metadata save fails, we should delete the uploaded file from GridFS
          await bucket.delete(uploadStream.id);
          return res
            .status(500)
            .json({ error: "Error saving file metadata", details: saveError.message });
        }
      });

      uploadStream.on("error", (error) => {
        logger.error(`Error in file upload stream: ${error.message}`);
        res.status(500).json({ error: "Internal server error during file upload" });
      });
    } catch (error) {
      logger.error(`Unexpected error in file upload handler: ${error.message}`);
      res
        .status(500)
        .json({ error: "Unexpected error during file upload process", details: error.message });
    }
  });
};
/**
 * Deletes a file from GridFS.
 * @async
 * @function deleteFile
 */
const deleteFile = async (filename) => {
  try {
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
 * Updates related documents in the workspace, folder, and user.
 * @async
 * @function updateRelatedDocuments
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

/**
 * Gets the MongoDB connection, connecting if necessary.
 * @async
 * @function getDB
 * @returns {Object} Mongoose connection object
 */
const getDB = async () => {
  if (mongoose.connection.readyState !== 1) {
    await connectDB();
  }
  return mongoose.connection;
};
/**
 * Gets the GridFS bucket, initializing if necessary.
 * @function getBucket
 * @returns {GridFSBucket} GridFS bucket
 */
const getBucket = () => {
  if (!bucket) {
    throw new Error(
      "GridFS bucket has not been initialized. Please connect to the database first."
    );
  }
  return bucket;
};

const dbExports = {
  connectDB,
  upload,
  getDB,
  getBucket,
  deleteFile,
  updateRelatedDocuments,
  handleFileUpload,
  fileFilter
};

module.exports = {
  ...dbExports
};
module.exports.default = dbExports;

// /**
//  * Streams a file from GridFS to the response.
//  * @function streamFile
//  */
// const streamFile = (filename, res) => {
//   const readstream = bucket.openDownloadStreamByName(filename);
//   readstream.on('error', (err) => {
//     logger.error(`Error streaming file: ${err.message}`);
//     res.status(404).json({ error: 'File not found' });
//   });
//   readstream.pipe(res);
// };

// /**
//  * Connect to MongoDB and initialize GridFS bucket.
//  * @async
//  * @function connectDB
//  * @returns {Promise<MongoClient>} The MongoDB client instance
//  */
// const connectDB = async () => {
//   try {
//     if (!connection) {
//       const connectionString = getEnv('MONGODB_URI') || 'mongodb://localhost:27017/your_database';
//       logger.info(`[1] Attempting to connect to MongoDB: ${connectionString}`);

//       // Create a MongoClient with ServerApiVersion options
//       connection = new MongoClient(connectionString, {
//         serverApi: {
//           version: ServerApiVersion.v1,
//           // strict: true,
//           deprecationErrors: true,
//         },
//       });

//       // Connect the client to the server
//       await connection.connect();
//       logger.info('[2] MongoDB connection established successfully');
//       mongoose.set('debug', true);
//       logger.info('[2] Mongoose debug mode enabled');
//       // Initialize GridFS bucket
//       const db = connection.db(); // Defaults to the database specified in the connection string
//       bucket = new GridFSBucket(db, { bucketName: 'uploads' });
//       logger.info('[3] GridFS bucket initialized successfully', { bucketName: bucket.bucketName });
//     }
//     return {
//       db: connection.db(),
//       bucket,
//       client: connection,
//     };
//   } catch (error) {
//     logger.error(`MongoDB connection failed: ${error.message}`);
//     throw error;
//   }
// };
