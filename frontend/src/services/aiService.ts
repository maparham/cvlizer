/**
 * AI Service Module
 * 
 * This module provides AI-related API functions including job fit analysis,
 * content enhancement, and ATS optimization. It handles API calls, error
 * management, and response formatting for all AI features.
 * 
 * Key responsibilities:
 * - Job fit analysis API calls
 * - Content enhancement API calls
 * - ATS optimization API calls
 * - Error handling and retry logic
 * - Response data transformation
 * - Caching for performance optimization
 * 
 * Usage:
 * - Import specific functions as needed
 * - All functions return promises with proper error handling
 * - Functions are designed to work with the AI store
 */

import { apiClient as api } from './api';
import {
  JobFitAnalysisRequest,
  JobFitAnalysisResponse,
  ContentEnhancementRequest,
  ContentEnhancementResponse,
  ATSOptimizationRequest,
  ATSOptimizationResponse,
  AISectionResponse,
  AISectionListResponse,
  JobDescription,
  JobDescriptionRequest,
  AIServiceError,
  AllSuggestionsResponse
} from '../types/ai';

/**
 * AI Service class for managing all AI-related API calls
 */
class AIService {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Check if cached data is still valid
   */
  private isCacheValid(timestamp: number): boolean {
    return Date.now() - timestamp < this.CACHE_DURATION;
  }

  /**
   * Get cached data if valid
   */
  private getCachedData<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && this.isCacheValid(cached.timestamp)) {
      return cached.data as T;
    }
    this.cache.delete(key);
    return null;
  }

  /**
   * Set cached data
   */
  private setCachedData<T>(key: string, data: T): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  /**
   * Clear cache for a specific CV
   */
  clearCacheForCV(cvId: string): void {
    const keysToDelete = Array.from(this.cache.keys()).filter(key => 
      key.includes(cvId)
    );
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * Clear all cache
   */
  clearAllCache(): void {
    this.cache.clear();
  }

  /**
   * Analyze job fit between CV and job description
   */
  async analyzeJobFit(
    cvId: string, 
    request: JobFitAnalysisRequest
  ): Promise<JobFitAnalysisResponse> {
    const cacheKey = `job-fit-${cvId}-${request.job_description_id}`;
    const cached = this.getCachedData<JobFitAnalysisResponse>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const response = await api.post<JobFitAnalysisResponse>(
        `/api/cvs/${cvId}/analyze-job-fit`,
        request
      );
      
      this.setCachedData(cacheKey, response.data);
      return response.data;
    } catch (error: any) {
      const aiError: AIServiceError = {
        error: error.response?.data?.detail || 'Failed to analyze job fit',
        details: error.message,
        code: error.response?.status?.toString()
      };
      throw aiError;
    }
  }

  /**
   * Enhance content with AI suggestions
   */
  async enhanceContent(
    cvId: string,
    request: ContentEnhancementRequest
  ): Promise<ContentEnhancementResponse> {
    try {
      const response = await api.post<ContentEnhancementResponse>(
        `/api/cvs/${cvId}/enhance-content`,
        request
      );
      
      return response.data;
    } catch (error: any) {
      const aiError: AIServiceError = {
        error: error.response?.data?.detail || 'Failed to enhance content',
        details: error.message,
        code: error.response?.status?.toString()
      };
      throw aiError;
    }
  }

  /**
   * Analyze ATS optimization
   */
  async analyzeATSOptimization(
    cvId: string,
    request: ATSOptimizationRequest
  ): Promise<ATSOptimizationResponse> {
    const cacheKey = `ats-optimization-${cvId}-${request.job_description_id}`;
    const cached = this.getCachedData<ATSOptimizationResponse>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const response = await api.post<ATSOptimizationResponse>(
        `/api/cvs/${cvId}/optimize-ats`,
        request
      );
      
      this.setCachedData(cacheKey, response.data);
      return response.data;
    } catch (error: any) {
      const aiError: AIServiceError = {
        error: error.response?.data?.detail || 'Failed to analyze ATS optimization',
        details: error.message,
        code: error.response?.status?.toString()
      };
      throw aiError;
    }
  }

  /**
   * Generate AI section for CV
   */
  async generateAISection(
    cvId: string,
    jobDescriptionId: string,
    sectionType: string = 'why_good_fit'
  ): Promise<AISectionResponse> {
    try {
      const response = await api.post<AISectionResponse>(
        `/api/cvs/${cvId}/generate-section`,
        {
          job_description_id: jobDescriptionId,
          section_type: sectionType
        }
      );
      
      // Clear cache for this CV since we've generated new content
      this.clearCacheForCV(cvId);
      
      return response.data;
    } catch (error: any) {
      const aiError: AIServiceError = {
        error: error.response?.data?.detail || 'Failed to generate AI section',
        details: error.message,
        code: error.response?.status?.toString()
      };
      throw aiError;
    }
  }

  /**
   * Get AI sections for a CV
   */
  async getAISections(cvId: string): Promise<AISectionResponse[]> {
    const cacheKey = `ai-sections-${cvId}`;
    const cached = this.getCachedData<AISectionResponse[]>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const response = await api.get<AISectionListResponse>(
        `/api/cvs/${cvId}/ai-sections`
      );
      
      this.setCachedData(cacheKey, response.data.ai_sections);
      return response.data.ai_sections;
    } catch (error: any) {
      const aiError: AIServiceError = {
        error: error.response?.data?.detail || 'Failed to get AI sections',
        details: error.message,
        code: error.response?.status?.toString()
      };
      throw aiError;
    }
  }

  /**
   * Create job description
   */
  async createJobDescription(
    request: JobDescriptionRequest
  ): Promise<JobDescription> {
    try {
      const response = await api.post<JobDescription>(
        '/api/job-descriptions',
        request
      );
      
      // Clear global job descriptions cache since we've added a new one
      this.cache.delete('job-descriptions-global');
      
      return response.data;
    } catch (error: any) {
      const aiError: AIServiceError = {
        error: error.response?.data?.detail || 'Failed to create job description',
        details: error.message,
        code: error.response?.status?.toString()
      };
      throw aiError;
    }
  }

  /**
   * Parse job description from URL
   */
  async parseJobDescriptionUrl(
    cvId: string,
    url: string
  ): Promise<JobDescription> {
    try {
      const response = await api.post<JobDescription>(
        `/api/cvs/${cvId}/job-descriptions/parse-url`,
        { url }
      );
      
      // Clear cache for this CV since we've added a new job description
      this.clearCacheForCV(cvId);
      
      return response.data;
    } catch (error: any) {
      const aiError: AIServiceError = {
        error: error.response?.data?.detail || 'Failed to parse job description URL',
        details: error.message,
        code: error.response?.status?.toString()
      };
      throw aiError;
    }
  }

  /**
   * Get job descriptions for the user (global, not CV-specific)
   */
  async getJobDescriptions(): Promise<JobDescription[]> {
    const cacheKey = 'job-descriptions-global';
    const cached = this.getCachedData<JobDescription[]>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const response = await api.get<{ job_descriptions: JobDescription[] }>(
        '/api/job-descriptions'
      );
      
      this.setCachedData(cacheKey, response.data.job_descriptions);
      return response.data.job_descriptions;
    } catch (error: any) {
      const aiError: AIServiceError = {
        error: error.response?.data?.detail || 'Failed to get job descriptions',
        details: error.message,
        code: error.response?.status?.toString()
      };
      throw aiError;
    }
  }

  /**
   * Delete job description
   */
  async deleteJobDescription(jobDescriptionId: string): Promise<void> {
    try {
      await api.delete(`/api/job-descriptions/${jobDescriptionId}`);
      
      // Clear global job descriptions cache since we've deleted one
      this.cache.delete('job-descriptions-global');
    } catch (error: any) {
      const aiError: AIServiceError = {
        error: error.response?.data?.detail || 'Failed to delete job description',
        details: error.message,
        code: error.response?.status?.toString()
      };
      throw aiError;
    }
  }

  /**
   * Check if AI features are enabled
   */
  async checkAIFeatureStatus(): Promise<boolean> {
    try {
      // Try to make a simple request to check if AI is enabled
      // This could be a dedicated endpoint or we can use an existing one
      const response = await api.get('/health/ai');
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
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: any;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        if (attempt < maxRetries - 1) {
          const delay = baseDelay * Math.pow(2, attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError;
  }

  /**
   * Generate ALL AI suggestions in one unified call
   */
  async generateAllSuggestions(
    cvId: string,
    jobDescriptionId: string
  ): Promise<AllSuggestionsResponse> {
    try {
      const response = await api.post<AllSuggestionsResponse>(
        `/api/cvs/${cvId}/ai-suggestions/generate`,
        { job_description_id: jobDescriptionId }
      );
      
      return response.data;
    } catch (error: any) {
      // Graceful degradation - return empty structures on error
      console.error('Error generating all suggestions:', error);
      return {
        skills: { technical: [], soft: [] },
        professional_summary: {
          suggested_text: "",
          original_text: "",
          key_changes: []
        }
      };
    }
  }

  /**
   * Create a job fit analysis draft
   */
  async createJobFitDraft(
    cvId: string,
    jobDescriptionId: string
  ): Promise<any> {
    try {
      const response = await api.post(
        `/api/cvs/${cvId}/analyze-job-fit`,
        { job_description_id: jobDescriptionId }
      );
      
      // Clear cache for this CV since we've created new content
      this.clearCacheForCV(cvId);
      
      return response.data;
    } catch (error: any) {
      const aiError: AIServiceError = {
        error: error.response?.data?.detail || 'Failed to create job fit draft',
        details: error.message,
        code: error.response?.status?.toString()
      };
      throw aiError;
    }
  }

  /**
   * Get all drafts for a CV
   */
  async getCVDrafts(cvId: string): Promise<any[]> {
    const cacheKey = `drafts-${cvId}`;
    const cached = this.getCachedData<any[]>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const response = await api.get(`/api/cvs/${cvId}/drafts`);
      
      this.setCachedData(cacheKey, response.data.drafts);
      return response.data.drafts;
    } catch (error: any) {
      const aiError: AIServiceError = {
        error: error.response?.data?.detail || 'Failed to get CV drafts',
        details: error.message,
        code: error.response?.status?.toString()
      };
      throw aiError;
    }
  }

  /**
   * Approve a why_good_fit draft
   */
  async approveWhyGoodFitDraft(
    cvId: string,
    draftId: string
  ): Promise<any> {
    try {
      const response = await api.post(
        `/api/cvs/${cvId}/why_good_fit/approve`,
        { draft_id: draftId }
      );
      
      // Clear cache for this CV since we've updated it
      this.clearCacheForCV(cvId);
      
      return response.data;
    } catch (error: any) {
      const aiError: AIServiceError = {
        error: error.response?.data?.detail || 'Failed to approve draft',
        details: error.message,
        code: error.response?.status?.toString()
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
      this.clearCacheForCV(cvId);
    } catch (error: any) {
      const aiError: AIServiceError = {
        error: error.response?.data?.detail || 'Failed to delete draft',
        details: error.message,
        code: error.response?.status?.toString()
      };
      throw aiError;
    }
  }
}

// Export singleton instance
export const aiService = new AIService();

// Export individual functions for convenience
export const {
  analyzeJobFit,
  enhanceContent,
  analyzeATSOptimization,
  generateAISection,
  getAISections,
  createJobDescription,
  getJobDescriptions,
  deleteJobDescription,
  checkAIFeatureStatus,
  retryWithBackoff,
  clearCacheForCV,
  clearAllCache,
  generateAllSuggestions,
  createJobFitDraft,
  getCVDrafts,
  approveWhyGoodFitDraft,
  deleteWhyGoodFitDraft
} = aiService;
