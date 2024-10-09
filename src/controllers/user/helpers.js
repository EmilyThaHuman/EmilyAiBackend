/* eslint-disable no-dupe-keys */
const jwt = require('jsonwebtoken');
const { sign, verify } = jwt;
const bcrypt = require('bcrypt');
require('dotenv').config();
const { Prompt, User, File } = require('@/models');
const {
  createWorkspace,
  createFolders,
  createFile,
  createPreset,
  createAssistant,
  createChatSession,
  createPrompt,
  createCollection,
  createTool,
  createModel,
} = require('@/db/init'); // Adjust the path as needed
const { logger } = require('@/config/logging');
const { initialUserPrompts } = require('@/lib/prompts/static');
const { ValidationError, ConflictError, ServerError } = require('@/config/constants');

const validateUserInput = ({ username, email, password }) => {
  if (!username || !email || !password) {
    throw new ValidationError('All fields (username, email, password) are required');
  }
  if (password.length < 6) {
    throw new ValidationError('Password must be at least 6 characters long');
  }
};

const checkUserExists = async ({ username, email }) => {
  try {
    const userExists = await User.findOne({ $or: [{ email }, { username }] });
    if (userExists) {
      throw new ConflictError('Username or email already exists');
    }
  } catch (error) {
    logger.error('Error checking user existence:', error);
    throw error;
  }
};

const createNewUser = async ({ username, email, password }) => {
  // Generate a full default user object using the schema's static method
  const defaultUserData = User.generateDefaultUser();

  // Hash the provided password
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  // Override default user data with the specific details provided by the user
  const newUser = new User({
    ...defaultUserData,
    username,
    email,
    'auth.password': passwordHash,
  });

  await newUser.save();
  return newUser;
};

const saveInitialPrompts = async (userId, workspaceId, folderId) => {
  try {
    const promptsToSave = initialUserPrompts.map((prompt) => ({
      userId,
      workspaceId,
      folderId,
      name: prompt.name,
      content: prompt.content,
      role: 'user',
      type: prompt.type,
      sharing: prompt.sharing,
      rating: prompt.rating,
      tags: prompt.tags,
    }));

    const savedPrompts = await Prompt.insertMany(promptsToSave);
    return savedPrompts;
  } catch (error) {
    logger.error('Error saving prompts:', error);
    throw error;
  }
};
const createDefaultFile = () => {
  const filesToInsert = initialUserFiles.reduce((accumulator, file) => {
    const fileExtension = path.extname(file.name).substring(1).toLowerCase();

    if (!allowedTypes.includes(fileExtension)) {
      console.warn(`Skipping unsupported file type: .${fileExtension}`);
      return accumulator;
    }

    const mimeType = mimeTypes[fileExtension] || 'application/octet-stream';

    // Get file stats
    const fileStats = fs.statSync(file.path);
    const fileSize = fileStats.size;

    // Read the raw data of the file
    const fileData = fs.readFileSync(file.path);

    const mappedFile = new File({
      _id: new mongoose.Types.ObjectId(),
      name: file.name,
      filePath: file.path,
      content: fileData.toString('utf8'), // Convert Buffer to string if needed
      size: fileSize,
      type: fileExtension,
      mimeType: mimeType,
      originalFileType: fileExtension,
      data: fileData,
      space: 'files', // Adjust as needed
      metadata: {
        fileSize: fileSize,
        fileType: fileExtension,
        lastModified: fileStats.mtime,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    accumulator.push(mappedFile);
    return accumulator;
  }, []);

  return filesToInsert;
};

const createFileWithAssociation = async (userId, workspaceId, folderId, fileData) => {
  const fileExtension = path.extname(fileData.name).substring(1).toLowerCase();

  if (!allowedTypes.includes(fileExtension)) {
    throw new Error(`File type .${fileExtension} is not supported.`);
  }

  const mimeType = mimeTypes[fileExtension] || 'application/octet-stream';

  // Assuming fileData.content is a Buffer or string of the file content
  const contentBuffer = Buffer.isBuffer(fileData.content)
    ? fileData.content
    : Buffer.from(fileData.content, 'utf8');

  const fileSize = contentBuffer.length;

  const newFile = new File({
    _id: new mongoose.Types.ObjectId(),
    name: fileData.name,
    filePath: fileData.path || '', // Optional file path
    content: contentBuffer.toString('utf8'), // Convert Buffer to string if needed
    size: fileSize,
    type: fileExtension,
    mimeType: mimeType,
    originalFileType: fileExtension,
    data: contentBuffer,
    space: 'files', // Adjust as needed
    metadata: {
      fileSize: fileSize,
      fileType: fileExtension,
      lastModified: new Date(),
    },
    userId: userId,
    workspaceId: workspaceId,
    folderId: folderId,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  try {
    await newFile.save();
    console.log('File created successfully with associations');
    return newFile;
  } catch (error) {
    console.error('Error creating file with associations:', error);
    throw error;
  }
};

// Function to save initial files with associations
const saveInitialFiles = async (userId, workspaceId, folderId) => {
  try {
    const filesToSave = initialUserFiles
      .map((file) => {
        const fileExtension = path.extname(file.name).substring(1).toLowerCase();

        if (!allowedTypes.includes(fileExtension)) {
          console.warn(`Skipping unsupported file type: .${fileExtension}`);
          return null; // Skip unsupported files
        }

        const mimeType = mimeTypes[fileExtension] || 'application/octet-stream';

        // Read file data
        const filePath = file.path;
        const fileStats = fs.statSync(filePath);
        const fileSize = fileStats.size;
        const fileData = fs.readFileSync(filePath);

        // Determine if the file is text or binary
        const textFileTypes = ['txt', 'md', 'html', 'json', 'csv', 'tsv', 'jsx', 'js'];
        const isTextFile = textFileTypes.includes(fileExtension);
        const content = isTextFile ? fileData.toString('utf8') : null;

        return {
          userId,
          workspaceId,
          folderId,
          name: file.name,
          filePath: filePath,
          content: content, // Only store content for text files
          size: fileSize,
          type: fileExtension,
          mimeType: mimeType,
          originalFileType: fileExtension,
          data: fileData, // Raw file data as Buffer
          space: 'files',
          metadata: {
            fileSize: fileSize,
            fileType: fileExtension,
            lastModified: fileStats.mtime,
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      })
      .filter((file) => file !== null); // Remove any null entries

    const savedFiles = await File.insertMany(filesToSave);
    console.log('Initial files saved successfully');
    return savedFiles;
  } catch (error) {
    console.error('Error saving initial files:', error);
    throw error;
  }
};

const saveInitialTools = async (userId, workspaceId, folderId) => {
  try {
    const promptsToSave = initialUserPrompts.map((prompt) => ({
      userId,
      workspaceId,
      folderId,
      name: prompt.name,
      content: prompt.content,
      role: 'user',
      type: prompt.type,
      sharing: prompt.sharing,
      rating: prompt.rating,
      tags: prompt.tags,
    }));

    const savedPrompts = await Prompt.insertMany(promptsToSave);
    return savedPrompts;
  } catch (error) {
    logger.error('Error saving prompts:', error);
    throw error;
  }
};

const initializeUserData = async (newUser, accessToken, refreshToken) => {
  try {
    // Create workspace and folders
    const workspace = await createWorkspace(newUser);
    const folders = await createFolders(newUser, workspace);

    // Map folder space to folder documents
    const folderMap = {};
    folders.forEach((folder) => {
      folderMap[folder.space] = folder;
    });

    // Save initial prompts
    const promptsFolder = folderMap['prompts'];
    const savedPrompts = await saveInitialPrompts(newUser._id, workspace._id, promptsFolder._id);

    // Update user, workspace, and folder with prompts
    savedPrompts.forEach((prompt) => {
      newUser.prompts.push(prompt._id);
      workspace.prompts.push(prompt._id);
      promptsFolder.prompts.push(prompt._id);
    });

    // Create other items
    const [file, preset, prompt, collection, tool, model] = await Promise.all([
      createFile(newUser, folderMap['files']),
      createPreset(newUser, folderMap['presets']),
      createPrompt(newUser, workspace, folderMap['prompts']),
      createCollection(newUser, folderMap['collections']),
      createTool(newUser, workspace, folderMap['tools']),
      createModel(newUser, folderMap['models']),
    ]);

    const assistant = await createAssistant(newUser, folderMap['assistants'], file);
    const chatSession = await createChatSession(
      newUser,
      workspace,
      assistant,
      folderMap['chatSessions']
    );

    // Map of items
    const itemsMap = {
      files: file,
      presets: preset,
      prompts: prompt,
      collections: collection,
      tools: tool,
      models: model,
      assistants: assistant,
      chatSessions: chatSession,
    };

    // Update folders with new items
    const folderUpdatePromises = folders.map((folder) => {
      const item = itemsMap[folder.space];
      if (item && folder[folder.space]) {
        folder[folder.space].push(item._id);
      }
      return folder.save();
    });

    await Promise.all(folderUpdatePromises);

    // Update workspace
    workspace.files.push(file._id);
    workspace.presets.push(preset._id);
    workspace.assistants.push(assistant._id);
    workspace.chatSessions.push(chatSession._id);
    workspace.prompts.push(prompt._id);
    workspace.collections.push(collection._id);
    workspace.tools.push(tool._id);
    workspace.models.push(model._id);
    await workspace.save();

    // Update user
    newUser.workspaces.push(workspace._id);
    newUser.files.push(file._id);
    newUser.presets.push(preset._id);
    newUser.assistants.push(assistant._id);
    newUser.chatSessions.push(chatSession._id);
    newUser.prompts.push(prompt._id);
    newUser.collections.push(collection._id);
    newUser.tools.push(tool._id);
    newUser.models.push(model._id);
    newUser.authSession = {
      accessToken,
      refreshToken,
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
      createdAt: new Date(),
    };

    // Update OpenAI profile
    newUser.profile.openai = {
      apiKey: process.env.OPENAI_API_PROJECT_KEY,
      organizationId: process.env.OPENAI_API_ORG_ID,
      apiVersion: '',
      projects: [
        {
          name: process.env.OPENAI_API_PROJECT_NAME,
          id: process.env.OPENAI_API_PROJECT_ID,
          organizationId: process.env.OPENAI_API_ORG_ID,
          organizationName: process.env.OPENAI_API_ORG_NAME,
          apiKey: process.env.OPENAI_API_PROJECT_KEY,
          apiVersion: '',
          default: true,
          users: [
            {
              userId: newUser._id,
              role: 'admin',
              readWrite: true,
            },
          ],
        },
      ],
    };

    await newUser.save();

    return { newUser, workspace, folders };
  } catch (error) {
    logger.error(`Error initializing user data: ${error.message}`);
    throw new ServerError('Failed to initialize user data');
  }
};

module.exports = {
  saveInitialPrompts,
  validateUserInput,
  checkUserExists,
  createNewUser,
  initializeUserData,
};
