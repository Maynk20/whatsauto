import { logger } from '../utils/logger.js';
import { sanitizeError } from '../utils/sanitizer.js';

/**
 * Centralized Express error handler.
 * Prevents stack traces and sensitive error internals from leaking to API clients.
 */
export function errorHandler(err, req, res, next) {
  const sanitized = sanitizeError(err);
  logger.error('Unhandled route error', {
    path: req.originalUrl,
    method: req.method,
    error: sanitized.message
  });

  const statusCode = err.statusCode || err.status || 500;
  res.status(statusCode).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_SERVER_ERROR',
      message: statusCode === 500 && process.env.NODE_ENV === 'production'
        ? 'An unexpected internal server error occurred.'
        : sanitized.message
    }
  });
}
