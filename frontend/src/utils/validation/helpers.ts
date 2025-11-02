/**
 * Validation Helper Utilities
 *
 * Helper functions for working with validation errors, including
 * error formatting, field checking, and summary generation.
 */

import { ValidationError } from "./types";
import { validateCrossFields } from "./crossFieldValidation";
import { checkForDuplicates } from "./duplicateChecking";

/**
 * Check if a value is empty or an invalid string
 *
 * @param value - Value to check
 * @returns true if value is empty, null, undefined, or invalid string
 */
export const isEmptyOrInvalidString = (value: any): boolean => {
  return !value || typeof value !== 'string' || value.trim() === "";
};

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

/**
 * Validate CV data client-side and return validation errors
 */
export const validateCVData = (
  cvData: any,
): {
  isValid: boolean;
  errors: Record<string, string>;
  crossFieldErrors: string[];
  duplicates: { hasDuplicates: boolean; duplicates: number[] };
} => {
  const fieldErrors: Record<string, string> = {};
  const crossFieldErrors: string[] = [];

  // Validate personal info section
  if (cvData.personal_info) {
    const personalInfo = cvData.personal_info;
    if (isEmptyOrInvalidString(personalInfo.full_name)) {
      fieldErrors['personal_info.full_name'] = "Full name is required";
    }
    if (isEmptyOrInvalidString(personalInfo.email)) {
      fieldErrors['personal_info.email'] = "Email is required";
    }
    if (isEmptyOrInvalidString(personalInfo.location)) {
      fieldErrors['personal_info.location'] = "Location is required";
    }
  }

  // Validate education section
  if (cvData.education && Array.isArray(cvData.education)) {
    cvData.education.forEach((edu: any, index: number) => {
      // Check required fields
      if (isEmptyOrInvalidString(edu.start_date)) {
        fieldErrors[`education.${index}.start_date`] = "Start date is required";
      }

      if (isEmptyOrInvalidString(edu.degree)) {
        fieldErrors[`education.${index}.degree`] = "Degree is required";
      }

      if (isEmptyOrInvalidString(edu.institution)) {
        fieldErrors[`education.${index}.institution`] =
          "Institution is required";
      }
    });
  }

  // Validate work experience section
  if (cvData.work_experience && Array.isArray(cvData.work_experience)) {
    cvData.work_experience.forEach((work: any, index: number) => {
      if (isEmptyOrInvalidString(work.start_date)) {
        fieldErrors[`work_experience.${index}.start_date`] =
          "Start date is required";
      }

      if (isEmptyOrInvalidString(work.position)) {
        fieldErrors[`work_experience.${index}.position`] =
          "Position is required";
      }

      if (isEmptyOrInvalidString(work.company)) {
        fieldErrors[`work_experience.${index}.company`] = "Company is required";
      }
    });
  }

  // Run cross-field validation
  const crossFieldResult = validateCrossFields(cvData);
  crossFieldErrors.push(...crossFieldResult.errors);

  // Check for duplicates in work experience
  const workDuplicates = cvData.work_experience
    ? checkForDuplicates(cvData.work_experience, ["company", "position"])
    : { hasDuplicates: false, duplicates: [] };

  // Check for duplicates in education
  const educationDuplicates = cvData.education
    ? checkForDuplicates(cvData.education, ["institution", "degree"])
    : { hasDuplicates: false, duplicates: [] };

  const hasAnyDuplicates =
    workDuplicates.hasDuplicates || educationDuplicates.hasDuplicates;
  const allDuplicates = [
    ...workDuplicates.duplicates,
    ...educationDuplicates.duplicates,
  ];

  return {
    isValid:
      Object.keys(fieldErrors).length === 0 &&
      crossFieldErrors.length === 0 &&
      !hasAnyDuplicates,
    errors: fieldErrors,
    crossFieldErrors,
    duplicates: {
      hasDuplicates: hasAnyDuplicates,
      duplicates: allDuplicates,
    },
  };
};

/**
 * Get validation summary with error counts and human-readable message
 */
export const getValidationSummary = (validation: {
  isValid: boolean;
  errors: Record<string, string>;
  crossFieldErrors: string[];
  duplicates: { hasDuplicates: boolean; duplicates: number[] };
}): { hasErrors: boolean; errorCount: number; summary: string } => {
  const fieldErrorCount = Object.keys(validation.errors).length;
  const crossFieldErrorCount = validation.crossFieldErrors.length;
  const duplicateCount = validation.duplicates.duplicates.length;
  const totalErrors = fieldErrorCount + crossFieldErrorCount + duplicateCount;

  let summary = "All fields are valid";
  if (totalErrors > 0) {
    const parts = [];
    if (fieldErrorCount > 0)
      parts.push(
        `${fieldErrorCount} field error${fieldErrorCount > 1 ? "s" : ""}`,
      );
    if (crossFieldErrorCount > 0)
      parts.push(
        `${crossFieldErrorCount} cross-field error${crossFieldErrorCount > 1 ? "s" : ""}`,
      );
    if (duplicateCount > 0)
      parts.push(`${duplicateCount} duplicate${duplicateCount > 1 ? "s" : ""}`);
    summary = parts.join(", ");
  }

  return {
    hasErrors: totalErrors > 0,
    errorCount: totalErrors,
    summary,
  };
};
