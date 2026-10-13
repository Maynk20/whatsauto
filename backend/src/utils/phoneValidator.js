/**
 * Validates and normalizes phone numbers to standard international E.164 format.
 * WhatsApp requires numbers without leading zeroes, plus sign, or hyphens in raw API calls,
 * but standardized international format (e.g. +919876543210 or 919876543210) is expected.
 */

export function normalizePhoneNumber(rawNumber) {
  if (!rawNumber || typeof rawNumber !== 'string') {
    return { isValid: false, normalized: null, error: 'Phone number must be a non-empty string' };
  }

  // Remove common separator characters and spaces
  let cleaned = rawNumber.trim().replace(/[\s\-\(\)\.]/g, '');

  // Handle leading '+'
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  }

  // Check if contains non-digit characters
  if (!/^\d+$/.test(cleaned)) {
    return { isValid: false, normalized: null, error: 'Phone number contains invalid characters' };
  }

  // International phone numbers typically range between 10 to 15 digits
  if (cleaned.length < 10 || cleaned.length > 15) {
    return { isValid: false, normalized: null, error: `Invalid phone number length (${cleaned.length} digits). Must be between 10 and 15 digits.` };
  }

  return {
    isValid: true,
    normalized: cleaned,
    e164: `+${cleaned}`,
    error: null
  };
}

export function substituteTemplate(template, data = {}) {
  if (!template) return '';
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    return data[key] !== undefined ? String(data[key]) : match;
  });
}
