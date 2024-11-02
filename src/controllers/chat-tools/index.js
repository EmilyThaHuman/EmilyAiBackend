const crawlTools = require("./crawl");
const searchTools = require("./search");

module.exports = {
  ...crawlTools,
  ...searchTools
};
