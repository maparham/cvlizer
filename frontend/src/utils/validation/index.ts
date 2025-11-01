/**
 * Validation Utilities - Public API
 *
 * This module provides utilities for parsing and handling CV validation errors
 * from the backend. It includes error parsing, formatting, and display utilities
 * for user-friendly error messages.
 *
 * This is the main entry point for validation utilities. All exports maintain
 * backward compatibility with the original validationUtils module.
 */

// Type exports
export type { ValidationError, FieldValidationResult } from "./types";

// Error parsing exports
export {
  parseValidationErrors,
  parsePydanticValidationErrors,
} from "./errorParsing";

// Field validation exports
export {
  validateField,
  validateAllFields,
  validateJobPostingUrl,
  createValidationRules,
} from "./fieldValidation";

// Cross-field validation exports
export {
  validateCrossFields,
  createCrossFieldValidations,
} from "./crossFieldValidation";

// Duplicate checking exports
export { checkForDuplicates } from "./duplicateChecking";

// Helper function exports
export {
  createErrorKey,
  hasFieldError,
  getFieldError,
  hasSectionErrors,
  getSectionErrorCount,
  validateCVData,
  getValidationSummary,
} from "./helpers";
