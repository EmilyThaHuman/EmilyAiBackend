const config = require("./main");

module.exports = {
  // ...require("./main"),
  ...require("./logging"),
  ...require("./constants"),
  config: config
};
