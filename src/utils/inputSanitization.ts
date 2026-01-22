/**
 * Input Sanitization Utilities
 * 
 * Provides functions to sanitize and validate user input to prevent XSS attacks
 * and ensure data integrity.
 */

/**
 * Sanitizes a string by removing potentially dangerous characters and patterns
 * @param input - The input string to sanitize
 * @returns Sanitized string safe for display
 */
export function sanitizeString(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  // Remove HTML tags and script content
  let sanitized = input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '') // Remove iframe tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers (onclick, onerror, etc.)
    .replace(/<[^>]+>/g, ''); // Remove any remaining HTML tags

  // Trim whitespace
  sanitized = sanitized.trim();

  return sanitized;
}

/**
 * Validates and sanitizes user name input
 * Allows letters, spaces, hyphens, apostrophes, and common name characters
 * @param name - The name to validate
 * @returns Object with isValid flag and sanitized name
 */
export function validateAndSanitizeName(name: string): { isValid: boolean; sanitized: string; error?: string } {
  if (!name || typeof name !== 'string') {
    return { isValid: false, sanitized: '', error: 'Name is required' };
  }

  const trimmed = name.trim();

  // Check length
  if (trimmed.length === 0) {
    return { isValid: false, sanitized: '', error: 'Name cannot be empty' };
  }

  if (trimmed.length > 50) {
    return { isValid: false, sanitized: trimmed.substring(0, 50), error: 'Name must be 50 characters or less' };
  }

  // Check for only allowed characters: letters, spaces, hyphens, apostrophes, periods
  // This allows names like "Mary-Jane O'Brien" or "Dr. Smith"
  const namePattern = /^[a-zA-Z\s'-.]+$/;
  if (!namePattern.test(trimmed)) {
    return { 
      isValid: false, 
      sanitized: sanitizeString(trimmed), 
      error: 'Name can only contain letters, spaces, hyphens, apostrophes, and periods' 
    };
  }

  // Check for suspicious patterns (potential XSS attempts)
  const suspiciousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /<iframe/i,
    /eval\(/i,
    /expression\(/i
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(trimmed)) {
      return { 
        isValid: false, 
        sanitized: sanitizeString(trimmed), 
        error: 'Name contains invalid characters' 
      };
    }
  }

  // Sanitize and return
  const sanitized = sanitizeString(trimmed);
  return { isValid: true, sanitized };
}

/**
 * Validates and sanitizes sentence input (for game corrections)
 * More permissive than name validation, but still prevents XSS
 * @param input - The sentence input to validate
 * @returns Object with isValid flag and sanitized input
 */
export function validateAndSanitizeSentence(input: string): { isValid: boolean; sanitized: string; error?: string } {
  if (!input || typeof input !== 'string') {
    return { isValid: false, sanitized: '', error: 'Input is required' };
  }

  const trimmed = input.trim();

  // Check length
  if (trimmed.length === 0) {
    return { isValid: false, sanitized: '', error: 'Input cannot be empty' };
  }

  if (trimmed.length > 1000) {
    return { 
      isValid: false, 
      sanitized: trimmed.substring(0, 1000), 
      error: 'Input must be 1000 characters or less' 
    };
  }

  // Check for dangerous patterns (XSS attempts)
  const dangerousPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /eval\(/i,
    /expression\(/i,
    /<object/i,
    /<embed/i,
    /<link/i,
    /<meta/i
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(trimmed)) {
      console.warn('Potentially malicious input detected:', trimmed.substring(0, 50));
      return { 
        isValid: false, 
        sanitized: sanitizeString(trimmed), 
        error: 'Input contains invalid characters' 
      };
    }
  }

  // Sanitize HTML tags but allow normal text and punctuation
  const sanitized = sanitizeString(trimmed);

  return { isValid: true, sanitized };
}

/**
 * Escapes HTML special characters to prevent XSS when rendering user input
 * @param text - Text to escape
 * @returns Escaped text safe for HTML rendering
 */
export function escapeHtml(text: string): string {
  if (!text || typeof text !== 'string') {
    return '';
  }

  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };

  return text.replace(/[&<>"']/g, (char) => map[char]);
}

/**
 * Normalizes sentence input for game logic (handles curly quotes, etc.)
 * This is safe to use after sanitization
 * @param input - Input to normalize
 * @returns Normalized string
 */
export function normalizeSentenceInput(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  return input
    .trim()
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .replace(/[''′‛]/g, "'")  // Replace curly/smart apostrophes with straight ones
    .replace(/[""″‟]/g, '"')  // Replace curly/smart quotes with straight ones
    .replace(/[–—]/g, '-')  // Replace em/en dashes with hyphens
    .replace(/\u2019/g, "'"); // Replace right single quotation mark (U+2019) with straight apostrophe
}

/**
 * Validates that input contains only safe characters for educational content
 * @param input - Input to check
 * @returns true if input is safe
 */
export function isSafeInput(input: string): boolean {
  if (!input || typeof input !== 'string') {
    return false;
  }

  // Check for dangerous patterns
  const dangerousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /<iframe/i,
    /eval\(/i,
    /expression\(/i
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(input)) {
      return false;
    }
  }

  return true;
}
