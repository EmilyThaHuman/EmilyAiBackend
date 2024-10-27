const mongoose = require("mongoose");
const { logger } = require("@config/logging");
const { getEnv } = require("@utils/processing/api");

let bucket;

/**
 * Connect to MongoDB and initialize GridFS bucket using Mongoose.
 * @async
 * @function connectDB
 * @returns {Promise<{db: Db, bucket: GridFSBucket, client: MongoClient}>}
 */
const connectDB = async () => {
  try {
    if (mongoose.connection.readyState !== 1) {
      const connectionString = getEnv("MONGODB_URI");
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
      // mongoose.set("debug", true);

      const db = mongoose.connection.db;
      bucket = new mongoose.mongo.GridFSBucket(db, { bucketName: "uploads" });
      logger.info("[3] GridFS bucket initialized successfully", { bucketName: "uploads" });
    }
    return {
      db: mongoose.connection.db,
      bucket,
      client: mongoose.connection.getClient()
    };
  } catch (error) {
    logger.error(`MongoDB connection failed: ${error.message}`);
    throw error;
  }
};

/**
 * Gets the GridFS bucket, initializing if necessary.
 * @function getBucket
 * @returns {GridFSBucket}
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
  connectDB,
  getBucket
};
