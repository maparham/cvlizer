/**
 * Hook for field validation state
 * Provides error states for form fields based on validation errors
 */
import { useCVEditor } from '../contexts/CVEditorContext'
import { hasFieldError, getFieldError } from '../utils/validationUtils'

export const useFieldValidation = (section: string, itemIndex?: number, field?: string) => {
  const { validationErrors } = useCVEditor()

  const hasError = hasFieldError(validationErrors, section, itemIndex, field)
  const errorMessage = getFieldError(validationErrors, section, itemIndex, field)

  return {
    hasError,
    errorMessage,
    fieldProps: {
      error: hasError,
      helperText: errorMessage
    }
  }
}
