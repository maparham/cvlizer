/**
 * Content Enhancement Service
 *
 * Handles AI-powered content enhancement for CV sections.
 * Manages content enhancement API calls and status checking for background tasks.
 *
 * Key responsibilities:
 * - Enhance content with AI suggestions (background processing)
 * - Check content enhancement status
 * - Update and delete content enhancements
 */

import { apiClient as api } from "../api";
import {
  ContentEnhancementRequest,
  ContentEnhancementResponse,
  ContentEnhancementCreateResponse,
  AIServiceError,
} from "../../types/ai";
import { Logger } from "../../utils/logger";

class ContentEnhancementService {
  /**
   * Enhance content with AI suggestions (now returns immediately with background processing)
   */
  async enhanceContent(
    cvId: string,
    request: ContentEnhancementRequest,
  ): Promise<ContentEnhancementCreateResponse> {
    try {
      const response = await api.post<ContentEnhancementCreateResponse>(
        `/api/cvs/${cvId}/enhance-content`,
        request,
      );

      return response.data;
    } catch (error: any) {
      const aiError: AIServiceError = {
        error: error.response?.data?.detail || "Failed to enhance content",
        details: error.message,
        code: error.response?.status?.toString(),
      };
      throw aiError;
    }
  }

  /**
   * Check content enhancement status
   */
  async getContentEnhancementStatus(
    enhancementId: string,
  ): Promise<ContentEnhancementResponse> {
    try {
      const response = await api.get<ContentEnhancementResponse>(
        `/api/content-enhancements/${enhancementId}/status`,
      );

      return response.data;
    } catch (error: any) {
      const aiError: AIServiceError = {
        error:
          error.response?.data?.detail ||
          "Failed to get content enhancement status",
        details: error.message,
        code: error.response?.status?.toString(),
      };
      throw aiError;
    }
  }

  /**
   * Delete a content enhancement record
   */
  async deleteContentEnhancement(enhancementId: string): Promise<void> {
    try {
      await api.delete(`/api/content-enhancements/${enhancementId}`);
    } catch (error: any) {
      const aiError: AIServiceError = {
        error:
          error.response?.data?.detail ||
          "Failed to delete content enhancement",
        details: error.message,
        code: error.response?.status?.toString(),
      };
      throw aiError;
    }
  }
}

// Export singleton instance
export const contentEnhancementService = new ContentEnhancementService();

// Export individual functions for convenience
export const {
  enhanceContent,
  getContentEnhancementStatus,
  deleteContentEnhancement,
} = contentEnhancementService;
