/**
 * --------------------------------------------
 * [middlewares/error.js] | error handling middleware
 * --------------------------------------------
 */

const multer = require('multer');

const formatErrorResponse = (err, includeDetails = false) => {
  const response = {
    message: includeDetails ? err.message : 'An error occurred',
    status: err.name,
    statusCode: err.statusCode || 500,
  };

  if (includeDetails) {
    response.stack = err.stack;
    response.functionName = err.stack.split('\n')[1]?.trim()?.split(' ')[1];
  }

  return response;
};

const errorHandler = (err, req, res, next) => {
  if (!err) {
    return next();
  }

  // Log the error (consider using a proper logging library in production)
  console.error(err);

  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: err.message });
  }

  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: err.message });
  }

  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const statusCode = res.statusCode !== 200 ? res.statusCode : 500;
  res.status(statusCode);

  const isProduction = process.env.NODE_ENV === 'production';
  const errorResponse = formatErrorResponse(err, !isProduction);

  res.json(errorResponse);
};

module.exports = {
  errorHandler,
};
