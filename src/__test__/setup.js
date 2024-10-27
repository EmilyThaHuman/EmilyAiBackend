/* eslint-disable node/no-unpublished-require */
// tests/setup.js

// Increase the default test timeout from 5 seconds to 10 seconds
jest.setTimeout(10000);

// Import necessary modules
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const dotenv = require("dotenv");
const path = require("path");

// Load environment variables from .env.test
dotenv.config({ path: path.resolve(__dirname, "../../.env.test") });

// Mock the logger globally to prevent actual logging during tests
jest.mock("../config/logging", () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }
}));

// Set up in-memory MongoDB instance
let mongoServer;

// Global beforeAll hook runs once before all tests
beforeAll(async () => {
  // Start in-memory MongoDB server
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();

  // Connect to the in-memory database
  await mongoose.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });
});

// Global afterAll hook runs once after all tests
afterAll(async () => {
  // Close database connection and stop the server
  await mongoose.disconnect();
  await mongoServer.stop();
});

// Global beforeEach hook runs before each test
beforeEach(() => {
  // Clear mocks or reset any global variables if necessary
  jest.clearAllMocks();
});

// Global afterEach hook runs after each test
afterEach(async () => {
  // Clean up database collections after each test
  const collections = Object.keys(mongoose.connection.collections);
  for (const collectionName of collections) {
    const collection = mongoose.connection.collections[collectionName];
    await collection.deleteMany();
  }
});
