const express = require('express');
const path = require('path');
const {
  // getAllFiles,
  getAllFilesByType,
  // getStoredFilesByType,
  // getStoredFilesBySpace,
  // getStoredFileByName,
  createMessageFileItems,
  // uploadFileToStorage,
  getFileById,
  getChatFileById,
  getAssistantFileById,
  createFile,
  updateFile,
  getFileByName,
  createChatFile,
  createAssistantFile,
  getMessageFileItemsByMessageId,
  getMessagesByChatSessionId,
  getMessageById,
  createMessage,
  createMessages,
  updateMessage,
  deleteMessage,
  deleteMessagesIncludingAndAfter,
  getListFiles,
  getFile,
  getDownloads,
  downloadCustomPrompts,
  getAllStaticJsonFiles,
  addCustomPrompt,
  getAllPngFiles,
  getFileByType,
  // getStorage,
  getStaticFile,
  getStaticFilesByType,
  getAllStaticFiles,
  // uploadFileToBucket,
  // downloadFileFromBucket,
  // deleteFileFromBucket,
  // listFilesInBucket,
  // // handleFileUploadFunction,
} = require('@/controllers');
const { asyncHandler } = require('@/utils/api');
const { logger } = require('@/config/logging');
const { getDB, handleFileUpload } = require('@/db');
const { default: mongoose } = require('mongoose');
const { upsertDocs } = require('@/utils/ai/pinecone');
// const { upload } = require('@/middlewares/upload');

const router = express.Router();

// File retrieval routes
// router.get('/', asyncHandler(getAllFiles));
router.get('/type/:type', asyncHandler(getAllFilesByType));
router.get('/id/:id', asyncHandler(getFileById));
router.get('/name/:name', asyncHandler(getFileByName));
router.get('/chat/:id', asyncHandler(getChatFileById));
router.get('/assistant/:id', asyncHandler(getAssistantFileById));
router.get('/message/:messageId', asyncHandler(getMessageFileItemsByMessageId));

// File creation and update routes
router.post('/', asyncHandler(createFile));
router.post('/chat', asyncHandler(createChatFile));
router.post('/assistant', asyncHandler(createAssistantFile));
router.post('/message', asyncHandler(createMessageFileItems));
router.put('/:id', asyncHandler(updateFile));

// File upload routes
router.post('/upload', handleFileUpload);
router.post('/upsert-docs', upsertDocs);
router.get('/', async (req, res) => {
  try {
    const db = await getDB();
    // const bucket = getBucket();
    const collection = db.collection('uploads.files');

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const files = await collection.find({}).skip(skip).limit(limit).toArray();
    const total = await collection.countDocuments();

    if (!files || files.length === 0) {
      return res.json({ files: [], total: 0, page, limit });
    }

    const fileList = files.map((file) => ({
      id: file._id.toString(),
      _id: file._id.toString(),
      workspaceId: file.metadata.workspaceId,
      folderId: file.metadata.folderId,
      filename: file.filename,
      contentType: file.contentType,
      size: file.length,
      uploadDate: file.uploadDate,
      metadata: file.metadata,
      url: `/api/files/${file._id}/download`,
    }));

    return res.json({
      message: 'Files fetched successfully',
      files: fileList,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    logger.error(`Error fetching files: ${error.message}`);
    res.status(500).json({ error: 'Error fetching files', message: error.message });
  }
});
router.get('/type/:fileType', async (req, res) => {
  try {
    const db = await getDB();
    // const bucket = getBucket();
    const collection = db.collection('uploads.files');

    const fileType = req.params.fileType;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const query = { contentType: new RegExp(fileType, 'i') };
    const files = await collection.find(query).skip(skip).limit(limit).toArray();
    const total = await collection.countDocuments(query);

    if (!files || files.length === 0) {
      return res.json({ files: [], total: 0, page, limit });
    }

    const fileList = files.map((file) => ({
      id: file._id.toString(),
      filename: file.filename,
      contentType: file.contentType,
      size: file.length,
      uploadDate: file.uploadDate,
      metadata: file.metadata,
      url: `/api/files/${file._id}/download`,
    }));

    return res.json({
      message: `Files of type ${fileType} fetched successfully`,
      files: fileList,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    logger.error(`Error fetching files by type: ${error.message}`);
    res.status(500).json({ error: 'Error fetching files by type', message: error.message });
  }
});
router.get('/name/:fileName', async (req, res) => {
  try {
    const db = await getDB();
    // const bucket = getBucket();
    const collection = db.collection('uploads.files');

    const fileName = req.params.fileName;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const query = { filename: new RegExp(fileName, 'i') };
    const files = await collection.find(query).skip(skip).limit(limit).toArray();
    const total = await collection.countDocuments(query);

    if (!files || files.length === 0) {
      return res.json({ files: [], total: 0, page, limit });
    }

    const fileList = files.map((file) => ({
      id: file._id.toString(),
      filename: file.filename,
      contentType: file.contentType,
      size: file.length,
      uploadDate: file.uploadDate,
      metadata: file.metadata,
      url: `/api/files/${file._id}/download`,
    }));

    return res.json({
      message: `Files with name containing '${fileName}' fetched successfully`,
      files: fileList,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    logger.error(`Error fetching files by name: ${error.message}`);
    res.status(500).json({ error: 'Error fetching files by name', message: error.message });
  }
});
router.get('/space/:space', async (req, res) => {
  try {
    const db = await getDB();
    // const bucket = getBucket();
    const collection = db.collection('uploads.files');

    const space = req.params.space;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const query = { 'metadata.space': space };
    const files = await collection.find(query).skip(skip).limit(limit).toArray();
    const total = await collection.countDocuments(query);

    if (!files || files.length === 0) {
      return res.json({ files: [], total: 0, page, limit });
    }

    const fileList = files.map((file) => ({
      id: file._id.toString(),
      filename: file.filename,
      contentType: file.contentType,
      size: file.length,
      uploadDate: file.uploadDate,
      metadata: file.metadata,
      url: `/api/files/${file._id}/download`,
    }));

    return res.json({
      message: `Files in space '${space}' fetched successfully`,
      files: fileList,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    logger.error(`Error fetching files by space: ${error.message}`);
    res.status(500).json({ error: 'Error fetching files by space', message: error.message });
  }
});
router.get(
  '/:id/stream',
  asyncHandler(async (req, res) => {
    const fileId = req.params.id;

    try {
      const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
        bucketName: 'uploads',
      });

      const file = await bucket.find({ _id: mongoose.Types.ObjectId(fileId) }).toArray();

      if (!file || file.length === 0) {
        return res.status(404).json({ error: 'File not found' });
      }

      res.set('Content-Type', file[0].contentType);

      const readStream = bucket.openDownloadStream(mongoose.Types.ObjectId(fileId));

      readStream.on('error', (err) => {
        return res.status(500).json({ error: `Error streaming file: ${err.message}` });
      });

      readStream.pipe(res);
    } catch (error) {
      logger.error(`Error streaming file: ${error.message}`);
      res.status(500).json({ error: 'Error streaming file' });
    }
  })
);
// Route for downloading files
router.get(
  '/:id/download',
  asyncHandler(async (req, res) => {
    const fileId = req.params.id;

    try {
      const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
        bucketName: 'uploads',
      });

      const file = await bucket.find({ _id: mongoose.Types.ObjectId(fileId) }).toArray();

      if (!file || file.length === 0) {
        return res.status(404).json({ error: 'File not found' });
      }

      res.set({
        'Content-Type': file[0].contentType,
        'Content-Disposition': `attachment; filename="${file[0].filename}"`,
      });

      const downloadStream = bucket.openDownloadStream(mongoose.Types.ObjectId(fileId));

      downloadStream.on('error', (err) => {
        return res.status(500).json({ error: `Error downloading file: ${err.message}` });
      });

      downloadStream.pipe(res);
    } catch (error) {
      logger.error(`Error downloading file: ${error.message}`);
      res.status(500).json({ error: 'Error downloading file' });
    }
  })
);

// Message routes
router.get('/messages/session/:sessionId', asyncHandler(getMessagesByChatSessionId));
router.get('/messages/:id', asyncHandler(getMessageById));
router.post('/messages', asyncHandler(createMessage));
router.post('/messages/bulk', asyncHandler(createMessages));
router.put('/messages/:id', asyncHandler(updateMessage));
router.delete('/messages/:id', asyncHandler(deleteMessage));
router.delete('/messages', asyncHandler(deleteMessagesIncludingAndAfter));

// Static file routes
// Route to get image by name
router.get('/images/:imageName', (req, res) => {
  try {
    const imageName = req.params.imageName;
    const imagePath = path.join(__dirname, '../../../public/static/images', imageName);
    res.sendFile(imagePath, (err) => {
      if (err) {
        console.log(`Error fetching image: ${err}`);
        res.status(404).json({ message: 'Image not found' });
      }
    });
  } catch (error) {
    logger.error(`Error fetching image: ${error.message}`);
    res.status(500).json({ error: 'Error fetching image', message: error.message });
  }
});
router.post('/images/:imageName', (req, res) => {
  const imageName = req.params.imageName;
  const imagePath = path.join(__dirname, '../../../public/static/images', imageName);

  res.sendFile(imagePath, (err) => {
    if (err) {
      console.log(`Error fetching image: ${err}`);
      res.status(404).json({ message: 'Image not found' });
    }
  });
});

router.get('/downloads/:filename', asyncHandler(getDownloads));
router.get('/downloads/custom-prompts', asyncHandler(downloadCustomPrompts));
// app.use('/static', express.static(path.join(__dirname, 'public/static/images')));
router.get('/static/list', asyncHandler(getListFiles));
router.get('/static/:filePath', asyncHandler(getFile));
router.get('/static/json/all', asyncHandler(getAllStaticJsonFiles));
router.post('/static/custom-prompts', asyncHandler(addCustomPrompt));
router.get('/static/png/all', asyncHandler(getAllPngFiles));
router.get('/static/:type', asyncHandler(getFileByType));
router.get('/static/:filename', asyncHandler(getStaticFile));
router.get('/static/list/:filetype', asyncHandler(getStaticFilesByType));
// router.get('/static/list', asyncHandler(getAllStaticFiles));

module.exports = router;
