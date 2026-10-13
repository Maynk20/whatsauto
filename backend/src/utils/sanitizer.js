/**
 * Sanitizes errors and user payloads to avoid leaking internals or secrets.
 */

export function sanitizeError(err) {
  if (!err) return null;
  if (typeof err === 'string') {
    return err.replace(/(bearer\s+[a-zA-Z0-9_\-\.]+)/gi, 'bearer [REDACTED]');
  }

  const message = err.message || 'Unknown error occurred';
  const cleanMessage = message.replace(/(bearer\s+[a-zA-Z0-9_\-\.]+)/gi, 'bearer [REDACTED]');

  return {
    message: cleanMessage,
    code: err.code || 'INTERNAL_ERROR',
    status: err.status || 500
  };
}

export function maskPhone(phone) {
  if (!phone || typeof phone !== 'string') return '';
  if (phone.length <= 6) return '****';
  return phone.slice(0, 3) + '****' + phone.slice(-4);
}
