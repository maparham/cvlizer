/**
 * Cross-Field Validation Utilities
 *
 * Functions for validating relationships between multiple fields,
 * such as date ranges and current job logic.
 */

import { isEmptyOrInvalidString } from './helpers';

export const validateCrossFields = (
  data: any,
): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  // Validate work experience date ranges
  if (data.work_experience && Array.isArray(data.work_experience)) {
    data.work_experience.forEach((work: any, index: number) => {
      // Only validate if both dates exist and are non-empty
      const hasStartDate = !isEmptyOrInvalidString(work.start_date);
      const hasEndDate = !isEmptyOrInvalidString(work.end_date);

      // Reject "Present" string in end_date - should only be valid ISO dates or empty
      if (work.end_date && typeof work.end_date === 'string') {
        const trimmedEndDate = work.end_date.trim();
        if (trimmedEndDate.toLowerCase() === 'present') {
          const errorMsg = `Work experience #${index + 1}: End date cannot be "Present". Use empty value for current positions.`;
          errors.push(errorMsg);
        }
      }

      // Validate date order only if both dates exist
      if (hasStartDate && hasEndDate) {
        const startDate = new Date(work.start_date);
        const endDate = new Date(work.end_date);

        if (isNaN(startDate.getTime())) {
          const errorMsg = `Work experience #${index + 1}: Start date is invalid`;
          errors.push(errorMsg);
        }
        if (isNaN(endDate.getTime())) {
          const errorMsg = `Work experience #${index + 1}: End date is invalid`;
          errors.push(errorMsg);
        }

        // Only compare if both dates are valid
        if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
          if (startDate > endDate) {
            const errorMsg = `Work experience #${index + 1}: End date must be after start date`;
            errors.push(errorMsg);
          }
        }
      }

      // Validate current job logic - current=true must have empty end_date
      if (work.current && hasEndDate) {
        const errorMsg = `Work experience #${index + 1}: End date should be empty when currently working`;
        errors.push(errorMsg);
      }
    });
  }

  // Validate education date ranges (if applicable)
  if (data.education && Array.isArray(data.education)) {
    data.education.forEach((edu: any, index: number) => {
      // Only validate if both dates exist and are non-empty
      const hasStartDate = !isEmptyOrInvalidString(edu.start_date);
      const hasEndDate = !isEmptyOrInvalidString(edu.end_date);

      if (hasStartDate && hasEndDate) {
        const startDate = new Date(edu.start_date);
        const endDate = new Date(edu.end_date);

        if (isNaN(startDate.getTime())) {
          const errorMsg = `Education #${index + 1}: Start date is invalid`;
          errors.push(errorMsg);
        }
        if (isNaN(endDate.getTime())) {
          const errorMsg = `Education #${index + 1}: End date is invalid`;
          errors.push(errorMsg);
        }

        // Only compare if both dates are valid
        if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
          if (startDate > endDate) {
            const errorMsg = `Education #${index + 1}: End date must be after start date`;
            errors.push(errorMsg);
          }
        }
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

export const createCrossFieldValidations = () => {
  return [
    { fields: ["start_date", "end_date"], type: "date_range" },
    { fields: ["current", "end_date"], type: "current_job" },
  ];
};
