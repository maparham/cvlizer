/**
 * Security Utilities
 *
 * This module provides security-related utilities including CSP configuration
 * and input sanitization to mitigate XSS attacks as an interim measure.
 */

/**
 * Content Security Policy configuration for impersonation security
 *
 * This CSP helps prevent XSS attacks by restricting script execution and
 * data access. It should be used as an interim measure while implementing
 * the secure server-side impersonation endpoints.
 */
export const CSP_CONFIG = {
  'default-src': ["'self'"],
  'script-src': ["'self'", "'unsafe-inline'"], // Note: unsafe-inline is needed for React
  'style-src': ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
  'font-src': ["'self'", "https://fonts.gstatic.com"],
  'img-src': ["'self'", "data:", "https:"],
  'connect-src': ["'self'", "https://api.clerk.dev"],
  'frame-src': ["'self'"],
  'object-src': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
  'frame-ancestors': ["'none'"],
  'upgrade-insecure-requests': [],
  'block-all-mixed-content': []
}

/**
 * Sanitizes input to prevent XSS attacks
 *
 * @param input - String to sanitize
 * @returns Sanitized string
 */
export const sanitizeInput = (input: string): string => {
  if (typeof input !== 'string') {
    return ''
  }

  return input
    .replace(/[<>]/g, '') // Remove < and > characters
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim()
}

/**
 * Validates and sanitizes impersonation token data
 *
 * @param data - Token data to validate
 * @returns Sanitized and validated data
 */
export const sanitizeImpersonationData = (data: any): any => {
  if (!data || typeof data !== 'object') {
    return null
  }

  return {
    id: sanitizeInput(data.id || ''),
    email: sanitizeInput(data.email || ''),
    is_active: Boolean(data.is_active),
    admin_email: sanitizeInput(data.admin_email || ''),
    impersonator_id: sanitizeInput(data.impersonator_id || ''),
    impersonator_email: sanitizeInput(data.impersonator_email || ''),
    expires_at: sanitizeInput(data.expires_at || ''),
    impersonated_at: sanitizeInput(data.impersonated_at || '')
  }
}

/**
 * Sets up Content Security Policy headers
 *
 * This function should be called during app initialization to set up
 * CSP headers that help prevent XSS attacks.
 */
export const setupCSP = (): void => {
  if (typeof window === 'undefined') {
    return // Server-side rendering
  }

  // Create CSP header value
  const cspDirectives = Object.entries(CSP_CONFIG)
    .map(([directive, values]) => {
      if (values.length === 0) {
        return directive
      }
      return `${directive} ${values.join(' ')}`
    })
    .join('; ')

  // Set CSP meta tag
  const existingCSP = document.querySelector('meta[http-equiv="Content-Security-Policy"]')
  if (existingCSP) {
    existingCSP.setAttribute('content', cspDirectives)
  } else {
    const meta = document.createElement('meta')
    meta.setAttribute('http-equiv', 'Content-Security-Policy')
    meta.setAttribute('content', cspDirectives)
    document.head.appendChild(meta)
  }
}

/**
 * Validates impersonation session data for security
 *
 * @param sessionData - Session data to validate
 * @returns True if data is valid and secure
 */
export const validateImpersonationSession = (sessionData: any): boolean => {
  if (!sessionData || typeof sessionData !== 'object') {
    return false
  }

  // Check required fields
  const requiredFields = ['id', 'email', 'admin_email']
  for (const field of requiredFields) {
    if (!sessionData[field] || typeof sessionData[field] !== 'string') {
      return false
    }
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(sessionData.email) || !emailRegex.test(sessionData.admin_email)) {
    return false
  }

  // Check for suspicious content
  const suspiciousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+=/i,
    /eval\(/i,
    /expression\(/i
  ]

  const dataString = JSON.stringify(sessionData)
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(dataString)) {
      return false
    }
  }

  return true
}
