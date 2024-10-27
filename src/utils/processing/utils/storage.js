const fs = require("fs");
const path = require("path");
const fs = require("fs");
const path = require("path");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const uploadFile = async (file, payload) => {
  const SIZE_LIMIT = parseInt(process.env.FILE_SIZE_LIMIT || "10000000");

  if (file.size > SIZE_LIMIT) {
    throw new Error(`File must be less than ${Math.floor(SIZE_LIMIT / 1000000)}MB`);
  }

  const filePath = path.join(
    __dirname,
    "..",
    "..",
    "uploads",
    payload.user_id,
    Buffer.from(payload.file_id).toString("base64")
  );

  // Ensure the directory exists
  fs.mkdirSync(path.dirname(filePath), { recursive: true });

  // Move the file to the destination
  fs.renameSync(file.path, filePath);

  return filePath;
};

const deleteFileFromStorage = async (filePath) => {
  try {
    fs.unlinkSync(filePath);
    return true;
  } catch (error) {
    throw new Error("Failed to remove file!");
  }
};

const getFileFromStorage = async (filePath) => {
  try {
    // Generate a signed URL (JWT token)
    const token = jwt.sign({ filePath }, process.env.JWT_SECRET, { expiresIn: "24h" });
    const signedUrl = `http://localhost:${process.env.PORT}/api/files/download?token=${token}`;
    return signedUrl;
  } catch (error) {
    throw new Error("Error generating signed URL");
  }
};

const uploadFile = async (filePath, options) => {
  try {
    // Define the storage path
    const storagePath = path.join(
      __dirname,
      "..",
      "..",
      "uploads",
      options.user_id.toString(),
      options.file_id.toString()
    );

    // Ensure the directory exists
    fs.mkdirSync(storagePath, { recursive: true });

    // Define the destination path
    const destination = path.join(storagePath, options.name);

    // Copy the file to the destination
    fs.copyFileSync(filePath, destination);

    // Return the relative path
    return destination;
  } catch (error) {
    throw new Error(error.message);
  }
};

module.exports = {
  uploadFile
};
