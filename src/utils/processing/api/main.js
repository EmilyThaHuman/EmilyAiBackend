require("dotenv").config();
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { sign, verify } = jwt;
const {
  ValidationError,
  ConflictError,
  ALLOWED_FILE_TYPES_ABBR,
  SUPPORTED_MIME_TYPES_ABBR
} = require("@config/constants");
const { User } = require("@models/user");
const { logger } = require("@config/logging");
const fetch = require("node-fetch");

const fetchJson = async (url, options) => {
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching data:", error);
    throw error;
  }
};

const getEnv = (key) => {
  return process.env[key];
};

const validateEnvironmentVariables = () => {
  const requiredEnvVars = ["PINECONE_INDEX"];
  requiredEnvVars.forEach((key) => {
    if (!process.env[key]) {
      throw new Error(`Environment variable ${key} is required`);
    }
  });
};

const generateToken = () => crypto.randomBytes(64).toString("hex");

const generateTokens = (user) => {
  const accessToken = sign(
    { userId: user._id },
    process.env.AUTH_ACCESS_TOKEN_SECRET,
    { expiresIn: "1h" } // Access token expires in 1 hour
  );
  const refreshToken = sign(
    { userId: user._id },
    process.env.AUTH_REFRESH_TOKEN_SECRET,
    { expiresIn: "7d" } // Refresh token expires in 7 days
  );
  return { accessToken, refreshToken };
};

const validateUserInput = ({ username, email, password }) => {
  if (!username || !email || !password) {
    throw new ValidationError("All fields (username, email, password) are required");
  }
  if (password.length < 6) {
    throw new ValidationError("Password must be at least 6 characters long");
  }
};

const checkUserExists = async ({ username, email }) => {
  try {
    const userExists = await User.findOne({ $or: [{ email }, { username }] });
    if (userExists) {
      throw new ConflictError("Username or email already exists");
    }
  } catch (error) {
    logger.error("Error checking user existence:", error);
    throw error;
  }
};

module.exports = {
  generateToken,
  generateTokens,
  getEnv,
  validateEnvironmentVariables,
  validateUserInput,
  checkUserExists,
  fetchJson
};
