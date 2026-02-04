/**
 * CV Quality Analysis API Service
 *
 * Handles all API calls for CV quality analysis feature.
 */

import api from '../api';
import {
  CVQualityAnalysisResponse,
  CVQualityAnalysisCreateResponse,
  CVQualityAnalysisData,
} from '../../types/ai';

export type CorrectionMode = 'writing_only' | 'writing_and_content';

export const cvQualityService = {
  /**
   * Create new quality analysis for a CV
   *
   * @param cvId - CV ID to analyze
   * @param correctionMode - 'writing_only' for spelling/grammar only,
   *                         'writing_and_content' to also fix unprofessional content
   */
  async createQualityAnalysis(
    cvId: string,
    correctionMode: CorrectionMode = 'writing_only'
  ): Promise<CVQualityAnalysisCreateResponse> {
    try {
      const response = await api.post(`/api/cvs/${cvId}/quality-analysis`, {
        correction_mode: correctionMode,
      });

      if (!response.data || !response.data.analysis_id) {
        throw new Error('Invalid response from quality analysis API: missing analysis_id');
      }

      return response.data;
    } catch (error: any) {
      throw error;
    }
  },

  /**
   * Get quality analysis status (for polling)
   */
  async getQualityAnalysisStatus(
    analysisId: string
  ): Promise<CVQualityAnalysisResponse> {
    const response = await api.get(`/api/quality-analysis/${analysisId}`);
    return response.data;
  },

  /**
   * Get latest quality analysis for a CV
   */
  async getLatestQualityAnalysis(
    cvId: string
  ): Promise<CVQualityAnalysisResponse | null> {
    const response = await api.get(`/api/cvs/${cvId}/quality-analysis/latest`);
    return response.data;
  },

  /**
   * Update quality analysis (for dismissals)
   */
  async updateQualityAnalysis(
    analysisId: string,
    qualityData: CVQualityAnalysisData
  ): Promise<void> {
    // Wrap in schema format expected by backend
    await api.patch(`/api/quality-analysis/${analysisId}`, {
      quality_data: qualityData,
    });
  },

  /**
   * Delete quality analysis
   */
  async deleteQualityAnalysis(analysisId: string): Promise<void> {
    await api.delete(`/api/quality-analysis/${analysisId}`);
  },

  /**
   * Delete all quality analyses for a CV
   */
  async deleteAllQualityAnalyses(cvId: string): Promise<void> {
    await api.delete(`/api/cvs/${cvId}/quality-analysis/all`);
  },
};
