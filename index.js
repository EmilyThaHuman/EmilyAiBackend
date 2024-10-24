/**
 * --------------------------------------------
 * [index.js] | Main entry point to server
 * --------------------------------------------
 */
require("dotenv").config();
require("module-alias/register");
// require("newrelic");
if (process.env.NODE_ENV === "development" && process.env.NEW_RELIC_ENABLED !== "false") {
  require("newrelic");
}

const app = require("./src/app");
const { logger } = require("./src/config/logging");
const { connectDB } = require("./src/db");

async function main() {
  logger.info("Starting the server...");
  try {
    const { client, db, bucket } = await connectDB();
    if (process.env.NODE_ENV !== "test") {
      const PORT = 3001;
      app.listen(PORT, () => logger.info(`Server Open & Connected To Database 🤟: ${PORT}`));
    }
    if (client)
      logger.info(
        `
        --------------------------------------------
          Connected to MongoDB: ${db.databaseName}
        --------------------------------------------`
      );
    if (bucket) logger.info(`Connected to GridFS Bucket: ${bucket.bucketName}`);
  } catch (error) {
    logger.error(`Failed to start the server: ${error.message}`);
    throw error;
    // process.exit(1);
  }
}

main();
