/**
 * --------------------------------------------
 * [index.js] | Main entry point to server
 * --------------------------------------------
 */

require('dotenv').config();
require('module-alias/register');

const app = require('./src/app');
const { logger } = require('@/config/logging');
const { connectDB } = require('@/db/main');

async function main() {
  try {
    const { client, db, bucket } = await connectDB();
    if (process.env.NODE_ENV !== 'test') {
      const PORT = 3001;
      app.listen(PORT, () => logger.info(`Server Open & Connected To Database 🤟: ${PORT}`));
    }
    if (client)
      logger.info(
        `
      --------------------------------------------
      Connected to MongoDB: ${db.databaseName}
      --------------------------------------------
      `
      );
    if (bucket) logger.info(`Connected to GridFS Bucket: ${bucket.bucketName}`);
  } catch (error) {
    logger.error(`Failed to start the server: ${error.message}`);
    process.exit(1);
  }
}

main();
