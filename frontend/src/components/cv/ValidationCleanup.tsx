/**
 * Clears validation errors when the user switches to a different CV.
 * Real-time validation (on load and on cvData change) is handled by
 * useCVValidation inside usePDFCVEditor.
 */
import React, { useEffect, useRef } from "react";
import { useCVEditor } from "../../contexts/CVEditorContext";

interface ValidationCleanupProps {
  children: React.ReactNode;
  cvId?: string;
}

export const ValidationCleanup: React.FC<ValidationCleanupProps> = ({
  children,
  cvId,
}) => {
  const { clearValidationErrors } = useCVEditor();
  const previousCvId = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (cvId !== previousCvId.current) {
      clearValidationErrors();
      previousCvId.current = cvId;
    }
  }, [cvId, clearValidationErrors]);

  return <>{children}</>;
};
