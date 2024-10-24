/* eslint-disable no-dupe-keys */
const jwt = require('jsonwebtoken');
const { sign, verify } = jwt;
const bcrypt = require('bcrypt');
require('dotenv').config();
const { Prompt, User } = require('@/models');
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
const { AuthorizationError, ValidationError, ConflictError } = require('@/config/constants/errors');
const { initialUserPrompts } = require('@/lib/prompts/static');
const { findAndPopulateUser } = require('@/models/utils');
const { REFRESH_TOKEN } = require('@/config/constants');
const { generateTokens } = require('@/utils/api/auth');
const {
  createNewUser,
  checkUserExists,
  validateUserInput,
  initializeUserData,
} = require('./helpers');

const registerUser = async (req, res, next) => {
  let newUser; // Declare newUser outside the try block for scope access in the catch block
  try {
    logger.info(`Registering user with data: ${JSON.stringify(req.body)}`);
    const { username, email, password } = req.body;

    // Validate input
    validateUserInput({ username, email, password });

    // Check if user exists
    await checkUserExists({ username, email });

    // Create new user
    newUser = await createNewUser({ username, email, password });

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(newUser);

    // Set refresh token cookie
    res.cookie(REFRESH_TOKEN.cookie.name, refreshToken, REFRESH_TOKEN.cookie.options);

    // Initialize user data (workspaces, folders, initial items)
    await initializeUserData(newUser, accessToken, refreshToken);

    // Populate user data for response
    const populatedUser = await findAndPopulateUser(newUser._id);

    logger.info(`User registered successfully: ${newUser.username}`);

    res.status(201).json({
      success: true,
      accessToken,
      refreshToken,
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      userId: newUser._id,
      message: 'User registered successfully',
      user: populatedUser,
    });
  } catch (error) {
    logger.error(`Error registering user: ${error.message}`);

    // Cleanup if user creation failed after saving
    if (newUser) {
      try {
        await User.findByIdAndDelete(newUser._id);
        logger.info(`Partially created user deleted: ${newUser._id}`);
      } catch (cleanupError) {
        logger.error(`Error cleaning up user: ${cleanupError.message}`);
      }
    }

    if (error instanceof ValidationError || error instanceof ConflictError) {
      res.status(error.status).json({ error: error.message });
    } else {
      next(error);
    }
  }
};

// const registerUser = async (req, res, next) => {
//   // eslint-disable-next-line no-unused-vars
//   let workspace, folders;

//   try {
//     logger.info(`${JSON.stringify(req.body)}`, req.body);
//     const { username, email, password } = req.body;

//     if (!username || !email || !password) {
//       throw new Error('All fields (username, email, password) are required');
//     }

//     if (password.length < 6) {
//       throw new Error('Password must be at least 6 characters long');
//     }

//     const userExists = await User.findOne({ $or: [{ email }, { username }] });
//     if (userExists) {
//       throw new Error('Username or email already exists');
//     }

//     const salt = await bcrypt.genSalt(10);
//     const passwordHash = await bcrypt.hash(password, salt);
//     const newUser = new User({
//       // ...defaultUserData,
//       username,
//       email,
//       'auth.password': passwordHash,
//     });
//     await newUser.save();
//     const { accessToken, refreshToken } = generateTokens(newUser);

//     res.cookie(REFRESH_TOKEN.cookie.name, refreshToken, REFRESH_TOKEN.cookie.options);
//     workspace = await createWorkspace(newUser);
//     folders = await createFolders(newUser, workspace);

//     const promptsFolder = folders.find((folder) => folder.space === 'prompts');

//     const [savedPrompts] = await Promise.all([
//       saveInitialPrompts(newUser._id, workspace._id, promptsFolder._id),
//     ]);
//     const validSavedPrompts = savedPrompts.filter((prompt) => prompt !== null);

//     const updatePromises = [
//       ...validSavedPrompts.map((prompt) => {
//         newUser.prompts.push(prompt._id);
//         workspace.prompts.push(prompt._id);
//         promptsFolder.prompts.push(prompt._id);
//       }),
//     ];

//     await Promise.all(updatePromises);
//     const [file, preset, prompt, collection, tool, model] = await Promise.all([
//       createFile(
//         newUser,
//         folders.find((folder) => folder.space === 'files')
//       ),
//       createPreset(
//         newUser,
//         folders.find((folder) => folder.space === 'presets')
//       ),
//       createPrompt(
//         newUser,
//         workspace,
//         folders.find((folder) => folder.space === 'prompts')
//       ),
//       createCollection(
//         newUser,
//         folders.find((folder) => folder.space === 'collections')
//       ),
//       createTool(
//         newUser,
//         workspace,
//         folders.find((folder) => folder.space === 'tools')
//       ),
//       createModel(
//         newUser,
//         folders.find((folder) => folder.space === 'models')
//       ),
//     ]);
//     const assistant = await createAssistant(
//       newUser,
//       folders.find((folder) => folder.space === 'assistants'),
//       file
//     );
//     const chatSession = await createChatSession(
//       newUser,
//       workspace,
//       assistant,
//       folders.find((folder) => folder.space === 'chatSessions')
//     );

//     // Update folders, workspace, and user with new items
//     const updateOperations = [
//       ...folders.map((folder) => {
//         const itemKey = `${folder.space.slice(0, -1)}s`;
//         if (folder[itemKey]) {
//           folder[itemKey].push(eval(folder.space.slice(0, -1))._id);
//         }
//         return folder.save();
//       }),
//       workspace.updateOne({
//         $push: {
//           files: file._id,
//           presets: preset._id,
//           assistants: assistant._id,
//           chatSessions: chatSession._id,
//           prompts: prompt._id,
//           collections: collection._id,
//           tools: tool._id,
//           models: model._id,
//         },
//       }),
//       newUser.updateOne({
//         $addToSet: { workspaces: workspace._id },
//         $push: {
//           files: file._id,
//           presets: preset._id,
//           assistants: assistant._id,
//           chatSessions: chatSession._id,
//           prompts: prompt._id,
//           collections: collection._id,
//           tools: tool._id,
//           models: model._id,
//         },
//         $set: {
//           userId: newUser._id,
//           authSession: {
//             accessToken,
//             refreshToken,
//             expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
//             createdAt: new Date(),
//           },
//           'profile.openai': {
//             apiKey: process.env.OPENAI_API_PROJECT_KEY,
//             organizationId: process.env.OPENAI_API_ORG_ID,
//             apiVersion: '',
//             projects: [
//               {
//                 name: process.env.OPENAI_API_PROJECT_NAME,
//                 id: process.env.OPENAI_API_PROJECT_ID,
//                 organizationId: process.env.OPENAI_API_ORG_ID,
//                 organizationName: process.env.OPENAI_API_ORG_NAME,
//                 apiKey: process.env.OPENAI_API_PROJECT_KEY,
//                 apiVersion: '',
//                 default: true,
//                 users: [
//                   {
//                     userId: newUser._id,
//                     role: 'admin',
//                     readWrite: true,
//                   },
//                 ],
//               },
//             ],
//           },
//         },
//       }),
//     ];

//     await Promise.all(updateOperations);
//     // Save tools and push to User, Workspace, and Folder
//     // const savedTools = await saveTools(newUser._id, workspace._id, toolsFolder._id);
//     // savedTools.forEach((tool) => {
//     //   newUser.tools.push(tool._id);
//     //   workspace.tools.push(tool._id);
//     //   toolsFolder.tools.push(tool._id);
//     // });
//     // const file = await createFile(
//     //   newUser,
//     //   folders.find((folder) => folder.space === 'files')
//     // );
//     // const preset = await createPreset(
//     //   newUser,
//     //   folders.find((folder) => folder.space === 'presets')
//     // );
//     // const assistant = await createAssistant(
//     //   newUser,
//     //   folders.find((folder) => folder.space === 'assistants'),
//     //   file
//     // );
//     // const chatSession = await createChatSession(
//     //   newUser,
//     //   workspace,
//     //   assistant,
//     //   folders.find((folder) => folder.space === 'chatSessions')
//     // );
//     // const prompt = await createPrompt(
//     //   newUser,
//     //   workspace,
//     //   folders.find((folder) => folder.space === 'prompts')
//     // );
//     // const collection = await createCollection(
//     //   newUser,
//     //   folders.find((folder) => folder.space === 'collections')
//     // );
//     // const tool = await createTool(
//     //   newUser,
//     //   workspace,
//     //   folders.find((folder) => folder.space === 'tools')
//     // );
//     // const model = await createModel(
//     //   newUser,
//     //   folders.find((folder) => folder.space === 'models')
//     // );

//     // folders.find((folder) => folder.space === 'files').files.push(file._id);
//     // folders.find((folder) => folder.space === 'presets').presets.push(preset._id);
//     // folders.find((folder) => folder.space === 'assistants').assistants.push(assistant._id);
//     // folders.find((folder) => folder.space === 'chatSessions').chatSessions.push(chatSession._id);
//     // folders.find((folder) => folder.space === 'prompts').prompts.push(prompt._id);
//     // folders.find((folder) => folder.space === 'collections').collections.push(collection._id);
//     // folders.find((folder) => folder.space === 'tools').tools.push(tool._id);
//     // folders.find((folder) => folder.space === 'models').models.push(model._id);

//     // // Save folders
//     // await Promise.all(folders.map((folder) => folder.save()));

//     // // Push item IDs to workspace
//     // workspace.files.push(file._id);
//     // workspace.presets.push(preset._id);
//     // workspace.assistants.push(assistant._id);
//     // workspace.chatSessions.push(chatSession._id);
//     // workspace.prompts.push(prompt._id);
//     // workspace.collections.push(collection._id);
//     // workspace.tools.push(tool._id);
//     // workspace.models.push(model._id);

//     // // Save workspace
//     // await workspace.save();

//     // // Push workspace ID to user
//     // newUser.workspaces = newUser.workspaces.includes(workspace._id)
//     //   ? newUser.workspaces
//     //   : [...newUser.workspaces, workspace._id];
//     // newUser.userId = newUser._id;
//     // newUser.authSession = {
//     //   accessToken,
//     //   refreshToken,
//     //   expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
//     //   createdAt: new Date(),
//     // };
//     // // newUser.authSession = {
//     // //   token: aTkn,
//     // //   tokenType: 'Bearer',
//     // //   accessToken: aTkn,
//     // //   refreshToken: refreshToken,
//     // //   expiresIn: 60 * 60 * 24, // 24 hours
//     // //   expiresAt: Date.now() + 24 * 60 * 60 * 1000,
//     // //   createdAt: new Date(),
//     // // };
//     // const openai = {
//     //   apiKey: process.env.OPENAI_API_PROJECT_KEY,
//     //   organizationId: process.env.OPENAI_API_ORG_ID,
//     //   apiVersion: '',
//     //   projects: [
//     //     {
//     //       name: process.env.OPENAI_API_PROJECT_NAME,
//     //       id: process.env.OPENAI_API_PROJECT_ID,
//     //       organizationId: process.env.OPENAI_API_ORG_ID,
//     //       organizationName: process.env.OPENAI_API_ORG_NAME,
//     //       apiKey: process.env.OPENAI_API_PROJECT_KEY,
//     //       apiVersion: '',
//     //       default: true,
//     //       users: [
//     //         {
//     //           userId: newUser._id,
//     //           role: 'admin',
//     //           readWrite: true,
//     //         },
//     //       ],
//     //     },
//     //   ],
//     // };

//     // newUser.profile.openai = openai;
//     // newUser.openai = openai;

//     // await newUser.save();
//     // logger.info(`User registered: ${newUser.username}`);

//     const populatedUser = await User.findById(newUser._id).populate([
//       'workspaces',
//       {
//         path: 'workspaces',
//         populate: {
//           path: 'chatSessions',
//           model: 'ChatSession', // Replace 'Message' with the actual name of your Message model
//         },
//         populate: {
//           path: 'folders',
//           model: 'Folder', // Replace 'Message' with the actual name of your Message model
//         },
//         populate: {
//           path: 'files',
//           model: 'File', // Replace 'Message' with the actual name of your Message model
//         },
//         populate: {
//           path: 'assistants',
//           model: 'Assistant', // Replace 'Message' with the actual name of your Message model
//         },
//         populate: {
//           path: 'prompts',
//           model: 'Prompt', // Replace 'Message' with the actual name of your Message model
//         },
//         populate: {
//           path: 'tools',
//           model: 'Tool', // Replace 'Message' with the actual name of your Message model
//         },
//       },
//       'assistants',
//       'prompts',
//       {
//         path: 'chatSessions',
//         populate: {
//           path: 'messages',
//           model: 'ChatMessage', // Replace 'Message' with the actual name of your Message model
//         },
//       },
//       {
//         path: 'folders',
//         populate: {
//           path: 'files',
//           model: 'File', // Replace 'Message' with the actual name of your Message model
//         },
//         populate: {
//           path: 'presets',
//           model: 'Preset', // Replace 'Message' with the actual name of your Message model
//         },
//         populate: {
//           path: 'assistants',
//           model: 'Assistant', // Replace 'Message' with the actual name of your Message model
//         },

//         populate: {
//           path: 'chatSessions',
//           model: 'ChatSession', // Replace 'Message' with the actual name of your Message model
//         },

//         populate: {
//           path: 'prompts',
//           model: 'Prompt', // Replace 'Message' with the actual name of your Message model
//         },

//         populate: {
//           path: 'collections',
//           model: 'Collection', // Replace 'Message' with the actual name of your Message model
//         },
//         populate: {
//           path: 'tools',
//           model: 'Tool', // Replace 'Message' with the actual name of your Message model
//         },
//         populate: {
//           path: 'models',
//           model: 'Model', // Replace 'Message' with the actual name of your Message model
//         },
//         // populate: {
//         //   path: 'openai',
//         //   model: 'OpenAI', // Replace 'Message' with the actual name of your Message model
//         // },
//         populate: [
//           {
//             path: 'items',
//             refPath: 'itemType',
//           },
//           {
//             path: 'subfolders',
//             model: 'Folder',
//             populate: {
//               path: 'items',
//               refPath: 'itemType',
//             },
//           },
//         ],
//       },
//       'files',
//       'collections',
//       'models',
//       'tools',
//       'presets',
//     ]);
//     res.status(201).json({
//       success: true,
//       accessToken,
//       refreshToken,
//       expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
//       userId: newUser._id,
//       message: 'User registered successfully',
//       user: populatedUser,
//     });
//   } catch (error) {
//     logger.error(`Error registering user: ${error.message}`);
//     logger.error(`Error Stack: ${error.stack}`);
//     logger.error(`Error Name: ${error.name}`);

//     if (error.code === 11000) {
//       if (error.message.includes('chatsessions index: sessionId_1 dup key')) {
//         throw new Error('Error creating chat session. Please try again.');
//       } else if (error.message.includes('username') || error.message.includes('email')) {
//         throw new Error('Username or email already exists');
//       }
//     } else if (error.message.includes('Failed to create default file')) {
//       res.status(500).json({ error: 'Failed to create default files. Please try again.' });
//     } else if (error.message.includes('All fields (username, email, password) are required')) {
//       throw new Error('All fields (username, email, password) are required');
//     } else if (error.message.includes('Password must be at least 6 characters long')) {
//       throw new Error('Password must be at least 6 characters long');
//     } else {
//       throw new Error('An error occurred while registering the user');
//     }
//     next(error);
//   }
// };
const loginUser = async (req, res, next) => {
  try {
    const { usernameOrEmail, password } = req.body;
    const query = usernameOrEmail.includes('@')
      ? { email: usernameOrEmail }
      : { username: usernameOrEmail };
    let user = await User.findOne(query);
    if (!user) {
      throw new Error('User not found');
    }
    logger.info(
      `User found: ${user.email}, Input password ${password}, User password ${user.auth.password}`
    );
    const passwordMatch = await bcrypt.compare(password, user.auth.password);
    if (!passwordMatch) {
      throw new Error('Invalid password');
    }
    const { accessToken, refreshToken } = generateTokens(user);
    // Update user with new tokens
    user.authSession = {
      accessToken,
      refreshToken,
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
      createdAt: new Date(),
    };

    await user.save();
    logger.info(`User logged in: ${user.email}`);
    // const populatedUser = await User.findById(user._id).populate([
    //   'workspaces',
    //   {
    //     path: 'workspaces',
    //     populate: {
    //       path: 'chatSessions',
    //       model: 'ChatSession',
    //     },
    //     populate: {
    //       path: 'folders',
    //       model: 'Folder',
    //     },
    //     populate: {
    //       path: 'files',
    //       model: 'File',
    //     },
    //     populate: {
    //       path: 'assistants',
    //       model: 'Assistant',
    //     },
    //     populate: {
    //       path: 'prompts',
    //       model: 'Prompt',
    //     },
    //     populate: {
    //       path: 'tools',
    //       model: 'Tool',
    //     },
    //   },
    //   'assistants',
    //   'prompts',
    //   {
    //     path: 'chatSessions',
    //     populate: {
    //       path: 'messages',
    //       model: 'ChatMessage',
    //     },
    //   },
    //   {
    //     path: 'folders',
    //     populate: [
    //       {
    //         path: 'items',
    //         refPath: 'itemType',
    //       },
    //       {
    //         path: 'subfolders',
    //         model: 'Folder',
    //         populate: {
    //           path: 'items',
    //           refPath: 'itemType',
    //         },
    //       },
    //     ],
    //   },
    //   'files',
    //   'collections',
    //   'models',
    //   'tools',
    //   'presets',
    // ]);
    const populatedUser = await findAndPopulateUser(user._id);
    res.status(200).json({
      success: true,
      accessToken,
      refreshToken,
      expiresIn: 60 * 60 * 24, // 24 hours
      userId: user._id,
      message: 'Logged in successfully',
      user: populatedUser,
    });
  } catch (error) {
    logger.error(`Error logging in: ${error.message}`);
    next(error);
    // res.status(500).json({ message: 'Error logging in', error: error.message, stack: error.stack, status: error.name });
  }
};
const logoutUser = async (req, res) => {
  try {
    // Check if there's a token in the request
    if (!req.token) {
      return res.status(400).json({ message: 'No active session found' });
    }

    // Revoke the token
    // This assumes you have a function to blacklist or invalidate tokens
    // If you're using JWT, you might add the token to a blacklist in your database
    // await revokeToken(req.token);

    // Clear any session data if you're using sessions
    if (req.session) {
      req.session.destroy();
    }

    // Clear the token cookie if you're using cookie-based authentication
    res.clearCookie('token');

    // Log the logout action
    logger.info(`User logged out: ${req.token.username}`);

    // Send successful response
    res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    logger.error(`Error logging out: ${error.message}`);
    res.status(500).json({ message: 'Error logging out', error: error.message });
  }
};
const refreshAccessToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      throw new AuthorizationError('Refresh Token is missing');
    }

    const decoded = jwt.verify(refreshToken, process.env.AUTH_REFRESH_TOKEN_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user || user.authSession.refreshToken !== refreshToken) {
      throw new AuthorizationError('Invalid refresh token');
    }

    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user);

    // Update user with new tokens
    user.authSession = {
      accessToken,
      refreshToken: newRefreshToken,
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
      createdAt: new Date(),
    };
    await user.save();

    res.status(200).json({
      success: true,
      accessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    logger.error(`Error refreshing token: ${error.message}`);
    res.status(401).json({ message: 'Invalid token', error: error.message });
  }
};
const addApiKey = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);
    user.openai.apiKey = req.body.apiKey;
    user.profile.openai.apiKey = req.body.apiKey;
    await user.save();
    res.status(201).json({ user, message: 'API key added successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error adding API key', error: error.message });
  }
};
const validateToken = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).send('No token provided');
    }

    const decoded = jwt.verify(token, process.env.AUTH_REFRESH_TOKEN_SECRET);
    if (!decoded) {
      return res.status(401).send('Invalid token');
    }
    res.send('Token is valid');
  } catch (error) {
    res.status(401).send({
      message: 'Error validating token',
      error: error.message,
      stack: error.stack,
      status: error.name,
    });
  }
};
const uploadProfileImage = async (req, res) => {
  try {
    const { userId } = req.params;
    const imagePath = req.file.path;
    await uploadProfileImage(userId, imagePath);
    res.status(200).send({ imagePath });
  } catch (error) {
    res.status(500).send('Error uploading image: ' + error.message);
  }
};
const getProfileImage = async (req, res) => {
  try {
    const { userId } = req.params;
    const imagePath = await getProfileImage(userId);
    res.sendFile(imagePath);
  } catch (error) {
    res.status(500).send('Error retrieving image: ' + error.message);
  }
};
const updateUserProfile = async (req, res) => {
  try {
    const { updatedData } = req.params;
    Object.assign(req.user.profile, updatedData);
    const updatedUser = await req.user.save();

    res.status(200).json({ user: updatedUser });
  } catch (error) {
    res.status(500).send('Error updating user profile: ' + error.message);
  }
};
const refreshToken = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(401).json({ message: 'Refresh token is required' });
    }

    const decoded = jwt.verify(token, process.env.AUTH_REFRESH_TOKEN_SECRET);
    logger._constructLogger(decoded.userId, 'info', 'User refreshed their access token');
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    const { accessToken, refreshToken, expiresIn } = generateTokens(user);
    res.status(200).json({ accessToken, refreshToken, expiresIn });
  } catch (error) {
    logger.error(`Error refreshing token: ${error.message}`);
    res.status(401).json({ message: 'Invalid token', error: error.message });
  }
};
module.exports = {
  registerUser,
  loginUser,
  logoutUser,
  validateToken,
  uploadProfileImage,
  getProfileImage,
  updateUserProfile,
  refreshToken,
  addApiKey,
  refreshAccessToken,
};
// const defaultUserData = {
//   username: '',
//   email: '',
//   firstName: '',
//   lastName: '',
//   password: '',
//   dateJoined: new Date(),
//   isActive: true,
//   auth: {
//     password: '',
//     management: {
//       rateLimit: 0,
//       createdAt: new Date(),
//       updatedAt: new Date(),
//     },
//     chatModelPrivileges: [],
//     lastLogin: new Date(),
//     isSuperuser: false,
//   },
//   authSession: {
//     token: '',
//     tokenType: '',
//     accessToken: '',
//     refreshToken: '',
//     expiresIn: 3600,
//     expiresAt: Date.now() + 3600000,
//     createdAt: new Date(),
//   },
//   profile: {
//     img: 'path/to/default/image',
//     imagePath: 'path/to/default/image',
//     profileImages: [],
//     selectedProfileImage: 'path/to/default/image',
//     bio: '',
//     displayName: '',
//     hasOnboarded: false,
//     identity: {
//       identityId: '',
//       userId: '',
//       identityData: {
//         email: '',
//         emailVerified: false,
//         phoneVerified: false,
//         sub: '',
//       },
//       provider: '',
//       lastSignInAt: null,
//     },
//     openai: {
//       apiKey: '',
//       organizationId: '',
//       apiVersion: '',
//       projects: [],
//     },
//     stats: {
//       totalMessages: 0,
//       totalTokenCount: 0,
//       totalMessages3Days: 0,
//       totalTokenCount3Days: 0,
//     },
//     location: {
//       city: '',
//       state: '',
//       country: '',
//     },
//     social: {
//       facebook: '',
//       twitter: '',
//       instagram: '',
//       linkedin: '',
//       github: '',
//       website: '',
//     },
//     dashboard: {
//       projects: new Map(),
//     },
//     settings: {
//       user: {
//         theme: 'light',
//         fontSize: 16,
//         language: 'en',
//         timezone: 'Seattle',
//       },
//       chat: {
//         presets: {
//           contextLength: 0,
//           description: '',
//           embeddingsProvider: '',
//           folderId: '',
//           includeProfileContext: false,
//           includeWorkspaceInstructions: false,
//           model: '',
//           name: '',
//           prompt: '',
//           sharing: '',
//           temperature: 0,
//           userId: '',
//         },
//       },
//     },
//   },
//   openai: {
//     apiKey: '',
//     organizationId: '',
//     apiVersion: '',
//     projects: [],
//   },
//   appMetadata: {
//     provider: '',
//     providers: [],
//   },
//   workspaces: [],
//   assistants: [],
//   prompts: [],
//   chatSessions: [],
//   folders: [],
//   files: [],
//   collections: [],
//   models: [],
//   tools: [],
//   presets: [],
// };
