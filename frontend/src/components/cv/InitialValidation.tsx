/**
 * Component that performs initial validation when CV data is loaded
 * Uses backend validation by triggering a save and catching validation errors.
 * Skips this save for temporary/new CVs so we don't persist a blank CV when the
 * user opens "From Scratch" and leaves without making changes.
 */
import React, { useEffect, useRef } from "react";
import { useCVEditor } from "../../contexts/CVEditorContext";
import { isTempCVId } from "../../stores/cv/constants";
import { CVData } from "../../types";

interface InitialValidationProps {
  children: React.ReactNode;
  cvId?: string;
}

export const InitialValidation: React.FC<InitialValidationProps> = ({
  children,
  cvId,
}) => {
  const { cvData, onSave, clearValidationErrors } = useCVEditor();
  const previousCvId = useRef<string | undefined>(undefined);
  const lastValidatedCvData = useRef<CVData | null>(null);
  const previousCvDataWasNull = useRef<boolean>(true);
  const isValidationInProgress = useRef<boolean>(false);

  useEffect(() => {
    // Clear validation errors when CV ID changes (new CV loaded)
    if (cvId !== previousCvId.current) {
      clearValidationErrors();
      lastValidatedCvData.current = null;
      previousCvId.current = cvId;
      previousCvDataWasNull.current = true;
      isValidationInProgress.current = false;
    }

    // Skip if no cvData or cvId
    if (!cvData || !cvId) {
      previousCvDataWasNull.current = true;
      return;
    }

    // Track when cvData transitions from null to available (initial load)
    const cvDataJustBecameAvailable = previousCvDataWasNull.current && !!cvData;
    previousCvDataWasNull.current = false;

    // Skip if we've already validated this exact cvData object
    // BUT: Always validate when cvData first becomes available (initial load)
    if (lastValidatedCvData.current === cvData && !cvDataJustBecameAvailable) {
      return;
    }

    // Skip if validation is already in progress
    if (isValidationInProgress.current) {
      return;
    }

    // Mark this cvData as validated (to prevent duplicate runs)
    lastValidatedCvData.current = cvData;

    // Trigger backend validation by calling save (only for persisted CVs)
    // Skip for temporary/new CVs so we don't persist a blank CV when user opens
    // "From Scratch" and leaves without making changes.
    const isNewOrTempCV = cvId === "new" || isTempCVId(cvId);
    if (cvDataJustBecameAvailable && !isNewOrTempCV) {
      isValidationInProgress.current = true;

      // Call save without a message to trigger validation
      // The SaveWithValidationErrors component will handle 422 errors and display them
      // If validation passes, the save will succeed (which is fine - same data)
      onSave(cvData).catch((error) => {
        // Error is handled by SaveWithValidationErrors component via cv-save-error event
        // We don't need to do anything here - the error handling is already set up
      }).finally(() => {
        isValidationInProgress.current = false;
      });
    }
  }, [cvData, cvId, onSave, clearValidationErrors]);

  return <>{children}</>;
};
