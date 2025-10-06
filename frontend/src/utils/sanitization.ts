/**
 * Input Sanitization Utilities
 *
 * This module provides MVP-level sanitization for user-generated content.
 * Current implementation uses built-in browser APIs for basic protection.
 *
 * PRODUCTION UPGRADE: Install DOMPurify for comprehensive sanitization
 * ```bash
 * npm install dompurify
 * npm install --save-dev @types/dompurify
 * ```
 *
 * Then replace the sanitizeHTML implementation with:
 * ```typescript
 * import DOMPurify from 'dompurify';
 * export const sanitizeHTML = (dirty: string): string => {
 *   return DOMPurify.sanitize(dirty, {
 *     ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li'],
 *     ALLOWED_ATTR: ['href', 'title']
 *   });
 * };
 * ```
 */

/**
 * Sanitize HTML content using basic built-in methods
 * This is an MVP implementation - upgrade to DOMPurify for production
 *
 * @param dirty - Potentially unsafe HTML string
 * @returns Sanitized HTML string
 */
export const sanitizeHTML = (dirty: string): string => {
  if (typeof dirty !== 'string') {
    return '';
  }

  // Create a temporary element to leverage browser's built-in HTML parsing
  const temp = document.createElement('div');
  temp.textContent = dirty; // textContent automatically escapes HTML
  return temp.innerHTML;
};

/**
 * Sanitize HTML while preserving safe formatting tags
 * Allows basic formatting: bold, italic, paragraphs, lists
 *
 * @param dirty - HTML string with potential formatting
 * @returns Sanitized HTML with safe tags preserved
 */
export const sanitizeHTMLWithFormatting = (dirty: string): string => {
  if (typeof dirty !== 'string') {
    return '';
  }

  // For MVP: escape all HTML and preserve line breaks
  // Upgrade to DOMPurify for proper tag whitelisting
  const escaped = sanitizeHTML(dirty);
  return escaped.replace(/\n/g, '<br>');
};

/**
 * Sanitize URL to prevent javascript: and data: schemes
 *
 * @param url - Potentially unsafe URL
 * @returns Sanitized URL or empty string if invalid
 */
export const sanitizeURL = (url: string): string => {
  if (typeof url !== 'string') {
    return '';
  }

  const trimmed = url.trim();

  // Block dangerous protocols
  const dangerousProtocols = /^(javascript|data|vbscript|file):/i;
  if (dangerousProtocols.test(trimmed)) {
    return '';
  }

  // Allow http, https, mailto, and protocol-relative URLs
  const safeProtocols = /^(https?:\/\/|mailto:|\/\/)/i;
  if (safeProtocols.test(trimmed)) {
    return trimmed;
  }

  // Allow relative URLs (starting with / or ./)
  if (/^(\/|\.\/|\.\.\/)/i.test(trimmed)) {
    return trimmed;
  }

  // For anything else without protocol, assume https
  if (trimmed && !trimmed.includes(':')) {
    return `https://${trimmed}`;
  }

  return '';
};

/**
 * Sanitize text for display (removes HTML entirely)
 *
 * @param text - User input text
 * @returns Plain text with HTML stripped
 */
export const sanitizeText = (text: string): string => {
  if (typeof text !== 'string') {
    return '';
  }

  // Remove all HTML tags
  const temp = document.createElement('div');
  temp.innerHTML = text;
  return temp.textContent || temp.innerText || '';
};

/**
 * Sanitize user input for CV content
 * Preserves line breaks and basic formatting intent
 *
 * @param content - CV section content
 * @returns Sanitized content safe for rendering
 */
export const sanitizeCVContent = (content: string): string => {
  if (typeof content !== 'string') {
    return '';
  }

  // For CV content, we want to preserve line breaks but remove HTML
  const cleaned = sanitizeText(content);

  // Normalize whitespace while preserving line breaks
  return cleaned
    .split('\n')
    .map(line => line.trim())
    .join('\n')
    .trim();
};

/**
 * Sanitize array of strings (e.g., skills, keywords)
 *
 * @param items - Array of user input strings
 * @returns Array of sanitized strings
 */
export const sanitizeStringArray = (items: string[]): string[] => {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .filter(item => typeof item === 'string')
    .map(item => sanitizeText(item))
    .filter(item => item.length > 0);
};

/**
 * Sanitize object properties recursively
 * Useful for sanitizing entire CV data structures
 *
 * @param obj - Object with potentially unsafe string values
 * @returns Object with sanitized string values
 */
export const sanitizeObject = <T extends Record<string, unknown>>(obj: T): T => {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  const sanitized = {} as T;

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key as keyof T] = sanitizeCVContent(value) as T[keyof T];
    } else if (Array.isArray(value) && value.every(item => typeof item === 'string')) {
      sanitized[key as keyof T] = sanitizeStringArray(value as string[]) as T[keyof T];
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key as keyof T] = sanitizeObject(value as Record<string, unknown>) as T[keyof T];
    } else {
      sanitized[key as keyof T] = value as T[keyof T];
    }
  }

  return sanitized;
};

/**
 * Validate and sanitize email address
 *
 * @param email - Email address to validate
 * @returns Sanitized email or empty string if invalid
 */
export const sanitizeEmail = (email: string): string => {
  if (typeof email !== 'string') {
    return '';
  }

  const cleaned = email.trim().toLowerCase();

  // Basic email validation regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  return emailRegex.test(cleaned) ? cleaned : '';
};

/**
 * Sanitize phone number (removes non-digit characters except + - ( ) space)
 *
 * @param phone - Phone number to sanitize
 * @returns Sanitized phone number
 */
export const sanitizePhone = (phone: string): string => {
  if (typeof phone !== 'string') {
    return '';
  }

  // Keep only digits and common phone formatting characters
  return phone.replace(/[^\d+\-() ]/g, '').trim();
};
