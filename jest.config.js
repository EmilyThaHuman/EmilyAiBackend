// // jest.config.js
// module.exports = {
//   setupFiles: ['<rootDir>/src/setupTests.js'],
//   testEnvironment: 'node',
//   moduleDirectories: ['node_modules', 'src'],
//   testPathIgnorePatterns: [
//     '<rootDir>/src/config/env/',
//     '<rootDir>/src/__tests__/coverLetterController.test.js', // Ignore coverLetterController tests
//     '<rootDir>/src/__tests__/userController.test.js', // Ignore userController tests
//     '<rootDir>/src/cleanup/', // Ignore cleanup directory
//     '<rootDir>/src/', // Ignore cleanup directory
//     '<rootDir>/src/services/', // Ignore cleanup directory
//     '<rootDir>/src/__test__/old/', // Ignore cleanup directory
//     '<rootDir>/src/__test__/old', // Ignore cleanup directory
//   ],
//   // MATCH: this is configured so that we can run tests in parallel with jest --runInBand
//   testMatch: ['**/__tests__/**/*.[jt]s?(x)', '**/?(*.)+(spec|test).[tj]s?(x)'],
// };
// jest.config.js

module.exports = {
  preset: "@shelf/jest-mongodb",
  moduleDirectories: ["node_modules", "src"],
  testEnvironment: "node",
  verbose: true,
  coverageDirectory: "coverage",
  collectCoverage: true,
  coveragePathIgnorePatterns: ["/node_modules/"],
  testPathIgnorePatterns: ["/node_modules/"],
  testMatch: ["**/?(*.)+(test).js"], // This ensures Jest picks up your test files
  setupFilesAfterEnv: ["<rootDir>/src/__test__/setup.js"]
};
