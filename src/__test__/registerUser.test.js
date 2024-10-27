// tests/registerUser.test.js

const express = require("express");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const cookieParser = require("cookie-parser");
const { registerUser } = require("@controllers");
const { User } = require("@models");

// Import your models and controllers

// Mock the logger to prevent actual logging during tests
jest.mock("@config/logging", () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn()
  }
}));

describe("registerUser Controller", () => {
  let app;
  let mongoServer;

  beforeAll(async () => {
    // Start in-memory MongoDB server
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();

    // Connect to the in-memory database
    await mongoose.connect(uri);

    // Initialize Express app
    app = express();
    app.use(express.json());
    app.use(cookieParser());
    app.post("/register", registerUser);
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

  test("should register a new user successfully", async () => {
    const response = await request(app).post("/register").send({
      username: "testuser",
      email: "testuser@example.com",
      password: "password123"
    });

    expect(response.statusCode).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.userId).toBeDefined();
    expect(response.body.accessToken).toBeDefined();
    expect(response.body.refreshToken).toBeDefined();
    expect(response.body.user.username).toBe("testuser");
    expect(response.body.user.email).toBe("testuser@example.com");
  });

  test("should fail when missing required fields", async () => {
    const response = await request(app).post("/register").send({
      email: "testuser@example.com",
      password: "password123"
    });

    expect(response.statusCode).toBe(400);
    expect(response.body.error).toBe("All fields (username, email, password) are required");
  });

  test("should fail when password is too short", async () => {
    const response = await request(app).post("/register").send({
      username: "testuser",
      email: "testuser@example.com",
      password: "123"
    });

    expect(response.statusCode).toBe(400);
    expect(response.body.error).toBe("Password must be at least 6 characters long");
  });

  test("should fail when username already exists", async () => {
    // First, register a user
    await request(app).post("/register").send({
      username: "duplicateUser",
      email: "user1@example.com",
      password: "password123"
    });

    // Attempt to register another user with the same username
    const response = await request(app).post("/register").send({
      username: "duplicateUser",
      email: "user2@example.com",
      password: "password123"
    });

    expect(response.statusCode).toBe(409);
    expect(response.body.error).toBe("Username or email already exists");
  });

  test("should fail when email already exists", async () => {
    // First, register a user
    await request(app).post("/register").send({
      username: "user1",
      email: "duplicate@example.com",
      password: "password123"
    });

    // Attempt to register another user with the same email
    const response = await request(app).post("/register").send({
      username: "user2",
      email: "duplicate@example.com",
      password: "password123"
    });

    expect(response.statusCode).toBe(409);
    expect(response.body.error).toBe("Username or email already exists");
  });

  test("should handle server errors gracefully", async () => {
    // Mock User.prototype.save to throw an error
    jest.spyOn(User.prototype, "save").mockImplementationOnce(() => {
      throw new Error("Database error");
    });

    const response = await request(app).post("/register").send({
      username: "testuser",
      email: "testuser@example.com",
      password: "password123"
    });

    expect(response.statusCode).toBe(500);
    expect(response.body.error).toBe("Internal Server Error");
  });
});
