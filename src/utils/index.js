const processing = require("./processing");
const api = require("./api");
const ai = require("./ai");

module.exports = {
  ...processing,
  ...api,
  ...ai
};
