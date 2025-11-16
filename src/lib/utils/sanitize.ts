/**
 * Message Sanitization Utilities
 * Prevents XSS attacks and sanitizes user-facing messages
 */

/**
 * Sanitize a string by removing HTML tags and dangerous characters
 * This prevents XSS attacks in user-facing messages
 */
export function sanitizeMessage(message: string): string {
  if (!message || typeof message !== 'string') {
    return '';
  }

  // Remove HTML tags
  let sanitized = message.replace(/<[^>]*>/g, '');

  // Decode HTML entities to prevent double-encoding attacks
  sanitized = sanitized
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/&#x60;/g, '`')
    .replace(/&#x3D;/g, '=');

  // Remove script tags and javascript: protocols (case-insensitive)
  sanitized = sanitized.replace(/javascript:/gi, '');
  sanitized = sanitized.replace(/on\w+\s*=/gi, ''); // Remove event handlers like onclick=

  // Remove control characters except newlines and tabs
  sanitized = sanitized.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');

  // Limit length to prevent DoS attacks
  const MAX_MESSAGE_LENGTH = 1000;
  if (sanitized.length > MAX_MESSAGE_LENGTH) {
    sanitized = sanitized.substring(0, MAX_MESSAGE_LENGTH) + '...';
  }

  return sanitized.trim();
}

/**
 * Sanitize user input for display (names, etc.)
 * More permissive than sanitizeMessage - allows common characters
 */
export function sanitizeUserInput(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  // Remove HTML tags
  let sanitized = input.replace(/<[^>]*>/g, '');

  // Remove script tags and javascript: protocols
  sanitized = sanitized.replace(/javascript:/gi, '');
  sanitized = sanitized.replace(/on\w+\s*=/gi, '');

  // Remove control characters except newlines and tabs
  sanitized = sanitized.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');

  // Limit length
  const MAX_INPUT_LENGTH = 200;
  if (sanitized.length > MAX_INPUT_LENGTH) {
    sanitized = sanitized.substring(0, MAX_INPUT_LENGTH);
  }

  return sanitized.trim();
}

/**
 * Sanitize error messages from API responses
 * Ensures error messages are safe to display
 */
export function sanitizeErrorMessage(error: unknown): string {
  if (!error) {
    return 'An unexpected error occurred. Please try again.';
  }

  let message = 'An unexpected error occurred. Please try again.';

  if (error instanceof Error) {
    message = error.message;
  } else if (typeof error === 'string') {
    message = error;
  } else if (typeof error === 'object' && 'message' in error) {
    message = String(error.message);
  }

  return sanitizeMessage(message);
}

/**
 * Sanitize API error response
 * Extracts and sanitizes error messages from API responses
 */
export function sanitizeApiError(error: any): string {
  const defaultMessage = 'An error occurred. Please try again.';

  if (!error) {
    return defaultMessage;
  }

  // Try to extract error message from various response formats
  let message: string | undefined;

  if (error.response?.data?.error) {
    message = error.response.data.error;
  } else if (error.response?.data?.message) {
    message = error.response.data.message;
  } else if (error.message) {
    message = error.message;
  }

  if (!message) {
    return defaultMessage;
  }

  return sanitizeMessage(message);
}
