const config = require("./main");
const passport = require("./passport");
const logger = require("./logging");

module.exports = {
  // ...require("./main"),
  ...require("./logging"),
  ...require("./constants"),
  ...require("./passport"),
  ...config,
  passport: passport,
  config: config,
  logger: logger.logger
};
