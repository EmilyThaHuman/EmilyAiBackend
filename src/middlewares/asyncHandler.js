const newrelic = require("newrelic");

const asyncHandler = (fn) => (req, res, next) => {
  if (req.body.clientApiKey) {
    process.env.CLIENT_API_KEY = req.body.clientApiKey;
  }

  // Wrap the handler function with New Relic's transaction handling
  newrelic.startWebTransaction(req.url, async () => {
    try {
      await fn(req, res, next);
    } catch (err) {
      next(err);
    } finally {
      newrelic.endTransaction();
    }
  });
};

module.exports = { asyncHandler };
