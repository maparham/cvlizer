/**
 * Utility Service for AI Features
 *
 * Provides utility functions for AI feature management.
 * Handles AI feature status checks, retry logic, and legacy methods.
 *
 * Key responsibilities:
 * - Check if AI features are enabled
 * - Retry failed operations with exponential backoff
 * - Provide legacy unified suggestions endpoint
 */

import { apiClient as api } from "../api";
import { AllSuggestionsResponse } from "../../types/ai";
import { Logger } from "../../utils/logger";

class UtilityService {
  /**
   * Check if AI features are enabled
   */
  async checkAIFeatureStatus(): Promise<boolean> {
    try {
      // Try to make a simple request to check if AI is enabled
      // This could be a dedicated endpoint or we can use an existing one
      const response = await api.get("/health/ai");
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  /**
   * Retry a failed AI operation with exponential backoff
   */
  async retryWithBackoff<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000,
  ): Promise<T> {
    let lastError: any;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;

        if (attempt < maxRetries - 1) {
          const delay = baseDelay * Math.pow(2, attempt);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }

  /**
   * Generate ALL AI suggestions in one unified call (synchronous - kept for backward compatibility)
   */
  async generateAllSuggestions(
    cvId: string,
    jobDescriptionId: string,
  ): Promise<AllSuggestionsResponse> {
    try {
      const response = await api.post<AllSuggestionsResponse>(
        `/cvs/${cvId}/ai-suggestions/generate`,
        { job_description_id: jobDescriptionId },
      );

      return response.data;
    } catch (error: any) {
      // Graceful degradation - return empty structures on error
      Logger.error("Error generating all suggestions", {
        cvId,
        jobDescriptionId,
        error: error.message,
      });
      return {
        skills: { technical: [], soft: [] },
        professional_summary: {
          suggested_text: "",
          original_text: "",
          key_changes: [],
        },
      };
    }
  }
}

// Export singleton instance
export const utilityService = new UtilityService();

// Export individual functions for convenience
export const {
  checkAIFeatureStatus,
  retryWithBackoff,
  generateAllSuggestions,
} = utilityService;
