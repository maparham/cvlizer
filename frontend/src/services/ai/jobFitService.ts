/**
 * Job Fit Analysis Service
 *
 * Handles job fit analysis and draft management for CVs.
 * Manages job fit analysis API calls, draft creation, and approval workflows.
 *
 * Key responsibilities:
 * - Analyze job fit between CV and job description
 * - Create and manage job fit drafts
 * - Check draft status
 * - Approve and delete job fit drafts
 */

import { apiClient as api } from "../api";
import {
  JobFitAnalysisRequest,
  DraftResponse,
  AIServiceError,
} from "../../types/ai";
import { Logger } from "../../utils/logger";
import { cacheManager } from "./cache";

class JobFitService {
  /**
   * Analyze job fit between CV and job description (now returns immediately with background processing)
   */
  async analyzeJobFit(
    cvId: string,
    request: JobFitAnalysisRequest,
  ): Promise<DraftResponse> {
    try {
      const response = await api.post<DraftResponse>(
        `/api/cvs/${cvId}/analyze-job-fit`,
        request,
      );

      return response.data;
    } catch (error: any) {
      const aiError: AIServiceError = {
        error: error.response?.data?.detail || "Failed to analyze job fit",
        details: error.message,
        code: error.response?.status?.toString(),
      };
      throw aiError;
    }
  }

  /**
   * Check draft generation status
   */
  async getDraftStatus(draftId: string): Promise<DraftResponse> {
    try {
      const response = await api.get<DraftResponse>(
        `/api/drafts/${draftId}/status`,
      );

      return response.data;
    } catch (error: any) {
      Logger.error("Error getting draft status", {
        draftId,
        error: error.message,
      });
      const aiError: AIServiceError = {
        error: error.response?.data?.detail || "Failed to get draft status",
        details: error.message,
        code: error.response?.status?.toString(),
      };
      throw aiError;
    }
  }

  /**
   * Create a job fit analysis draft
   */
  async createJobFitDraft(
    cvId: string,
    jobDescriptionId: string,
  ): Promise<any> {
    try {
      const response = await api.post(`/api/cvs/${cvId}/analyze-job-fit`, {
        job_description_id: jobDescriptionId,
      });

      // Clear cache for this CV since we've created new content
      cacheManager.clearCacheForCV(cvId);

      return response.data;
    } catch (error: any) {
      Logger.error("createJobFitDraft API error", {
        cvId,
        jobDescriptionId,
        error: error.message,
      });
      const aiError: AIServiceError = {
        error: error.response?.data?.detail || "Failed to create job fit draft",
        details: error.message,
        code: error.response?.status?.toString(),
      };
      throw aiError;
    }
  }

  /**
   * Get all drafts for a CV
   * Always fetches fresh data from backend to ensure consistency after approve/reject actions
   */
  async getCVDrafts(cvId: string): Promise<any[]> {
    try {
      const response = await api.get(`/api/cvs/${cvId}/drafts`);
      return response.data.drafts;
    } catch (error: any) {
      const aiError: AIServiceError = {
        error: error.response?.data?.detail || "Failed to get CV drafts",
        details: error.message,
        code: error.response?.status?.toString(),
      };
      throw aiError;
    }
  }

  /**
   * Approve a why_good_fit draft
   */
  async approveWhyGoodFitDraft(cvId: string, draftId: string): Promise<any> {
    try {
      const response = await api.post(`/api/cvs/${cvId}/why_good_fit/approve`, {
        draft_id: draftId,
      });

      // Clear cache for this CV since we've updated it
      cacheManager.clearCacheForCV(cvId);

      return response.data;
    } catch (error: any) {
      const aiError: AIServiceError = {
        error: error.response?.data?.detail || "Failed to approve draft",
        details: error.message,
        code: error.response?.status?.toString(),
      };
      throw aiError;
    }
  }

  /**
   * Delete a why_good_fit draft
   */
  async deleteWhyGoodFitDraft(cvId: string): Promise<void> {
    try {
      await api.delete(`/api/cvs/${cvId}/why_good_fit/draft`);

      // Clear cache for this CV since we've deleted content
      cacheManager.clearCacheForCV(cvId);
    } catch (error: any) {
      const aiError: AIServiceError = {
        error: error.response?.data?.detail || "Failed to delete draft",
        details: error.message,
        code: error.response?.status?.toString(),
      };
      throw aiError;
    }
  }
}

// Export singleton instance
export const jobFitService = new JobFitService();

// Export individual functions for convenience
export const {
  analyzeJobFit,
  getDraftStatus,
  createJobFitDraft,
  getCVDrafts,
  approveWhyGoodFitDraft,
  deleteWhyGoodFitDraft,
} = jobFitService;
