// tests/helpers.test.js

const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const { MongoMemoryServer } = require("mongodb-memory-server");
const {
  validateUserInput,
  checkUserExists,
  createNewUser,
  initializeUserData
} = require("@controllers/user/helpers");
const { User } = require("@models");

// Import your models and helpers

describe("Helper Functions", () => {
  let mongoServer;

  beforeAll(async () => {
    // Start in-memory MongoDB server
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();

    // Connect to the in-memory database
    await mongoose.connect(uri);
  });

  afterAll(async () => {
    // Close database connection and stop the server
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  afterEach(async () => {
    // Clear the database after each test
    await User.deleteMany({});
    jest.clearAllMocks();
  });

  describe("validateUserInput", () => {
    test("should pass with valid input", () => {
      expect(() => {
        validateUserInput({
          username: "validUser",
          email: "valid@example.com",
          password: "password123"
        });
      }).not.toThrow();
    });

    test("should throw an error when fields are missing", () => {
      expect(() => {
        validateUserInput({
          email: "missingUsername@example.com",
          password: "password123"
        });
      }).toThrow("All fields (username, email, password) are required");
    });

    test("should throw an error when password is too short", () => {
      expect(() => {
        validateUserInput({
          username: "user",
          email: "user@example.com",
          password: "123"
        });
      }).toThrow("Password must be at least 6 characters long");
    });
  });

  describe("checkUserExists", () => {
    test("should pass when user does not exist", async () => {
      await expect(
        checkUserExists({
          username: "uniqueUser",
          email: "unique@example.com"
        })
      ).resolves.not.toThrow();
    });

    test("should throw ConflictError when username exists", async () => {
      // Create a user with the username 'existingUser'
      await User.create({
        username: "existingUser",
        email: "user1@example.com",
        auth: { password: "hashedpassword" }
      });

      await expect(
        checkUserExists({
          username: "existingUser",
          email: "user2@example.com"
        })
      ).rejects.toThrow("Username or email already exists");
    });

    test("should throw ConflictError when email exists", async () => {
      // Create a user with the email 'existing@example.com'
      await User.create({
        username: "user1",
        email: "existing@example.com",
        auth: { password: "hashedpassword" }
      });

      await expect(
        checkUserExists({
          username: "user2",
          email: "existing@example.com"
        })
      ).rejects.toThrow("Username or email already exists");
    });
  });

  describe("createNewUser", () => {
    test("should create a new user successfully", async () => {
      const newUser = await createNewUser({
        username: "newUser",
        email: "newuser@example.com",
        password: "password123"
      });

      expect(newUser).toBeDefined();
      expect(newUser.username).toBe("newUser");
      expect(newUser.email).toBe("newuser@example.com");
      expect(newUser.auth.password).toBeDefined();
      expect(bcrypt.compareSync("password123", newUser.auth.password)).toBe(true);
    });
  });

  describe("initializeUserData", () => {
    test("should initialize user data successfully", async () => {
      const newUser = await createNewUser({
        username: "initUser",
        email: "inituser@example.com",
        password: "password123"
      });

      const accessToken = "dummyAccessToken";
      const refreshToken = "dummyRefreshToken";

      // Mock dependencies or external functions as needed
      jest.mock("../db", () => ({
        createWorkspace: jest.fn().mockResolvedValue({ _id: mongoose.Types.ObjectId() }),
        createFolders: jest.fn().mockResolvedValue([]),
        createAssistant: jest.fn().mockResolvedValue({ _id: mongoose.Types.ObjectId() }),
        createChatSession: jest.fn().mockResolvedValue({ _id: mongoose.Types.ObjectId() })
      }));

      await expect(initializeUserData(newUser, accessToken, refreshToken)).resolves.not.toThrow();
    });
  });
});
