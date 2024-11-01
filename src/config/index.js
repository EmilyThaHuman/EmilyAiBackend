const config = require("./main");
const passport = require("./passport");
const logger = require("./logging");

module.exports = {
  // ...require("./main"),
  ...require("./logging"),
  ...require("./constants"),
  ...require("./passport"),
  passport: passport,
  config: config,
  logger: logger.logger
};
