/**
 * Validation Types
 *
 * Type definitions for validation utilities.
 */

/**
 * Validation error structure for CV data validation
 */
export interface ValidationError {
  section: string;
  itemIndex?: number;
  field: string;
  message: string;
}

/**
 * Field validation result
 */
export interface FieldValidationResult {
  isValid: boolean;
  message?: string;
}
