/**
 * Component that overrides the CV editor save function to handle validation errors
 */
import React, { useEffect } from "react";
import { useCVEditor } from "../../contexts/CVEditorContext";
import { parseValidationErrors, parsePydanticValidationErrors } from "../../utils/validation";

interface SaveWithValidationErrorsProps {
  children: React.ReactNode;
  onSaveError: (_error: unknown) => void;
}

export const SaveWithValidationErrors: React.FC<
  SaveWithValidationErrorsProps
> = ({ children, onSaveError: _onSaveError }) => {
  const { setValidationErrors, clearValidationErrors } = useCVEditor();

  // Listen for save errors from the parent component
  useEffect(() => {
    const handleSaveError = (event: CustomEvent) => {
      const error = event.detail;
      let validationErrors: ReturnType<typeof parseValidationErrors> = [];

      // Check if this is a 422 validation error with array format
      if (error?.response?.status === 422) {
        const responseData = error.response.data;

        // Try to parse Pydantic validation errors directly from response
        if (Array.isArray(responseData) ||
            (typeof responseData === "object" && responseData !== null &&
             (Array.isArray(responseData.detail) || Array.isArray(responseData.errors)))) {
          validationErrors = parsePydanticValidationErrors(responseData);
        } else {
          // Fall back to parsing error message string
          const errorMessage =
            error?.message || error?.response?.data?.message || "Failed to save CV";
          validationErrors = parseValidationErrors(errorMessage);
        }
      } else {
        // For non-422 errors, try parsing the error message
        const errorMessage =
          error?.message || error?.response?.data?.message || "Failed to save CV";
        validationErrors = parseValidationErrors(errorMessage);
      }

      if (validationErrors.length > 0) {
        setValidationErrors(validationErrors);
      }
    };

    window.addEventListener("cv-save-error", handleSaveError as EventListener);

    return () => {
      window.removeEventListener(
        "cv-save-error",
        handleSaveError as EventListener,
      );
    };
  }, [setValidationErrors]);

  // Listen for successful saves to clear validation errors
  useEffect(() => {
    const handleSaveSuccess = () => {
      clearValidationErrors();
    };

    window.addEventListener("cv-saved", handleSaveSuccess);

    return () => {
      window.removeEventListener("cv-saved", handleSaveSuccess);
    };
  }, [clearValidationErrors]);

  return <>{children}</>;
};
