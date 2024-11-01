// server/controllers/fileController.js
const mongoose = require("mongoose");
const Grid = require("gridfs-stream");
const multer = require("multer");
const { GridFsStorage } = require("multer-gridfs-storage");
const { config } = require("@config/index");
const { logger } = require("@config/logging");

// Initialize GridFS
let gfs, bucket;

const initGridFS = (conn) => {
  bucket = new mongoose.mongo.GridFSBucket(conn.db, {
    bucketName: "uploads",
    chunkSizeBytes: 1048576, // 1MB
    uploadOptions: {
      chunkSize: 1048576
    }
  });

  gfs = Grid(conn.db, mongoose.mongo);
  gfs.collection("uploads");
  // gfs.collection("uploads.files");

  logger.info("GridFS initialized");
};

// Create storage engine
const storage = new GridFsStorage({
  url: config.database.uri,
  file: (req, file) => {
    return {
      filename: `${Date.now()}-${file.originalname}`,
      bucketName: "uploads"
    };
  }
});

// Multer middleware with file filter
const upload = multer({
  storage,
  // fileFilter: (req, file, cb) => {
  //   // Accept images and PDFs only
  //   if (
  //     file.mimetype === "image/jpeg" ||
  //     file.mimetype === "image/png" ||
  //     file.mimetype === "application/pdf" ||
  //     file.mimetype === "text/plain"
  //   ) {
  //     cb(null, true);
  //   } else {
  //     cb(new Error("Invalid file type. Only JPEG, PNG, and PDF are allowed!"), false);
  //   }
  // },
  limits: { fileSize: 5 * 1024 * 1024 } // 5 MB limit
});

// Upload a file
const uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    res.json({ file: req.file });
  } catch (err) {
    logger.error("Error uploading file:", err);
    res.status(500).json({ error: "Server Error" });
  }
};

// Get all files
const getAllFiles = async (req, res) => {
  try {
    const files = await new Promise((resolve, reject) => {
      gfs.files.find().toArray((err, files) => {
        if (err) reject(err);
        else resolve(files);
      });
    });

    if (!files || files.length === 0) {
      return res.status(404).json({ error: "No files exist" });
    }
    res.json(files);
  } catch (err) {
    logger.error("Error fetching files:", err);
    res.status(500).json({ error: "Server Error" });
  }
};

// Get single file
const getFileById = async (req, res) => {
  let fileId;
  try {
    fileId = req.params.id;
  } catch (err) {
    return res.status(400).json({ error: "Invalid file ID format" });
  }

  try {
    const file = await new Promise((resolve, reject) => {
      gfs.files.findOne({ _id: fileId }, (err, file) => {
        if (err) reject(err);
        else resolve(file);
      });
    });

    if (!file || file.length === 0) {
      return res.status(404).json({ error: "No file exists" });
    }

    res.set("Content-Type", file.contentType);
    const readstream = bucket.openDownloadStream(fileId);
    return readstream.pipe(res);
  } catch (err) {
    logger.error("Error retrieving file:", err);
    res.status(500).json({ error: "Server Error" });
  }
};

// Download file
const downloadFile = async (req, res) => {
  let fileId;
  try {
    fileId = req.params.id;
  } catch (err) {
    return res.status(400).json({ error: "Invalid file ID format" });
  }

  try {
    const file = await new Promise((resolve, reject) => {
      gfs.files.findOne({ _id: fileId }, (err, file) => {
        if (err) reject(err);
        else resolve(file);
      });
    });

    if (!file || file.length === 0) {
      return res.status(404).json({ error: "No file exists" });
    }

    res.set("Content-Type", file.contentType);
    res.set("Content-Disposition", `attachment; filename="${file.filename}"`);
    const readstream = bucket.openDownloadStream(fileId);
    return readstream.pipe(res);
  } catch (err) {
    logger.error("Error downloading file:", err);
    res.status(500).json({ error: "Server Error" });
  }
};
/**
 * Gets the GridFS bucket, initializing if necessary.
 * @function getBucket
 * @returns {bucket}
 */
const getBucket = () => {
  if (!bucket) {
    throw new Error(
      "GridFS bucket has not been initialized. Please connect to the database first."
    );
  }
  return bucket;
};

module.exports = {
  upload,
  uploadFile,
  getAllFiles,
  getFileById,
  downloadFile,
  initGridFS,
  getBucket
};
