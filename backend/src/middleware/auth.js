import { supabaseAdmin } from '../config/supabase.js';
import { logger } from '../utils/logger.js';

/**
 * Authentication Middleware:
 * Validates Supabase JWT from Authorization header and attaches verified user info to req.user.
 * Client-provided user IDs are strictly rejected/ignored.
 */
export async function authenticateUser(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Missing or malformed Authorization header. Expected Bearer <token>'
        }
      });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Empty authorization token provided'
        }
      });
    }

    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      logger.warn('Authentication token verification failed', { error: error?.message });
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Session has expired or token is invalid. Please sign in again.'
        }
      });
    }

    // Attach verified user information to the request
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role
    };
    req.token = token;

    next();
  } catch (err) {
    logger.error('Unexpected error in auth middleware', { error: err.message });
    return res.status(500).json({
      success: false,
      error: {
        code: 'AUTH_INTERNAL_ERROR',
        message: 'Internal error verifying authentication credentials'
      }
    });
  }
}
