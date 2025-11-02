/**
 * Error Classification System
 *
 * Provides type-safe error classification for consistent error handling
 * throughout the application. Classifies errors based on HTTP status codes
 * and error message patterns.
 */

/**
 * Error types for classification
 */
export enum ErrorType {
  Validation = 'validation',
  Network = 'network',
  RateLimit = 'rate-limit',
  NotFound = 'not-found',
  Authentication = 'authentication',
  Authorization = 'authorization',
  ServerError = 'server-error',
  Unknown = 'unknown',
}

/**
 * Classify an error based on its structure and content
 *
 * @param error - Error object (can be any error format from axios, fetch, etc.)
 * @returns ErrorType enum value
 */
export function classifyError(error: any): ErrorType {
  // Check for HTTP status code (most reliable indicator)
  const statusCode = error?.response?.status || error?.status;

  if (statusCode) {
    // 422 is validation error in FastAPI/Pydantic
    if (statusCode === 422) {
      return ErrorType.Validation;
    }
    // 401 is authentication error
    if (statusCode === 401) {
      return ErrorType.Authentication;
    }
    // 403 is authorization error
    if (statusCode === 403) {
      return ErrorType.Authorization;
    }
    // 404 is not found
    if (statusCode === 404) {
      return ErrorType.NotFound;
    }
    // 429 is rate limit
    if (statusCode === 429) {
      return ErrorType.RateLimit;
    }
    // 5xx is server error
    if (statusCode >= 500 && statusCode < 600) {
      return ErrorType.ServerError;
    }
  }

  // Check error code property
  const errorCode = error?.code;
  if (errorCode === '429' || errorCode === 429) {
    return ErrorType.RateLimit;
  }

  // Check error message for patterns (fallback when status code not available)
  const errorMessage = (
    error?.message ||
    error?.response?.data?.message ||
    error?.response?.data?.detail ||
    String(error || '')
  ).toLowerCase();

  // Validation error patterns
  if (
    errorMessage.includes('validation') ||
    errorMessage.includes('cv validation failed') ||
    errorMessage.includes('required') ||
    errorMessage.includes('invalid') ||
    (Array.isArray(error?.response?.data?.detail) &&
      error.response.data.detail.some(
        (d: any) => d?.type === 'validation_error' || d?.loc,
      ))
  ) {
    return ErrorType.Validation;
  }

  // Network error patterns
  if (
    errorMessage.includes('network') ||
    errorMessage.includes('fetch') ||
    errorMessage.includes('connection') ||
    errorMessage.includes('timeout')
  ) {
    return ErrorType.Network;
  }

  // Rate limit patterns
  if (
    errorMessage.includes('429') ||
    errorMessage.includes('too many requests') ||
    errorMessage.includes('rate limit')
  ) {
    return ErrorType.RateLimit;
  }

  // Not found patterns
  if (errorMessage.includes('not found')) {
    return ErrorType.NotFound;
  }

  // Authentication patterns
  if (
    errorMessage.includes('unauthorized') ||
    errorMessage.includes('not authenticated') ||
    errorMessage.includes('token') ||
    errorMessage.includes('auth')
  ) {
    return ErrorType.Authentication;
  }

  // Authorization patterns
  if (
    errorMessage.includes('forbidden') ||
    errorMessage.includes('permission') ||
    errorMessage.includes('access denied')
  ) {
    return ErrorType.Authorization;
  }

  return ErrorType.Unknown;
}
