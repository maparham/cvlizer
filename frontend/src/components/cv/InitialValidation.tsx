/**
 * Component that performs initial validation when CV data is loaded
 */
import React, { useEffect, useRef } from "react";
import { useCVEditor } from "../../contexts/CVEditorContext";
import { validateCVData } from "../../utils/validation";
import { useNotifications } from "../../packages/notifications";

interface InitialValidationProps {
  children: React.ReactNode;
  cvId?: string;
}

export const InitialValidation: React.FC<InitialValidationProps> = ({
  children,
  cvId,
}) => {
  const { cvData, setValidationErrors, validationErrors } = useCVEditor();
  const { showValidationError } = useNotifications();
  const hasShownNotification = useRef<string | undefined>(undefined);

  useEffect(() => {
    // Only run initial validation if we don't already have validation errors
    // (to avoid overriding errors from save attempts)
    if (cvData && validationErrors.length === 0) {
      console.log('[InitialValidation] Running validation', {
        cvId,
        hasCvData: !!cvData,
        existingErrors: validationErrors.length,
      });

      const validationResult = validateCVData(cvData);

      console.log('[InitialValidation] Validation result', {
        isValid: validationResult.isValid,
        fieldErrorsCount: Object.keys(validationResult.errors).length,
        crossFieldErrorsCount: validationResult.crossFieldErrors.length,
        duplicateErrorsCount: validationResult.duplicates.duplicates.length,
        fieldErrors: validationResult.errors,
        crossFieldErrors: validationResult.crossFieldErrors,
        duplicates: validationResult.duplicates,
      });

      if (!validationResult.isValid) {
        // Map errors to their correct sections and items
        const mappedErrors = Object.entries(validationResult.errors).map(([key, message]) => {
          // Parse error key like "work_experience.0.position" or "education.1.start_date"
          const parts = key.split('.');
          if (parts.length >= 2) {
            const section = parts[0];
            const itemIndex = parts.length >= 3 ? parseInt(parts[1], 10) : undefined;
            const field = parts.length >= 3 ? parts[2] : parts[1];
            return {
              section,
              itemIndex,
              field,
              message: message as string,
            };
          }
          // Fallback for non-mapped errors
          return {
            section: "general",
            field: "general",
            message: message as string,
          };
        });

        // Add cross-field errors as general errors
        const crossFieldMapped = validationResult.crossFieldErrors.map((message) => ({
          section: "general",
          field: "general",
          message,
        }));

        const allErrors = [...mappedErrors, ...crossFieldMapped];

        console.log('[InitialValidation] Setting validation errors', {
          mappedErrorsCount: mappedErrors.length,
          crossFieldMappedCount: crossFieldMapped.length,
          totalErrors: allErrors.length,
          allErrors,
        });

        setValidationErrors(allErrors);

        // Show notification to user only once per CV
        if (hasShownNotification.current !== cvId) {
          const totalErrors = allErrors.length;
          console.log('[InitialValidation] Showing validation notification', {
            cvId,
            totalErrors,
          });
          showValidationError(
            "CV Validation Issues",
            `Please fix ${totalErrors} validation error${totalErrors > 1 ? 's' : ''} before saving.`,
          );
          hasShownNotification.current = cvId;
        }
      } else {
        console.log('[InitialValidation] CV data is valid, no errors');
      }
    }
  }, [cvData, setValidationErrors, validationErrors.length, cvId, showValidationError]);

  return <>{children}</>;
};
