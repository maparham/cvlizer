/**
 * Validation Helper Utilities
 *
 * Helper functions for working with validation errors, including
 * error formatting, field checking, and summary generation.
 */

import { ValidationError } from "./types";

/**
 * Create error key for form field identification
 */
export const createErrorKey = (
  section: string,
  itemIndex?: number,
  field?: string,
): string => {
  if (itemIndex !== undefined && field) {
    return `${section}.${itemIndex}.${field}`;
  }
  if (field) {
    return `${section}.${field}`;
  }
  return section;
};

/**
 * Check if a specific field has validation errors
 */
export const hasFieldError = (
  errors: ValidationError[],
  section: string,
  itemIndex?: number,
  field?: string,
): boolean => {
  return errors.some(
    (error) =>
      error.section === section &&
      (itemIndex === undefined || error.itemIndex === itemIndex) &&
      (field === undefined || error.field === field),
  );
};

/**
 * Get error message for a specific field
 */
export const getFieldError = (
  errors: ValidationError[],
  section: string,
  itemIndex?: number,
  field?: string,
): string | undefined => {
  const error = errors.find(
    (error) =>
      error.section === section &&
      (itemIndex === undefined || error.itemIndex === itemIndex) &&
      (field === undefined || error.field === field),
  );
  return error?.message;
};

/**
 * Check if a section has any validation errors
 */
export const hasSectionErrors = (
  errors: ValidationError[],
  section: string,
): boolean => {
  return errors.some((error) => error.section === section);
};

/**
 * Get count of validation errors for a section
 */
export const getSectionErrorCount = (
  errors: ValidationError[],
  section: string,
): number => {
  return errors.filter((error) => error.section === section).length;
};
