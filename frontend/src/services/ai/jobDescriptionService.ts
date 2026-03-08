/**
 * Job Description Service
 *
 * Handles job description CRUD operations and CV associations.
 * Manages user-scoped job descriptions that can be associated with multiple CVs.
 *
 * Key responsibilities:
 * - Create, update, delete job descriptions
 * - Parse job descriptions from URLs (with background processing)
 * - Manage CV associations
 * - Check parsing status
 */

import { apiClient as api } from "../api";
import {
  JobDescription,
  JobDescriptionRequest,
  AIServiceError,
} from "../../types/ai";
import { cacheManager } from "./cache";

class JobDescriptionService {
  /**
   * Create a new job description (user-level, optionally associated with a CV)
   */
  async createJobDescription(
    request: JobDescriptionRequest,
    cvId?: string,
  ): Promise<JobDescription> {
    try {
      const params = cvId ? { cv_id: cvId } : {};
      const response = await api.post<JobDescription>(
        `/job-descriptions`,
        request,
        { params },
      );

      // Clear cache since we've added a new job description
      cacheManager.clearAllCache();

      return response.data;
    } catch (error: any) {
      const aiError: AIServiceError = {
        error:
          error.response?.data?.detail || "Failed to create job description",
        details: error.message,
        code: error.response?.status?.toString(),
      };
      throw aiError;
    }
  }

  /**
   * Parse job description from URL (user-level, optionally associated with a CV)
   */
  async parseJobDescriptionUrl(url: string, cvId?: string): Promise<any> {
    try {
      const params = cvId ? { cv_id: cvId } : {};
      const response = await api.post<any>(
        `/job-descriptions/parse-url`,
        { url },
        { params },
      );

      // Clear cache since we've added a new job description
      cacheManager.clearAllCache();

      return response.data;
    } catch (error: any) {
      const aiError: AIServiceError = {
        error:
          error.response?.data?.detail || "Failed to parse job description URL",
        details: error.message,
        code: error.response?.status?.toString(),
      };
      throw aiError;
    }
  }

  /**
   * Check job description parsing status
   */
  async getJobDescriptionStatus(
    jobDescriptionId: string,
  ): Promise<JobDescription> {
    try {
      const response = await api.get<JobDescription>(
        `/job-descriptions/${jobDescriptionId}/status`,
      );

      return response.data;
    } catch (error: any) {
      const aiError: AIServiceError = {
        error:
          error.response?.data?.detail ||
          "Failed to get job description status",
        details: error.message,
        code: error.response?.status?.toString(),
      };
      throw aiError;
    }
  }

  /**
   * Get all job descriptions for the user (not filtered by CV)
   */
  async getJobDescriptions(): Promise<JobDescription[]> {
    const cacheKey = `job-descriptions-user`;
    const cached = cacheManager.getCachedData<JobDescription[]>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const response = await api.get<{ job_descriptions: JobDescription[] }>(
        `/job-descriptions`,
      );

      cacheManager.setCachedData(cacheKey, response.data.job_descriptions);
      return response.data.job_descriptions;
    } catch (error: any) {
      const aiError: AIServiceError = {
        error: error.response?.data?.detail || "Failed to get job descriptions",
        details: error.message,
        code: error.response?.status?.toString(),
      };
      throw aiError;
    }
  }

  /**
   * Update job description
   */
  async updateJobDescription(
    jobDescriptionId: string,
    request: Partial<JobDescriptionRequest>,
  ): Promise<JobDescription> {
    try {
      const response = await api.put<JobDescription>(
        `/job-descriptions/${jobDescriptionId}`,
        request,
      );

      // Clear cache for all CVs since we've updated a job description
      cacheManager.clearAllCache();

      return response.data;
    } catch (error: any) {
      const aiError: AIServiceError = {
        error:
          error.response?.data?.detail || "Failed to update job description",
        details: error.message,
        code: error.response?.status?.toString(),
      };
      throw aiError;
    }
  }

  /**
   * Delete job description
   */
  async deleteJobDescription(jobDescriptionId: string): Promise<void> {
    try {
      await api.delete(`/job-descriptions/${jobDescriptionId}`);

      // Clear job descriptions cache since we've deleted one
      cacheManager.clearAllCache();
    } catch (error: any) {
      const aiError: AIServiceError = {
        error:
          error.response?.data?.detail || "Failed to delete job description",
        details: error.message,
        code: error.response?.status?.toString(),
      };
      throw aiError;
    }
  }

  /**
   * Associate a job description with a CV
   */
  async associateJobDescriptionWithCV(
    jobDescriptionId: string,
    cvId: string,
  ): Promise<void> {
    try {
      await api.post(
        `/job-descriptions/${jobDescriptionId}/cvs/${cvId}`,
      );

      // Clear cache since associations changed
      cacheManager.clearAllCache();
    } catch (error: any) {
      const aiError: AIServiceError = {
        error:
          error.response?.data?.detail ||
          "Failed to associate job description with CV",
        details: error.message,
        code: error.response?.status?.toString(),
      };
      throw aiError;
    }
  }

  /**
   * Remove association between a job description and a CV
   */
  async disassociateJobDescriptionFromCV(
    jobDescriptionId: string,
    cvId: string,
  ): Promise<void> {
    try {
      await api.delete(
        `/job-descriptions/${jobDescriptionId}/cvs/${cvId}`,
      );

      // Clear cache since associations changed
      cacheManager.clearAllCache();
    } catch (error: any) {
      const aiError: AIServiceError = {
        error:
          error.response?.data?.detail ||
          "Failed to remove job description association",
        details: error.message,
        code: error.response?.status?.toString(),
      };
      throw aiError;
    }
  }
}

// Export singleton instance
export const jobDescriptionService = new JobDescriptionService();

// Export individual functions for convenience
export const {
  createJobDescription,
  parseJobDescriptionUrl,
  getJobDescriptionStatus,
  getJobDescriptions,
  updateJobDescription,
  deleteJobDescription,
  associateJobDescriptionWithCV,
  disassociateJobDescriptionFromCV,
} = jobDescriptionService;
