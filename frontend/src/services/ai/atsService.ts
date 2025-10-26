/**
 * ATS Optimization Service
 *
 * Handles ATS (Applicant Tracking System) optimization analysis for CVs.
 * Analyzes how well a CV matches job requirements for ATS systems.
 *
 * Key responsibilities:
 * - Analyze ATS optimization based on job description
 * - Provide keyword and content optimization suggestions
 */

import { apiClient as api } from "../api";
import {
  ATSOptimizationRequest,
  ATSOptimizationResponse,
  AIServiceError,
} from "../../types/ai";
import { cacheManager } from "./cache";

class ATSService {
  /**
   * Analyze ATS optimization
   */
  async analyzeATSOptimization(
    cvId: string,
    request: ATSOptimizationRequest,
  ): Promise<ATSOptimizationResponse> {
    const cacheKey = `ats-optimization-${cvId}-${request.job_description_id}`;
    const cached = cacheManager.getCachedData<ATSOptimizationResponse>(
      cacheKey,
    );
    if (cached) {
      return cached;
    }

    try {
      const response = await api.post<ATSOptimizationResponse>(
        `/api/cvs/${cvId}/optimize-ats`,
        request,
      );

      cacheManager.setCachedData(cacheKey, response.data);
      return response.data;
    } catch (error: any) {
      const aiError: AIServiceError = {
        error:
          error.response?.data?.detail || "Failed to analyze ATS optimization",
        details: error.message,
        code: error.response?.status?.toString(),
      };
      throw aiError;
    }
  }
}

// Export singleton instance
export const atsService = new ATSService();

// Export individual functions for convenience
export const { analyzeATSOptimization } = atsService;
