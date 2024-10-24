const newrelic = require("newrelic");

const asyncHandler = (fn) => (req, res, next) => {
  if (req.body.clientApiKey) {
    process.env.CLIENT_API_KEY = req.body.clientApiKey;
  }
  if (process.env.NODE_ENV === "development" && process.env.NEW_RELIC_ENABLED !== "false") {
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
  } else {
    fn(req, res, next);
  }
};

module.exports = { asyncHandler };
