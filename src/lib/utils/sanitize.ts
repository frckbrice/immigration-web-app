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
 * Map backend error messages to user-friendly messages
 * Prevents exposing backend implementation details
 */
function mapBackendErrorToUserMessage(errorMessage: string): string {
  if (!errorMessage || typeof errorMessage !== 'string') {
    return 'An error occurred. Please try again.';
  }

  const lowerMessage = errorMessage.toLowerCase();

  // Firebase Auth errors - handle various formats
  // Match patterns like "Firebase auth(invalid credentials)" or "auth/invalid-credential"
  if (lowerMessage.includes('firebase auth') || lowerMessage.includes('auth/')) {
    // Extract error code from patterns like "Firebase auth(invalid credentials)" or "auth/invalid-credential"
    const authErrorMatch = lowerMessage.match(/auth[\/\(]?([^\)]+)/);
    const authErrorCode = authErrorMatch ? authErrorMatch[1].trim() : '';

    if (
      authErrorCode.includes('invalid credential') ||
      authErrorCode.includes('wrong-password') ||
      authErrorCode.includes('user-not-found') ||
      lowerMessage.includes('invalid credential') ||
      lowerMessage.includes('wrong-password') ||
      lowerMessage.includes('user-not-found')
    ) {
      return 'Invalid email or password. Please check your credentials and try again.';
    }
    if (
      lowerMessage.includes('email-already-exists') ||
      lowerMessage.includes('email-already-in-use')
    ) {
      return 'This email address is already registered. Please use a different email or try logging in.';
    }
    if (lowerMessage.includes('invalid-email')) {
      return 'Please enter a valid email address.';
    }
    if (lowerMessage.includes('weak-password')) {
      return 'Password is too weak. Please use a stronger password.';
    }
    if (lowerMessage.includes('too-many-requests')) {
      return 'Too many failed attempts. Please try again later.';
    }
    if (lowerMessage.includes('user-disabled')) {
      return 'This account has been disabled. Please contact support.';
    }
    if (lowerMessage.includes('network-request-failed') || lowerMessage.includes('network error')) {
      return 'Network error. Please check your internet connection and try again.';
    }
    // Generic Firebase auth error
    return 'Authentication failed. Please check your credentials and try again.';
  }

  // Backend API errors
  if (lowerMessage.includes('unauthorized') || lowerMessage.includes('authentication')) {
    return 'Authentication failed. Please log in again.';
  }
  if (lowerMessage.includes('forbidden') || lowerMessage.includes('permission')) {
    return 'You do not have permission to perform this action.';
  }
  if (lowerMessage.includes('not found') || lowerMessage.includes('does not exist')) {
    return 'The requested resource was not found.';
  }
  if (lowerMessage.includes('validation') || lowerMessage.includes('invalid')) {
    return 'Please check your input and try again.';
  }
  if (lowerMessage.includes('server error') || lowerMessage.includes('internal error')) {
    return 'A server error occurred. Please try again later.';
  }
  if (lowerMessage.includes('timeout') || lowerMessage.includes('request timeout')) {
    return 'Request timed out. Please try again.';
  }

  // Return sanitized original message if no mapping found
  // But remove any backend-specific prefixes
  let cleaned = errorMessage;
  cleaned = cleaned.replace(/^firebase\s+auth\s*\(/i, '');
  cleaned = cleaned.replace(/^auth\/[^:]+:\s*/i, '');
  cleaned = cleaned.replace(/^\[.*?\]\s*/i, ''); // Remove [Backend] prefixes

  return sanitizeMessage(cleaned);
}

/**
 * Sanitize API error response
 * Extracts and sanitizes error messages from API responses
 * Maps backend errors to user-friendly messages
 */
export function sanitizeApiError(error: any): string {
  const defaultMessage = 'An error occurred. Please try again.';

  if (!error) {
    return defaultMessage;
  }

  // Try to extract error message from various response formats
  let message: string | undefined;

  // Check Firebase error code first (most specific)
  if (error.code && typeof error.code === 'string') {
    message = error.code;
  } else if (error.response?.data?.error) {
    message = error.response.data.error;
  } else if (error.response?.data?.message) {
    message = error.response.data.message;
  } else if (error.message) {
    message = error.message;
  }

  if (!message) {
    return defaultMessage;
  }

  // Map backend error to user-friendly message
  return mapBackendErrorToUserMessage(message);
}
