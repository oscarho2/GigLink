/**
 * Standardized error handling utility for consistent API responses
 */

/**
 * Standard error response structure
 * @param {Object} res - Express response object
 * @param {Error} error - Error object
 * @param {string} message - Custom error message
 * @param {number} statusCode - HTTP status code
 */
const handleError = (res, error, message = 'Server error', statusCode = 500) => {
  // Log the error for debugging
  console.error(`Error: ${message}`, {
    error: error.message,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    timestamp: new Date().toISOString()
  });

  // Send standardized error response
  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { error: error.message })
  });
};

/**
 * Handle validation errors from express-validator
 * @param {Object} res - Express response object
 * @param {Array} errors - Validation errors array
 */
const handleValidationError = (res, errors) => {
  const errorMessages = errors.map(error => error.msg);
  res.status(400).json({
    success: false,
    message: 'Validation failed',
    errors: errorMessages
  });
};

/**
 * Handle not found errors
 * @param {Object} res - Express response object
 * @param {string} resource - Resource that was not found
 */
const handleNotFound = (res, resource = 'Resource') => {
  res.status(404).json({
    success: false,
    message: `${resource} not found`
  });
};

/**
 * Handle unauthorized access
 * @param {Object} res - Express response object
 * @param {string} message - Custom unauthorized message
 */
const handleUnauthorized = (res, message = 'Access denied') => {
  res.status(401).json({
    success: false,
    message
  });
};

/**
 * Handle forbidden access
 * @param {Object} res - Express response object
 * @param {string} message - Custom forbidden message
 */
const handleForbidden = (res, message = 'Forbidden') => {
  res.status(403).json({
    success: false,
    message
  });
};

/**
 * Async error wrapper for route handlers
 * @param {Function} fn - Async route handler function
 * @returns {Function} - Wrapped function with error handling
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Global error handling middleware
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const globalErrorHandler = (err, req, res, next) => {
  // Default error
  let error = { ...err };
  error.message = err.message;

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error = { message };
    return res.status(404).json({
      success: false,
      message
    });
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const message = 'Duplicate field value entered';
    error = { message };
    return res.status(400).json({
      success: false,
      message
    });
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = { message };
    return res.status(400).json({
      success: false,
      message
    });
  }

  handleError(res, error, error.message || 'Server Error');
};

module.exports = {
  handleError,
  handleValidationError,
  handleNotFound,
  handleUnauthorized,
  handleForbidden,
  asyncHandler,
  globalErrorHandler
};