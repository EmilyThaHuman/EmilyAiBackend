const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const { initialUserFiles } = require("@lib/files");
const { SUPPORTED_MIME_TYPES_ABBR, ALLOWED_FILE_TYPES_ABBR } = require("@config/constants");
const { File } = require("@models/chat");
const { logger } = require("@config/logging");

const createChatSession = async (userId, workspaceId, sessionName = "New Chat Session") => {
  try {
    const sessionData = {
      userId,
      workspaceId,
      name: sessionName,
      active: true
    };
    const chatSession = await mongoose.model("ChatSession").createSession(sessionData);
    logger.info(`Chat session created successfully: ${chatSession.name}`);
    return chatSession;
  } catch (error) {
    logger.error(`Error creating chat session: ${error.message}`);
    throw new Error(`Failed to create chat session: ${error.message}`);
  }
};
const addMessageToSession = async (sessionId, userId, content, role = "user") => {
  try {
    const messageData = {
      sessionId,
      userId,
      content,
      role
    };
    const message = await mongoose.model("ChatMessage").createMessage(messageData);
    logger.info(`Message added to session ${sessionId}: ${message._id}`);
    return message;
  } catch (error) {
    logger.error(`Error adding message to session: ${error.message}`);
    throw new Error(`Failed to add message to session: ${error.message}`);
  }
};
const getChatSessionMessages = async (sessionId, limit = 50, skip = 0) => {
  try {
    const messages = await mongoose
      .model("ChatMessage")
      .getMessagesBySession(sessionId, limit, skip);
    return messages;
  } catch (error) {
    logger.error(`Error fetching messages for session ${sessionId}: ${error.message}`);
    throw new Error(`Failed to fetch messages for session: ${error.message}`);
  }
};
const createDefaultFile = () => {
  const filesToInsert = initialUserFiles.reduce((accumulator, file) => {
    const fileExtension = path.extname(file.name).substring(1).toLowerCase();

    if (!ALLOWED_FILE_TYPES_ABBR.includes(fileExtension)) {
      logger.warn(`Skipping unsupported file type: .${fileExtension}`);
      return accumulator;
    }

    const mimeType = SUPPORTED_MIME_TYPES_ABBR[fileExtension] || "application/octet-stream";

    // Get file stats
    const fileStats = fs.statSync(file.path);
    const fileSize = fileStats.size;

    // Read the raw data of the file
    const fileData = fs.readFileSync(file.path);

    const mappedFile = new File({
      _id: new mongoose.Types.ObjectId(),
      name: file.name,
      filePath: file.path,
      content: fileData.toString("utf8"), // Convert Buffer to string if needed
      size: fileSize,
      type: fileExtension,
      mimeType: mimeType,
      originalFileType: fileExtension,
      data: fileData,
      space: "files", // Adjust as needed
      metadata: {
        fileSize: fileSize,
        fileType: fileExtension,
        lastModified: fileStats.mtime
      },
      createdAt: new Date(),
      updatedAt: new Date()
    });

    accumulator.push(mappedFile);
    return accumulator;
  }, []);

  return filesToInsert;
};
const createFileWithAssociation = async (userId, workspaceId, folderId, fileData) => {
  const fileExtension = path.extname(fileData.name).substring(1).toLowerCase();

  if (!ALLOWED_FILE_TYPES_ABBR.includes(fileExtension)) {
    throw new Error(`File type .${fileExtension} is not supported.`);
  }

  const mimeType = SUPPORTED_MIME_TYPES_ABBR[fileExtension] || "application/octet-stream";

  // Assuming fileData.content is a Buffer or string of the file content
  const contentBuffer = Buffer.isBuffer(fileData.content)
    ? fileData.content
    : Buffer.from(fileData.content, "utf8");

  const fileSize = contentBuffer.length;

  const newFile = new File({
    _id: new mongoose.Types.ObjectId(),
    name: fileData.name,
    filePath: fileData.path || "", // Optional file path
    content: contentBuffer.toString("utf8"), // Convert Buffer to string if needed
    size: fileSize,
    type: fileExtension,
    mimeType: mimeType,
    originalFileType: fileExtension,
    data: contentBuffer,
    space: "files", // Adjust as needed
    metadata: {
      fileSize: fileSize,
      fileType: fileExtension,
      lastModified: new Date()
    },
    userId: userId,
    workspaceId: workspaceId,
    folderId: folderId,
    createdAt: new Date(),
    updatedAt: new Date()
  });

  try {
    await newFile.save();
    logger.info("File created successfully with associations");
    return newFile;
  } catch (error) {
    logger.error("Error creating file with associations:", error);
    throw error;
  }
};
