/**
 * useCVValidation
 *
 * Owns all CV validation orchestration: debouncing (via useDebouncedCallback),
 * calling the validation API, parsing error strings into ValidationError[],
 * and filtering by visible sections.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { CVValidationService } from "../services/cvValidationService";
import { CVData } from "../types";
import {
  filterHiddenSectionErrors,
  getVisibleSectionIds,
  parseValidationErrors,
  ValidationError,
} from "../utils/validation";
import { useDebouncedCallback } from "./useDebouncedCallback";

const DEBOUNCE_MS = 500;

export interface UseCVValidationOptions {
  cvId: string | undefined;
  cvData: CVData | undefined;
  /** When true, skip validation (e.g. new/temp CV with no backend record) */
  enabled?: boolean;
}

export interface UseCVValidationResult {
  validationErrors: ValidationError[];
  isValidating: boolean;
  setValidationErrors: (errors: ValidationError[]) => void;
  clearValidationErrors: () => void;
}

/**
 * Debounced backend validation for CV editor. Validates on load and when cvData
 * changes; filters errors for hidden sections.
 */
export function useCVValidation({
  cvId,
  cvData,
  enabled = true,
}: UseCVValidationOptions): UseCVValidationResult {
  const [validationErrors, setValidationErrorsState] = useState<
    ValidationError[]
  >([]);
  const [isValidating, setIsValidating] = useState(false);
  const previousCvIdRef = useRef<string | undefined>(undefined);

  const setValidationErrors = useCallback((errors: ValidationError[]) => {
    setValidationErrorsState(errors);
  }, []);

  const clearValidationErrors = useCallback(() => {
    setValidationErrorsState([]);
  }, []);

  const currentCvIdRef = useRef<string | undefined>(cvId);
  currentCvIdRef.current = cvId;

  // Track validation request sequence to prevent out-of-order responses
  const validationSequenceRef = useRef(0);

  const runValidation = useCallback(async (id: string, data: CVData) => {
    // Increment and capture sequence number for this specific request
    const thisSequence = ++validationSequenceRef.current;

    setIsValidating(true);

    try {
      const errors = await CVValidationService.validateCV(id, data);

      // Guard 1: Check if CV changed (user switched to different CV)
      if (currentCvIdRef.current !== id) {
        console.log("[useCVValidation] Discarding stale validation for", id,
                    "current CV is", currentCvIdRef.current);
        return;
      }

      // Guard 2: Check if this response is from the most recent request
      if (thisSequence !== validationSequenceRef.current) {
        console.log("[useCVValidation] Discarding out-of-order response",
                    "seq", thisSequence, "latest is", validationSequenceRef.current);
        return;
      }

      const message =
        errors.length > 0
          ? "CV validation failed:\n• " + errors.join("\n• ")
          : "";
      const parsed =
        message.length > 0 ? parseValidationErrors(message) : [];
      const visibleIds = getVisibleSectionIds(data.section_config ?? undefined);
      const filtered = filterHiddenSectionErrors(parsed, visibleIds);
      setValidationErrorsState(filtered);
    } catch (err) {
      // Only clear errors if this CV is still active and request is latest
      if (currentCvIdRef.current === id && thisSequence === validationSequenceRef.current) {
        setValidationErrorsState([]);
      }
      console.error("[useCVValidation] Validation request failed", {
        cvId: id,
        sequence: thisSequence,
        err,
      });
    } finally {
      setIsValidating(false);
    }
  }, []);

  const debouncedRun = useDebouncedCallback(runValidation, {
    delayMs: DEBOUNCE_MS,
    disabled: !enabled,
  });

  useEffect(() => {
    if (previousCvIdRef.current !== cvId) {
      previousCvIdRef.current = cvId;
      setValidationErrorsState([]);
    }

    if (!enabled || !cvId || !cvData) return;
    if (cvId === "new" || cvId.startsWith("temp-")) return;

    debouncedRun(cvId, cvData);
  }, [cvId, cvData, enabled, debouncedRun]);

  return {
    validationErrors,
    isValidating,
    setValidationErrors,
    clearValidationErrors,
  };
}
