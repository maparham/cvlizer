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

  console.log('[validateCrossFields] Starting validation', {
    hasWorkExperience: !!data.work_experience,
    workExperienceCount: data.work_experience?.length || 0,
    hasEducation: !!data.education,
    educationCount: data.education?.length || 0,
  });

  // Validate work experience date ranges
  if (data.work_experience && Array.isArray(data.work_experience)) {
    data.work_experience.forEach((work: any, index: number) => {
      // Only validate if both dates exist and are non-empty
      const hasStartDate = !isEmptyOrInvalidString(work.start_date);
      // Treat "Present" as empty for validation purposes (it's a display string, not a date)
      const endDateValue = work.end_date && typeof work.end_date === 'string'
        ? work.end_date.trim()
        : work.end_date;
      const isPresentString = endDateValue && endDateValue.toLowerCase() === 'present';
      const hasEndDate = !isEmptyOrInvalidString(work.end_date) && !isPresentString;

      console.log(`[validateCrossFields] Work #${index + 1}:`, {
        start_date: work.start_date,
        end_date: work.end_date,
        current: work.current,
        hasStartDate,
        hasEndDate,
        isPresentString,
      });

      // Skip date validation if current job has "Present" as end_date (display string)
      if (hasStartDate && hasEndDate) {
        const startDate = new Date(work.start_date);
        const endDate = new Date(work.end_date);

        if (isNaN(startDate.getTime())) {
          const errorMsg = `Work experience #${index + 1}: Start date is invalid`;
          console.log(`[validateCrossFields] Adding error: ${errorMsg}`);
          errors.push(errorMsg);
        }
        if (isNaN(endDate.getTime())) {
          const errorMsg = `Work experience #${index + 1}: End date is invalid`;
          console.log(`[validateCrossFields] Adding error: ${errorMsg}`);
          errors.push(errorMsg);
        }

        // Only compare if both dates are valid
        if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
          if (startDate > endDate) {
            const errorMsg = `Work experience #${index + 1}: End date must be after start date`;
            console.log(`[validateCrossFields] Adding error: ${errorMsg}`);
            errors.push(errorMsg);
          }
        }
      }

      // Validate current job logic - "Present" is valid for current jobs
      // Only error if end_date has an actual date value (not empty and not "Present")
      if (work.current && hasEndDate) {
        const errorMsg = `Work experience #${index + 1}: End date should be empty when currently working`;
        console.log(`[validateCrossFields] Adding error: ${errorMsg}`, {
          current: work.current,
          hasEndDate,
          end_date: work.end_date,
        });
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

      console.log(`[validateCrossFields] Education #${index + 1}:`, {
        start_date: edu.start_date,
        end_date: edu.end_date,
        hasStartDate,
        hasEndDate,
      });

      if (hasStartDate && hasEndDate) {
        const startDate = new Date(edu.start_date);
        const endDate = new Date(edu.end_date);

        if (isNaN(startDate.getTime())) {
          const errorMsg = `Education #${index + 1}: Start date is invalid`;
          console.log(`[validateCrossFields] Adding error: ${errorMsg}`);
          errors.push(errorMsg);
        }
        if (isNaN(endDate.getTime())) {
          const errorMsg = `Education #${index + 1}: End date is invalid`;
          console.log(`[validateCrossFields] Adding error: ${errorMsg}`);
          errors.push(errorMsg);
        }

        // Only compare if both dates are valid
        if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
          if (startDate > endDate) {
            const errorMsg = `Education #${index + 1}: End date must be after start date`;
            console.log(`[validateCrossFields] Adding error: ${errorMsg}`);
            errors.push(errorMsg);
          }
        }
      }
    });
  }

  console.log('[validateCrossFields] Validation complete', {
    errorCount: errors.length,
    errors,
  });

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
