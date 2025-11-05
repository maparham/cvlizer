/**
 * Custom hook for job description parsing polling
 *
 * This hook centralizes the polling logic for job description parsing status updates,
 * providing a consistent interface for both modal and sidebar components.
 *
 * Key responsibilities:
 * - Poll for job description parsing completion
 * - Handle parsing errors and success states
 * - Provide loading states and error handling
 * - Clean up polling intervals on unmount
 *
 * Usage:
 * - Import in components that need to track job description parsing
 * - Pass job descriptions array and optional callbacks
 * - Hook returns parsing state and utility functions
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { useAIStore } from "../stores/ai";
import { JobDescription } from "../types/ai";
import { POLLING_CONFIG } from "../config/constants";

interface UseJobDescriptionPollingOptions {
  onParsingComplete?: (jobDescription: JobDescription) => void;
  onParsingError?: (jobDescription: JobDescription, error: string) => void;
  pollingInterval?: number;
}

interface UseJobDescriptionPollingReturn {
  parsingJobDescriptions: Set<string>;
  isPolling: boolean;
  startPolling: (jobDescriptionIds: string[]) => void;
  stopPolling: () => void;
}

export const useJobDescriptionPolling = (
  jobDescriptions: JobDescription[],
  options: UseJobDescriptionPollingOptions = {},
): UseJobDescriptionPollingReturn => {
  const {
    onParsingComplete,
    onParsingError,
    pollingInterval = POLLING_CONFIG.JOB_DESCRIPTION_INTERVAL,
  } = options;

  const [parsingJobDescriptions, setParsingJobDescriptions] = useState<
    Set<string>
  >(new Set());
  const [isPolling, setIsPolling] = useState(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const processedJobDescriptionsRef = useRef<Set<string>>(new Set());
  const { updateJobDescriptionStatus } = useAIStore();

  // Use refs to store callbacks to avoid dependency issues
  const onParsingCompleteRef = useRef(onParsingComplete);
  const onParsingErrorRef = useRef(onParsingError);

  // Update refs when callbacks change
  useEffect(() => {
    onParsingCompleteRef.current = onParsingComplete;
    onParsingErrorRef.current = onParsingError;
  }, [onParsingComplete, onParsingError]);

  // Start polling for specific job description IDs
  const startPolling = useCallback(
    (jobDescriptionIds: string[]) => {
      if (jobDescriptionIds.length === 0) return;

      setParsingJobDescriptions(new Set(jobDescriptionIds));
      setIsPolling(true);

      // Clear any existing polling
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }

      pollingIntervalRef.current = setInterval(async () => {
        const stillParsing = new Set<string>();

        for (const id of jobDescriptionIds) {
          try {
            const updated = await updateJobDescriptionStatus(id);

            if (updated.is_parsing) {
              stillParsing.add(id);
            } else {
              // Parsing completed - check if we've already processed this job description
              if (processedJobDescriptionsRef.current.has(id)) {
                continue;
              }

              // Mark as processed
              processedJobDescriptionsRef.current.add(id);

              if (updated.parse_error) {
                // Parsing failed - error will be displayed in the sidebar card
                onParsingErrorRef.current?.(updated, updated.parse_error);
                // Don't show temporary alert - the error appears in the sidebar
              } else {
                // Parsing succeeded
                onParsingCompleteRef.current?.(updated);
              }
            }
          } catch (error) {
            console.error(`Failed to update job description ${id}:`, error);
            // Remove from parsing set on error
          }
        }

        setParsingJobDescriptions(stillParsing);

        // Stop polling if no more parsing job descriptions
        if (stillParsing.size === 0) {
          setIsPolling(false);
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
        }
      }, pollingInterval);
    },
    [updateJobDescriptionStatus, pollingInterval],
  ); // Remove callback dependencies

  // Stop polling
  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    setIsPolling(false);
    setParsingJobDescriptions(new Set());
    processedJobDescriptionsRef.current.clear();
  }, []);

  // Auto-start polling when job descriptions with is_parsing=true are detected
  useEffect(() => {
    const parsingIds = jobDescriptions
      .filter((jd) => jd.is_parsing)
      .map((jd) => jd.id);

    // Only update polling if the parsing IDs have actually changed
    const currentParsingIds = Array.from(parsingJobDescriptions)
      .sort()
      .join(",");
    const newParsingIds = parsingIds.sort().join(",");

    if (newParsingIds !== currentParsingIds) {
      if (parsingIds.length > 0) {
        startPolling(parsingIds);
      } else {
        stopPolling();
      }
    }

  }, [jobDescriptions]); // Only depend on jobDescriptions to prevent infinite loop

  // Separate effect for cleanup on unmount only
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, []); // Empty deps = only runs on mount/unmount

  return {
    parsingJobDescriptions,
    isPolling,
    startPolling,
    stopPolling,
  };
};
