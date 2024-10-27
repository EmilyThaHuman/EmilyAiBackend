/* eslint-disable no-dupe-keys */
require("dotenv").config();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { logger } = require("@config/logging");
const { User } = require("@models/user");
const {
  AuthorizationError,
  ValidationError,
  ConflictError,
  REFRESH_TOKEN
} = require("@config/constants");
const { findAndPopulateUser } = require("@models/utils");
const { generateTokens, validateUserInput, checkUserExists } = require("@utils/processing/api");
const { createNewUser, initializeUserData } = require("@db/helpers");
const { getEnv } = require("@utils/processing/api");

const registerUser = async (req, res, next) => {
  let newUser;
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
    const populatedFolders = populatedUser.workspaces[0].folders;

    // Sessions Config
    const sessionExpiry = new Date(Date.now() + 60 * 60 * 1000);
    const session = {
      accessToken: accessToken,
      refreshToken: refreshToken,
      expiresIn: sessionExpiry.getTime(), // Convert to milliseconds
      expiresAt: sessionExpiry, // Date
      createdAt: new Date(),
      updatedAt: new Date()
    };
    // Register user session
    populatedUser.authSession = session;
    // Setup user session
    const userSession = {
      ...session,
      username: populatedUser.username,
      email: populatedUser.email,
      userId: populatedUser._id,
      workspaceId: populatedUser.workspaces[0]._id,
      chatSessionId: populatedUser.chatSessions[0]._id,
      apiKey: getEnv("OPENAI_API_PROJECT_KEY")
    };

    // Register user session
    req.session.user = userSession;

    await populatedUser.save();

    logger.info(`User registered successfully: ${populatedUser.username}`);

    res.status(201).json({
      success: true,
      accessToken,
      refreshToken,
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      userId: newUser._id,
      workspaceId: populatedUser.workspaces[0]._id,
      chatSessionId: populatedUser.chatSessions[0]._id,
      message: `${newUser.username} registered successfully`,
      // user: populatedUser,
      user: {
        // -- auth data --
        _id: populatedUser._id,
        username: populatedUser.username,
        email: populatedUser.email,
        // -- app data --
        workspaces: populatedUser.workspaces,
        chatSessions: populatedUser.chatSessions,
        folders: populatedFolders,
        homeWorkspaceId: populatedUser.homeWorkspaceId,
        // -- user profile --
        profile: {
          name: populatedUser.profile.name,
          username: populatedUser.profile.username,
          displayName: populatedUser.profile.displayName,
          email: populatedUser.profile.email,
          avatar: populatedUser.profile.img,
          avatarPath: populatedUser.profile.imagePath,
          bio: populatedUser.profile.bio,
          stats: populatedUser.profile.stats,
          social: populatedUser.profile.social,
          openai: populatedUser.profile.openai,
          envKeyMap: populatedUser.profile.envKeyMap,
          defaultApiKey: getEnv("OPENAI_API_PROJECT_KEY")
        }
      }
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
const loginUser = async (req, res, next) => {
  try {
    const { usernameOrEmail, password } = req.body;
    const query = usernameOrEmail.includes("@")
      ? { email: usernameOrEmail }
      : { username: usernameOrEmail };
    let user = await User.findOne(query).populate("workspaces chatSessions");
    if (!user) {
      throw new Error("User not found");
    }
    logger.info(
      `User found: ${user.email}, Input password ${password}, User password ${user.auth.password}`
    );
    const passwordMatch = await bcrypt.compare(password, user.auth.password);
    if (!passwordMatch) {
      throw new Error("Invalid password");
    }
    const { accessToken, refreshToken } = generateTokens(user);

    await user.save();
    logger.info(`User logged in: ${user.email}`);

    // Populate user data for response
    const populatedUser = await findAndPopulateUser(user._id);
    const populatedFolders = populatedUser.workspaces[0].folders;
    // Sessions Config
    const sessionExpiry = new Date(Date.now() + 60 * 60 * 1000);
    const session = {
      accessToken: accessToken,
      refreshToken: refreshToken,
      expiresIn: sessionExpiry.getTime(), // Convert to milliseconds
      expiresAt: sessionExpiry, // Date
      createdAt: new Date(),
      updatedAt: new Date()
    };
    // Register user session
    populatedUser.authSession = session;
    // Setup user session
    const userSession = {
      ...session,
      username: populatedUser.username,
      email: populatedUser.email,
      userId: populatedUser._id,
      workspaceId: populatedUser.workspaces[0]._id,
      chatSessionId: populatedUser.chatSessions[0]._id,
      apiKey: getEnv("OPENAI_API_PROJECT_KEY")
    };
    req.session.user = userSession;
    // Register user session
    await populatedUser.save();
    // Setup user session
    logger.info(`New User Session For: ${populatedUser.username}`);

    res.status(201).json({
      success: true,
      message: `${populatedUser.username} logged in successfully`,
      accessToken,
      refreshToken,
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      userId: populatedUser._id,
      workspaceId: populatedUser.workspaces[0]._id,
      chatSessionId: populatedUser.chatSessions[0]._id,
      user: {
        // -- auth data --
        _id: populatedUser._id,
        username: populatedUser.username,
        email: populatedUser.email,
        // -- app data --
        workspaces: populatedUser.workspaces,
        chatSessions: populatedUser.chatSessions,
        folders: populatedFolders,
        homeWorkspaceId: populatedUser.homeWorkspaceId,

        // -- user profile --
        profile: {
          name: populatedUser.profile.name,
          avatar: populatedUser.profile.img,
          avatarPath: populatedUser.profile.imagePath,
          bio: populatedUser.profile.bio,
          stats: populatedUser.profile.stats,
          social: populatedUser.profile.social,
          openai: populatedUser.profile.openai,
          envKeyMap: populatedUser.profile.envKeyMap,
          defaultApiKey: getEnv("OPENAI_API_PROJECT_KEY")
        }
      }
    });
  } catch (error) {
    logger.error(`Error logging in: ${error.message}`);
    next(error);
  }
};
const logoutUser = async (req, res) => {
  try {
    // Check if there's a token in the request
    if (!req.token) {
      return res.status(400).json({ message: "No active session found" });
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
    res.clearCookie("token");

    // Log the logout action
    logger.info(`User logged out: ${req.token.username}`);

    // Send successful response
    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    logger.error(`Error logging out: ${error.message}`);
    res.status(500).json({ message: "Error logging out", error: error.message });
  }
};
const refreshAccessToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      throw new AuthorizationError("Refresh Token is missing");
    }

    const decoded = jwt.verify(refreshToken, process.env.AUTH_REFRESH_TOKEN_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user || user.authSession.refreshToken !== refreshToken) {
      throw new AuthorizationError("Invalid refresh token");
    }

    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user);

    // Update user with new tokens
    user.authSession = {
      accessToken,
      refreshToken: newRefreshToken,
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
      createdAt: new Date()
    };
    await user.save();

    res.status(200).json({
      success: true,
      accessToken,
      refreshToken: newRefreshToken
    });
  } catch (error) {
    logger.error(`Error refreshing token: ${error.message}`);
    res.status(401).json({ message: "Invalid token", error: error.message });
  }
};
const addApiKey = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);
    user.openai.apiKey = req.body.apiKey;
    user.profile.openai.apiKey = req.body.apiKey;
    await user.save();
    res.status(201).json({ user, message: "API key added successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error adding API key", error: error.message });
  }
};
const validateToken = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).send("No token provided");
    }

    const decoded = jwt.verify(token, process.env.AUTH_REFRESH_TOKEN_SECRET);
    if (!decoded) {
      return res.status(401).send("Invalid token");
    }
    res.send("Token is valid");
  } catch (error) {
    res.status(401).send({
      message: "Error validating token",
      error: error.message,
      stack: error.stack,
      status: error.name
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
    res.status(500).send("Error uploading image: " + error.message);
  }
};
const getProfileImage = async (req, res) => {
  try {
    const { userId } = req.params;
    const imagePath = await getProfileImage(userId);
    res.sendFile(imagePath);
  } catch (error) {
    res.status(500).send("Error retrieving image: " + error.message);
  }
};
function removeEmptyStrings(obj) {
  return Object.keys(obj).reduce((acc, key) => {
    if (obj[key] !== "") {
      acc[key] = obj[key];
    }
    return acc;
  }, {});
}
const updateProfile = async (req, res) => {
  try {
    const profileData = removeEmptyStrings(req.body);
    const user = await User.findById(req.params.userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    logger.info(
      `Updating profile for user: ${user.email} with data: ${JSON.stringify(profileData)}`
    );

    // Update specific fields
    if (profileData.avatarUrl) {
      user.profile.imagePath = profileData.avatarUrl;
    }
    if (profileData.displayName) {
      user.profile.displayName = profileData.displayName;
    }
    if (profileData.username) {
      user.profile.username = profileData.username;
    }

    // Update API keys in the envKeyMap
    const apiKeys = [
      "anthropicApiKey",
      "googleGeminiApiKey",
      "groqApiKey",
      "mistralApiKey",
      "openaiApiKey",
      "openrouterApiKey",
      "perplexityApiKey"
    ];
    apiKeys.forEach((key) => {
      if (profileData[key]) {
        user.profile.envKeyMap.set(key, profileData[key]);
      }
    });

    // Update openaiOrgId separately as it's not in the envKeyMap
    if (profileData.openaiOrgId) {
      user.profile.openaiOrgId = profileData.openaiOrgId;
    }

    const updatedUser = await user.save();

    res.status(200).json({
      message: "Profile updated successfully",
      profile: updatedUser.profile
    });
  } catch (error) {
    logger.error(`Error updating user profile: ${error.message}`);
    res.status(500).json({ error: "Error updating user profile", message: error.message });
  }
};
const refreshToken = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(401).json({ message: "Refresh token is required" });
    }

    const decoded = jwt.verify(token, process.env.AUTH_REFRESH_TOKEN_SECRET);
    logger._constructLogger(decoded.userId, "info", "User refreshed their access token");
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ message: "Invalid token" });
    }

    const { accessToken, refreshToken, expiresIn } = generateTokens(user);
    res.status(200).json({ accessToken, refreshToken, expiresIn });
  } catch (error) {
    logger.error(`Error refreshing token: ${error.message}`);
    res.status(401).json({ message: "Invalid token", error: error.message });
  }
};
module.exports = {
  registerUser,
  loginUser,
  logoutUser,
  validateToken,
  uploadProfileImage,
  getProfileImage,
  updateProfile,
  refreshToken,
  addApiKey,
  refreshAccessToken
};
