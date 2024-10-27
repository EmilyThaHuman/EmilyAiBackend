const mongoose = require("mongoose");
const { logger } = require("@config/logging");
const { config } = require("@config/index");

/**
 * Connect to MongoDB and initialize GridFS bucket using Mongoose.
 * @async
 * @function connectDB
 * @returns {Promise<{db: Db, bucket: GridFSBucket, client: MongoClient}>}
 */
const connectDB = async () => {
  try {
    if (mongoose.connection.readyState !== 1) {
      const connectionString = config.database.uri;
      if (!connectionString) {
        throw new Error("MONGODB_URI is not set in environment variables");
      }
      logger.info(`[1] Attempting to connect to MongoDB`);

      await mongoose.connect(connectionString, {
        serverSelectionTimeoutMS: 5000,
        tlsAllowInvalidCertificates: false,
        tlsAllowInvalidHostnames: false
      });
      logger.info("[2] Mongoose connection established successfully");
    }
    return {
      db: mongoose.connection.db,
      client: mongoose.connection.getClient()
    };
  } catch (error) {
    logger.error(`MongoDB connection failed: ${error.message}`);
    throw error;
  }
};

module.exports = {
  connectDB
};
