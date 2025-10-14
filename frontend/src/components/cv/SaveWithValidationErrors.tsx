/**
 * Component that overrides the CV editor save function to handle validation errors
 */
import React, { useEffect } from "react";
import { useCVEditor } from "../../contexts/CVEditorContext";
import { parseValidationErrors } from "../../utils/validationUtils";

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
      const errorMessage =
        error?.message || error?.response?.data?.message || "Failed to save CV";
      const validationErrors = parseValidationErrors(errorMessage);

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
