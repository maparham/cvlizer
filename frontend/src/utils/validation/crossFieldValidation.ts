/**
 * Cross-Field Validation Utilities
 *
 * Functions for validating relationships between multiple fields,
 * such as date ranges and current job logic.
 */

export const validateCrossFields = (
  data: any,
): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  // Validate top-level date ranges (for direct field validation)
  if (data.start_date && data.end_date) {
    const startDate = new Date(data.start_date);
    const endDate = new Date(data.end_date);

    if (isNaN(startDate.getTime())) {
      errors.push("Start date is invalid");
    }
    if (isNaN(endDate.getTime())) {
      errors.push("End date is invalid");
    }

    // Only compare if both dates are valid
    if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
      if (startDate > endDate) {
        errors.push("End date must be after start date");
      }
    }
  }

  // Validate current job logic (for direct field validation)
  if (data.current && data.end_date) {
    errors.push("End date should be empty when currently working");
  }

  // Validate work experience date ranges
  if (data.work_experience && Array.isArray(data.work_experience)) {
    data.work_experience.forEach((work: any, index: number) => {
      if (work.start_date && work.end_date) {
        const startDate = new Date(work.start_date);
        const endDate = new Date(work.end_date);

        if (isNaN(startDate.getTime())) {
          errors.push(`Work experience #${index + 1}: Start date is invalid`);
        }
        if (isNaN(endDate.getTime())) {
          errors.push(`Work experience #${index + 1}: End date is invalid`);
        }

        // Only compare if both dates are valid
        if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
          if (startDate > endDate) {
            errors.push(
              `Work experience #${index + 1}: End date must be after start date`,
            );
          }
        }
      }

      // Validate current job logic
      if (work.current && work.end_date) {
        errors.push(
          `Work experience #${index + 1}: End date should be empty when currently working`,
        );
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
