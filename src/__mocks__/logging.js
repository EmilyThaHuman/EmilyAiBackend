// src/__mocks__/logging.js

module.exports = {
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }
};
