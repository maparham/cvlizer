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
        console.log("[SaveWithValidationErrors] Setting validation errors from save error", {
          errorStatus: error?.response?.status,
          totalErrors: validationErrors.length,
          errorsBySection: validationErrors.reduce((acc, err) => {
            acc[err.section] = (acc[err.section] || 0) + 1;
            return acc;
          }, {} as Record<string, number>),
          allErrors: validationErrors,
        });
        setValidationErrors(validationErrors);

        // Scroll to first error field/item (accounting for header height)
        const firstError = validationErrors.find(e => e.section !== "general");
        if (firstError) {
          console.log("[SaveWithValidationErrors] Scrolling to first error", { error: firstError });
          setTimeout(() => {
            const sectionElement = document.querySelector(`[data-section="${firstError.section}"]`);
            if (sectionElement) {
              let targetElement: Element | null = null;

              // If we have an itemIndex, try to find the specific item
              if (firstError.itemIndex !== undefined) {
                const items = sectionElement.querySelectorAll('.individual-item-container');
                if (items[firstError.itemIndex]) {
                  targetElement = items[firstError.itemIndex];
                }
              }

              // Fallback to the section element
              if (!targetElement) {
                targetElement = sectionElement;
              }

              // Calculate scroll position accounting for header (64px AppBar height)
              const headerHeight = 64;
              const elementTop = targetElement.getBoundingClientRect().top + window.pageYOffset;
              const offsetPosition = elementTop - headerHeight - 20; // 20px extra padding

              window.scrollTo({
                top: offsetPosition,
                behavior: "smooth",
              });

              console.log("[SaveWithValidationErrors] Successfully scrolled to element", {
                section: firstError.section,
                itemIndex: firstError.itemIndex,
                field: firstError.field,
              });
            } else {
              console.warn("[SaveWithValidationErrors] Could not find section element", {
                section: firstError.section,
                selector: `[data-section="${firstError.section}"]`,
              });
            }
          }, 500); // Delay to ensure DOM is updated
        }
      } else {
        console.log("[SaveWithValidationErrors] No validation errors found in save error", {
          errorStatus: error?.response?.status,
          errorMessage: error?.message,
          responseData: error?.response?.data,
        });
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
