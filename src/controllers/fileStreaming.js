// src/controllers/fileStreamingController.js

const fs = require("node:fs");
const path = require("path");
const {
  calculateRange,
  createPartialContentHeaders,
  createFullContentHeaders
} = require("@utils/processing/utils/http");
const { logger } = require("@config/logging");

/**
 * Handles file streaming with support for range requests.
 * @param {object} req - The Express request object.
 * @param {object} res - The Express response object.
 */
const handleFileStreaming = (req, res) => {
  const filePath = path.join(__dirname, "../../public/uploads", req.body.fileName);

  fs.stat(filePath, (err, stat) => {
    if (err) {
      logger.error(`File not found: ${filePath}`);
      res.status(404).send("File not found");
      return;
    }

    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      const { start, end, chunksize } = calculateRange(range, fileSize);
      const file = fs.createReadStream(filePath, { start, end });
      res.writeHead(206, createPartialContentHeaders(start, end, fileSize, chunksize));
      file.pipe(res);
    } else {
      res.writeHead(200, createFullContentHeaders(fileSize));
      fs.createReadStream(filePath).pipe(res);
    }
  });
};

module.exports = {
  handleFileStreaming
};
