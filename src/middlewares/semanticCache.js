// backend/middleware/semanticCache.js
const cache = require('@/utils/processing/cache');

const semanticCache = async (req, res, next) => {
  const { query } = req.body;

  if (!query) {
    return res.status(400).json({ message: 'Query is required' });
  }

  const cachedResponse = await cache.get(query);

  if (cachedResponse) {
    return res.json({ source: 'cache', data: cachedResponse });
  }

  next();
};

module.exports = semanticCache;
