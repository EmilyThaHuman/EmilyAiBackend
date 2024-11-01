// server/routes/fileRoutes.js
const {
  upload,
  uploadFile,
  getAllFiles,
  getFileById,
  downloadFile
} = require("@controllers/files");
const express = require("express");
const router = express.Router();

// @route   POST /api/upload
// @desc    Uploads a file to MongoDB using GridFS
router.post("/upload", upload.single("file"), uploadFile);

// @route   GET /api/files
// @desc    Retrieves all files' metadata
router.get("/files", getAllFiles);

// @route   GET /api/files/:id
// @desc    Retrieves a single file by ID
router.get("/files/:id", getFileById);

// @route   GET /api/files/download/:id
// @desc    Downloads a file by ID
router.get("/files/download/:id", downloadFile);

module.exports = router;
