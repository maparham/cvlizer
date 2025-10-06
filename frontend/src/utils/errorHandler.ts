/**
 * Centralized Error Handler Utility
 *
 * This module provides a unified error handling system with:
 * - Categorized error types for different failure scenarios
 * - Context tagging for debugging (feature, action, userId)
 * - User-facing message formatting using UI store notifications
 * - Development-only detailed logging
 * - Integration with existing error normalization
 *
 * Usage:
 * ```typescript
 * ErrorHandler.handle(error, {
 *   feature: 'cv-upload',
 *   action: 'parse-file',
 *   userMessage: 'Failed to upload CV'
 * });
 * ```
 */

import { normalizeApiError } from '../services/api';
import { useUIStore } from '../stores/uiStore';

/**
 * Error categories for classification
 */
export enum ErrorCategory {
  Network = 'network',
  Validation = 'validation',
  Authentication = 'authentication',
  Authorization = 'authorization',
  AI = 'ai',
  FileOperation = 'file-operation',
  Unknown = 'unknown',
}

/**
 * Error context for debugging and tracking
 */
export interface ErrorContext {
  /** Feature/module where error occurred */
  feature?: string;
  /** Specific action that failed */
  action?: string;
  /** User ID for tracking (optional) */
  userId?: string;
  /** Override user-facing message */
  userMessage?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Structured error information
 */
export interface ErrorInfo {
  category: ErrorCategory;
  message: string;
  userMessage: string;
  context?: ErrorContext;
  originalError?: unknown;
  timestamp: string;
}

/**
 * Categorize error based on content and type
 */
function categorizeError(error: unknown): ErrorCategory {
  const errorMessage = normalizeApiError(error).toLowerCase();

  if (errorMessage.includes('network') || errorMessage.includes('fetch') || errorMessage.includes('connection')) {
    return ErrorCategory.Network;
  }

  if (errorMessage.includes('validation') || errorMessage.includes('invalid') || errorMessage.includes('required')) {
    return ErrorCategory.Validation;
  }

  if (errorMessage.includes('unauthorized') || errorMessage.includes('not authenticated') || errorMessage.includes('token')) {
    return ErrorCategory.Authentication;
  }

  if (errorMessage.includes('forbidden') || errorMessage.includes('permission')) {
    return ErrorCategory.Authorization;
  }

  if (errorMessage.includes('ai') || errorMessage.includes('openai') || errorMessage.includes('generation')) {
    return ErrorCategory.AI;
  }

  if (errorMessage.includes('file') || errorMessage.includes('upload') || errorMessage.includes('parse')) {
    return ErrorCategory.FileOperation;
  }

  return ErrorCategory.Unknown;
}

/**
 * Generate user-friendly message based on error category
 */
function getUserFriendlyMessage(category: ErrorCategory, originalMessage: string, context?: ErrorContext): string {
  // Use custom message if provided
  if (context?.userMessage) {
    return context.userMessage;
  }

  // Category-specific default messages
  switch (category) {
    case ErrorCategory.Network:
      return 'Connection error. Please check your internet connection and try again.';

    case ErrorCategory.Validation:
      return 'Please check your input and try again.';

    case ErrorCategory.Authentication:
      return 'Your session has expired. Please sign in again.';

    case ErrorCategory.Authorization:
      return 'You do not have permission to perform this action.';

    case ErrorCategory.AI:
      return 'AI service is temporarily unavailable. Please try again later.';

    case ErrorCategory.FileOperation:
      return 'File operation failed. Please ensure the file is valid and try again.';

    case ErrorCategory.Unknown:
    default:
      // For unknown errors, use the original message if it's user-friendly
      if (originalMessage && originalMessage.length < 100 && !originalMessage.includes('undefined')) {
        return originalMessage;
      }
      return 'An unexpected error occurred. Please try again.';
  }
}

/**
 * Log error details in development environment
 */
function logErrorInDev(errorInfo: ErrorInfo): void {
  if (import.meta.env.DEV) {
    const { category, message, context, originalError, timestamp } = errorInfo;

    console.group(`🔴 [${category.toUpperCase()}] ${context?.feature || 'Unknown Feature'}`);
    console.log('Timestamp:', timestamp);
    console.log('Action:', context?.action || 'N/A');
    console.log('Message:', message);
    console.log('User Message:', errorInfo.userMessage);

    if (context?.metadata) {
      console.log('Metadata:', context.metadata);
    }

    if (originalError) {
      console.log('Original Error:', originalError);
    }

    console.groupEnd();
  }
}

/**
 * Main error handler class
 */
export class ErrorHandler {
  /**
   * Handle an error with context and user notification
   *
   * @param error - The error to handle (can be any type)
   * @param context - Additional context about where/why the error occurred
   * @returns ErrorInfo object with structured error data
   */
  static handle(error: unknown, context?: ErrorContext): ErrorInfo {
    const category = categorizeError(error);
    const message = normalizeApiError(error);
    const userMessage = getUserFriendlyMessage(category, message, context);
    const timestamp = new Date().toISOString();

    const errorInfo: ErrorInfo = {
      category,
      message,
      userMessage,
      context,
      originalError: error,
      timestamp,
    };

    // Log in development
    logErrorInDev(errorInfo);

    // Show user notification
    this.notifyUser(errorInfo);

    return errorInfo;
  }

  /**
   * Handle error silently without user notification (only logging)
   *
   * @param error - The error to handle
   * @param context - Additional context
   * @returns ErrorInfo object
   */
  static handleSilent(error: unknown, context?: ErrorContext): ErrorInfo {
    const category = categorizeError(error);
    const message = normalizeApiError(error);
    const userMessage = getUserFriendlyMessage(category, message, context);
    const timestamp = new Date().toISOString();

    const errorInfo: ErrorInfo = {
      category,
      message,
      userMessage,
      context,
      originalError: error,
      timestamp,
    };

    // Log in development
    logErrorInDev(errorInfo);

    return errorInfo;
  }

  /**
   * Show user notification based on error category
   */
  private static notifyUser(errorInfo: ErrorInfo): void {
    const { showError, showWarning } = useUIStore.getState();

    const title = this.getNotificationTitle(errorInfo.category, errorInfo.context);

    // Use warning for validation errors, error for others
    if (errorInfo.category === ErrorCategory.Validation) {
      showWarning(title, errorInfo.userMessage);
    } else {
      showError(title, errorInfo.userMessage);
    }
  }

  /**
   * Get notification title based on error category and context
   */
  private static getNotificationTitle(category: ErrorCategory, context?: ErrorContext): string {
    if (context?.feature) {
      return `${context.feature} Error`;
    }

    switch (category) {
      case ErrorCategory.Network:
        return 'Connection Error';
      case ErrorCategory.Validation:
        return 'Validation Error';
      case ErrorCategory.Authentication:
        return 'Authentication Error';
      case ErrorCategory.Authorization:
        return 'Permission Error';
      case ErrorCategory.AI:
        return 'AI Service Error';
      case ErrorCategory.FileOperation:
        return 'File Operation Error';
      default:
        return 'Error';
    }
  }

  /**
   * Check if error is of a specific category
   */
  static isCategory(error: unknown, category: ErrorCategory): boolean {
    return categorizeError(error) === category;
  }

  /**
   * Check if error is network-related
   */
  static isNetworkError(error: unknown): boolean {
    return this.isCategory(error, ErrorCategory.Network);
  }

  /**
   * Check if error is validation-related
   */
  static isValidationError(error: unknown): boolean {
    return this.isCategory(error, ErrorCategory.Validation);
  }

  /**
   * Check if error is authentication-related
   */
  static isAuthError(error: unknown): boolean {
    return this.isCategory(error, ErrorCategory.Authentication);
  }
}

/**
 * Convenience function for error handling
 */
export const handleError = ErrorHandler.handle.bind(ErrorHandler);

/**
 * Convenience function for silent error handling
 */
export const handleErrorSilent = ErrorHandler.handleSilent.bind(ErrorHandler);
