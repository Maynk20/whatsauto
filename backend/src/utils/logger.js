// Structured logger with sanitization of sensitive values

const SENSITIVE_KEYS = ['password', 'token', 'access_token', 'authorization', 'secret', 'key'];

function sanitizeObject(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeObject);

  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_KEYS.some(s => lowerKey.includes(s))) {
      sanitized[key] = '[REDACTED]';
    } else if (lowerKey.includes('phone') && typeof value === 'string' && value.length > 6) {
      sanitized[key] = value.slice(0, 3) + '****' + value.slice(-4);
    } else if (typeof value === 'object') {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

export const logger = {
  info: (msg, meta = {}) => {
    console.log(JSON.stringify({
      level: 'INFO',
      timestamp: new Date().toISOString(),
      message: msg,
      ...sanitizeObject(meta)
    }));
  },
  warn: (msg, meta = {}) => {
    console.warn(JSON.stringify({
      level: 'WARN',
      timestamp: new Date().toISOString(),
      message: msg,
      ...sanitizeObject(meta)
    }));
  },
  error: (msg, meta = {}) => {
    console.error(JSON.stringify({
      level: 'ERROR',
      timestamp: new Date().toISOString(),
      message: msg,
      ...sanitizeObject(meta)
    }));
  },
  debug: (msg, meta = {}) => {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(JSON.stringify({
        level: 'DEBUG',
        timestamp: new Date().toISOString(),
        message: msg,
        ...sanitizeObject(meta)
      }));
    }
  }
};
