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
      const validationResult = validateCVData(cvData);

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

        // Parse cross-field errors to extract section and item index
        const crossFieldMapped = validationResult.crossFieldErrors.map((message) => {
          // Parse messages like:
          // "Work experience #1: End date must be after start date"
          // "Education #2: End date cannot be 'Present'"
          // "Work experience #1: End date should be empty when currently working"

          const workExpMatch = message.match(/^Work experience #(\d+):/i);
          const educationMatch = message.match(/^Education #(\d+):/i);

          if (workExpMatch) {
            const itemIndex = parseInt(workExpMatch[1], 10) - 1; // Convert to 0-based index
            // Extract field name from message (e.g., "end_date", "start_date")
            let field = "end_date"; // Default to end_date for date-related errors
            if (message.includes("Start date")) field = "start_date";
            if (message.includes("End date")) field = "end_date";
            if (message.includes("currently working")) field = "current";

            return {
              section: "work_experience",
              itemIndex,
              field,
              message,
            };
          } else if (educationMatch) {
            const itemIndex = parseInt(educationMatch[1], 10) - 1; // Convert to 0-based index
            let field = "end_date"; // Default to end_date for date-related errors
            if (message.includes("Start date")) field = "start_date";
            if (message.includes("End date")) field = "end_date";

            return {
              section: "education",
              itemIndex,
              field,
              message,
            };
          }

          // Fallback for unrecognized cross-field errors
          return {
            section: "general",
            field: "general",
            message,
          };
        });

        const allErrors = [...mappedErrors, ...crossFieldMapped];

        setValidationErrors(allErrors);

        // Scroll to first error field/item (accounting for header height)
        const firstError = allErrors.find(e => e.section !== "general");
        if (firstError) {
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
            }
          }, 500); // Delay to ensure DOM is updated
        }

        // Show notification to user only once per CV
        if (hasShownNotification.current !== cvId) {
          const totalErrors = allErrors.length;
          showValidationError(
            "CV Validation Issues",
            `Please fix ${totalErrors} validation error${totalErrors > 1 ? 's' : ''} before saving.`,
          );
          hasShownNotification.current = cvId;
        }
      }
    }
  }, [cvData, setValidationErrors, validationErrors.length, cvId, showValidationError]);

  return <>{children}</>;
};
