/**
 * Hook for field validation state
 * Provides error states for form fields based on validation errors
 */
import { useCVEditor } from "../contexts/CVEditorContext";
import { hasFieldError, getFieldError } from "../utils/validation";

export const useFieldValidation = (
  section: string,
  itemIndex?: number,
  field?: string,
) => {
  const { validationErrors } = useCVEditor();

  const hasError = hasFieldError(validationErrors, section, itemIndex, field);
  const errorMessage = getFieldError(
    validationErrors,
    section,
    itemIndex,
    field,
  );

  // Debug log when field has error
  if (hasError && errorMessage) {
    console.log(`[useFieldValidation] Field has error: ${section}${itemIndex !== undefined ? `.${itemIndex}` : ''}${field ? `.${field}` : ''}`, {
      section,
      itemIndex,
      field,
      errorMessage,
      matchingErrors: validationErrors.filter(e =>
        e.section === section &&
        (itemIndex === undefined || e.itemIndex === itemIndex) &&
        (field === undefined || e.field === field)
      ),
    });
  }

  return {
    hasError,
    errorMessage,
    fieldProps: {
      error: hasError,
      helperText: errorMessage,
    },
  };
};
