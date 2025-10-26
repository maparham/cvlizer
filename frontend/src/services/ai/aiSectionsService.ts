/**
 * AI Sections Service
 *
 * Handles AI section generation and AI enhancement management.
 * Manages AI-generated sections for CVs and AI enhancement lifecycle.
 *
 * Key responsibilities:
 * - Generate AI sections (why_good_fit, etc.)
 * - Get AI sections for a CV
 * - Create, update, and delete AI enhancements
 * - Get AI enhancement status and latest enhancements
 */

import { apiClient as api } from "../api";
import {
  AISectionResponse,
  AISectionListResponse,
  AIEnhancementResponse,
  AIEnhancementCreateResponse,
  AIServiceError,
} from "../../types/ai";
import { Logger } from "../../utils/logger";
import { cacheManager } from "./cache";

class AISectionsService {
  /**
   * Generate AI section for CV
   */
  async generateAISection(
    cvId: string,
    jobDescriptionId: string,
    sectionType: string = "why_good_fit",
  ): Promise<AISectionResponse> {
    try {
      const response = await api.post<AISectionResponse>(
        `/api/cvs/${cvId}/generate-section`,
        {
          job_description_id: jobDescriptionId,
          section_type: sectionType,
        },
      );

      // Clear cache for this CV since we've generated new content
      cacheManager.clearCacheForCV(cvId);

      return response.data;
    } catch (error: any) {
      const aiError: AIServiceError = {
        error: error.response?.data?.detail || "Failed to generate AI section",
        details: error.message,
        code: error.response?.status?.toString(),
      };
      throw aiError;
    }
  }

  /**
   * Get AI sections for a CV
   */
  async getAISections(cvId: string): Promise<AISectionResponse[]> {
    const cacheKey = `ai-sections-${cvId}`;
    const cached = cacheManager.getCachedData<AISectionResponse[]>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const response = await api.get<AISectionListResponse>(
        `/api/cvs/${cvId}/ai-sections`,
      );

      cacheManager.setCachedData(cacheKey, response.data.ai_sections);
      return response.data.ai_sections;
    } catch (error: any) {
      const aiError: AIServiceError = {
        error: error.response?.data?.detail || "Failed to get AI sections",
        details: error.message,
        code: error.response?.status?.toString(),
      };
      throw aiError;
    }
  }

  /**
   * Create AI enhancement task (background task version)
   */
  async createAIEnhancement(
    cvId: string,
    jobDescriptionId: string,
  ): Promise<AIEnhancementCreateResponse> {
    try {
      const response = await api.post<AIEnhancementCreateResponse>(
        `/api/cvs/${cvId}/ai-enhancements`,
        { job_description_id: jobDescriptionId },
      );

      return response.data;
    } catch (error: any) {
      Logger.error("Error creating AI enhancement", {
        cvId,
        jobDescriptionId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get AI enhancement status
   */
  async getAIEnhancementStatus(
    enhancementId: string,
  ): Promise<AIEnhancementResponse> {
    try {
      const response = await api.get<AIEnhancementResponse>(
        `/api/ai-enhancements/${enhancementId}/status`,
      );

      return response.data;
    } catch (error: any) {
      Logger.error("Error getting AI enhancement status", {
        enhancementId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get the latest AI enhancement for a CV
   * Returns null if no enhancement exists (not an error)
   */
  async getLatestAIEnhancement(
    cvId: string,
  ): Promise<AIEnhancementResponse | null> {
    try {
      const response = await api.get<AIEnhancementResponse | null>(
        `/api/cvs/${cvId}/ai-enhancements/latest`,
      );

      // Backend returns null when no enhancement exists (expected case)
      return response.data;
    } catch (error: any) {
      Logger.error("Error getting latest AI enhancement", {
        cvId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Update an AI enhancement record with new suggestion data
   */
  async updateAIEnhancement(
    enhancementId: string,
    enhancementData: any,
  ): Promise<void> {
    try {
      Logger.debug("Updating AI enhancement", {
        enhancementId,
        enhancementData,
      });

      await api.put(`/api/ai-enhancements/${enhancementId}`, {
        enhancement_data: enhancementData,
      });

      Logger.debug("AI enhancement update successful", { enhancementId });
    } catch (error: any) {
      Logger.error("AI enhancement update failed", {
        enhancementId,
        error: error.message,
      });
      const aiError: AIServiceError = {
        error:
          error.response?.data?.detail || "Failed to update AI enhancement",
        details: error.message,
        code: error.response?.status?.toString(),
      };
      throw aiError;
    }
  }

  /**
   * Delete an AI enhancement record
   */
  async deleteAIEnhancement(enhancementId: string): Promise<void> {
    try {
      await api.delete(`/api/ai-enhancements/${enhancementId}`);
    } catch (error: any) {
      const aiError: AIServiceError = {
        error:
          error.response?.data?.detail || "Failed to delete AI enhancement",
        details: error.message,
        code: error.response?.status?.toString(),
      };
      throw aiError;
    }
  }
}

// Export singleton instance
export const aiSectionsService = new AISectionsService();

// Export individual functions for convenience
export const {
  generateAISection,
  getAISections,
  createAIEnhancement,
  getAIEnhancementStatus,
  getLatestAIEnhancement,
  updateAIEnhancement,
  deleteAIEnhancement,
} = aiSectionsService;
