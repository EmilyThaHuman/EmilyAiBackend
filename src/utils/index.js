const processing = require("./processing");
const api = require("./processing/api");
const ai = require("./ai");

module.exports = {
  ...processing,
  ...api,
  ...ai
};
