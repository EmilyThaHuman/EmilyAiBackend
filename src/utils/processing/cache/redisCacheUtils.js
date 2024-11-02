// backend/utils/cache.js
const redis = require("redis");
const client = redis.createClient({ url: "redis://localhost:6379" });

client.on("error", (err) => console.error("Redis Client Error", err));

(async () => {
  await client.connect();
})();

const get = async (key) => {
  const data = await client.get(key);
  return data ? JSON.parse(data) : null;
};

const set = async (key, value) => {
  await client.set(key, JSON.stringify(value), { EX: 3600 }); // 1-hour expiration
};

module.exports = { get, set };
