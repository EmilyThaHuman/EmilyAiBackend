// backend/utils/cache.js
const NodeCache = require("node-cache");
const cache = new NodeCache({ stdTTL: 3600 }); // 1-hour TTL

const get = async (key) => {
  return cache.get(key);
};

const set = async (key, value) => {
  cache.set(key, value);
};

module.exports = { get, set };
