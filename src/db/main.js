const mongoose = require('mongoose');
const multer = require('multer');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const { logger } = require('@/config/logging');
const { getEnv } = require('@/utils/api');
// eslint-disable-next-line no-unused-vars
const { File } = require('@/models');
const { GridFSBucket } = require('mongodb');

let bucket;
let connectionPool;

/**
 * Connect to MongoDB and initialize GridFS bucket.
 * @async
 * @function connectDB
 */
const connectDB = async () => {
  try {
    if (!connectionPool) {
      const connectionString = getEnv('MONGODB_URI');
      logger.info(`[1] MongoDb Connection String Valid --> ${connectionString}`);
      const connection = await mongoose.connect(connectionString);
      logger.info(`[2] MongoDb Connection Secured --> ${connection}`);
      connectionPool = await mongoose.connect(connectionString, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        poolSize: 10, // Adjust based on your needs
      });
      // const db = mongoose.connection.db;
      logger.info(`[3] MongoDb Accessed --> ${connectionPool.connection.db}`);
      bucket = new GridFSBucket(connectionPool.connection.db, { bucketName: 'uploads' });
      logger.info(`[4] GridFS bucket initialized successfully Connection Valid --> ${storage}`);
    }
    return connectionPool.connection.db;
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
  upload.single('file')(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      logger.error(`Multer error: ${err.message}`);
      return res.status(400).json({ error: `File upload error: ${err.message}` });
    } else if (err) {
      logger.error(`Unknown error: ${err.message}`);
      return res.status(500).json({ error: 'An unknown error occurred during file upload' });
    }

    if (!req.file) {
      logger.warn('No file uploaded');
      return res.status(400).json({ error: 'No file uploaded' });
    }

    try {
      const { workspaceId, userId, folderId, space } = req.body;

      // Validate required fields
      if (!workspaceId || !userId) {
        logger.warn('Missing required fields');
        return res.status(400).json({ error: 'workspaceId and userId are required' });
      }

      const fileData = req.file.buffer;
      if (!fileData || fileData.length === 0) {
        logger.warn('Empty file uploaded');
        return res.status(400).json({ error: 'Empty file uploaded' });
      }

      const ext = path.extname(req.file.originalname).toLowerCase();
      const filename = crypto.randomBytes(16).toString('hex') + ext;

      // Determine the file type based on the extension or default to 'txt'
      let fileType = ext.slice(1) || 'txt'; // Default to 'txt' if no extension

      const publicUploadPath = path.join('public', 'uploads', filename);
      fs.writeFileSync(publicUploadPath, fileData);

      const uploadStream = bucket.openUploadStream(filename, {
        contentType: req.file.mimetype,
        metadata: {
          workspaceId,
          userId,
          folderId,
          originalName: req.file.originalname,
          uploadDate: new Date(),
          space,
        },
      });

      uploadStream.end(fileData);

      uploadStream.on('finish', async () => {
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
              space,
            },
          });

          await newFile.save();

          try {
            await updateRelatedDocuments(newFile);
          } catch (updateError) {
            logger.error(`Error updating related documents: ${updateError.message}`);
            // Consider whether to fail the whole operation or just log the error
          }

          res.json({
            message: 'File uploaded and associated successfully',
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
                lastModified: new Date(),
              },
            },
          });
        } catch (saveError) {
          logger.error(`Error saving file metadata: ${saveError.message}`);
          // If metadata save fails, we should delete the uploaded file from GridFS
          await bucket.delete(uploadStream.id);
          return res
            .status(500)
            .json({ error: 'Error saving file metadata', details: saveError.message });
        }
      });

      uploadStream.on('error', (error) => {
        logger.error(`Error in file upload stream: ${error.message}`);
        res.status(500).json({ error: 'Internal server error during file upload' });
      });
    } catch (error) {
      logger.error(`Unexpected error in file upload handler: ${error.message}`);
      res
        .status(500)
        .json({ error: 'Unexpected error during file upload process', details: error.message });
    }
  });
};

/**
 * Updates related documents in the workspace, folder, and user.
 * @async
 * @function updateRelatedDocuments
 */
const updateRelatedDocuments = async (file) => {
  try {
    const bulkOps = [
      { updateOne: { filter: { _id: file.workspaceId }, update: { $push: { files: file._id } } } },
      { updateOne: { filter: { _id: file.userId }, update: { $push: { files: file._id } } } },
    ];

    if (file.folderId) {
      bulkOps.push({
        updateOne: { filter: { _id: file.folderId }, update: { $push: { files: file._id } } },
      });
    }

    await mongoose.connection.db.collection('workspaces').bulkWrite(bulkOps);
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
  const allowedTypes = ['.txt', '.pdf', '.doc', '.docx'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only txt, pdf, doc, and docx are allowed.'));
  }
};
// const handleFileUpload = (req, res) => {
//   upload.single('file')(req, res, (err) => {
//     if (err) {
//       logger.error(`File upload error: ${err.message}`);
//       return res.status(500).json({ error: 'File upload failed' });
//     }

//     if (!req.file) {
//       return res.status(400).json({ error: 'No file uploaded' });
//     }

//     const fileData = {
//       id: req.file.id,
//       filename: req.file.filename,
//       metadata: req.file.metadata,
//     };

//     logger.info(`File uploaded successfully: ${JSON.stringify(fileData)}`);
//     res.status(200).json({ message: 'File uploaded successfully', file: fileData });
//   });
// };
/**
 * Handles errors during file upload.
 * @function handleUploadError
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {function} next - Next middleware function
 */
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    logger.error(`Multer error: ${err.message}`);
    return res.status(400).json({ error: err.message });
  } else if (err) {
    logger.error(`Upload error: ${err.message}`);
    return res.status(500).json({ error: err.message });
  }
  next();
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
const getBucket = () => {
  if (!bucket) {
    throw new Error(
      'GridFS bucket has not been initialized. Please connect to the database first.'
    );
  }
  return bucket;
};
const getStorage = () => {
  return storage;
};

/**
 * Closes the MongoDB connection.
 * @async
 * @function disconnectDB
 * @throws {Error} If disconnection fails
 */
const disconnectDB = async () => {
  try {
    await mongoose.connection.close();
    logger.info('MongoDB connection closed');
  } catch (error) {
    logger.error(`Error closing MongoDB connection: ${error.message}`);
    throw error;
  }
};

/**
 * Streams a file from GridFS to the response.
 * @function streamFile
 */
const streamFile = (filename, res) => {
  const readstream = bucket.openDownloadStreamByName(filename);
  readstream.on('error', (err) => {
    logger.error(`Error streaming file: ${err.message}`);
    res.status(404).json({ error: 'File not found' });
  });
  readstream.pipe(res);
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
      throw new Error('File not found');
    }
    await bucket.delete(file[0]._id);
    logger.info(`File deleted: ${filename}`);
  } catch (error) {
    logger.error(`Error deleting file: ${error.message}`);
    throw error;
  }
};

module.exports = {
  connectDB,
  getDB,
  getBucket,
  disconnectDB,
  upload,
  handleUploadError,
  streamFile,
  deleteFile,
  getStorage,
  updateRelatedDocuments,
  handleFileUpload,
  fileFilter,
  // client,
};
