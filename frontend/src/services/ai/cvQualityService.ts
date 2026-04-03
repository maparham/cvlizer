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
  Issue,
  RewordingMode,
} from '../../types/ai';

export interface FieldRetryResponse {
  issue: Issue;
  list_for_field: Issue[];
}

export type CorrectionMode = 'proofread' | 'coaching';

export type { RewordingMode };

export const cvQualityService = {
  /**
   * Create new quality analysis for a CV
   *
   * @param cvId - CV ID to analyze
   * @param correctionMode - 'proofread' for spelling/grammar only,
   *                         'coaching' to also fix unprofessional content
   */
  async createQualityAnalysis(
    cvId: string,
    correctionMode: CorrectionMode = 'proofread',
    rewordingMode: RewordingMode = 'minimal'
  ): Promise<CVQualityAnalysisCreateResponse> {
    try {
      const response = await api.post(`/cvs/${cvId}/quality-analysis`, {
        correction_mode: correctionMode,
        rewording_mode: rewordingMode,
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
    const response = await api.get(`/quality-analysis/${analysisId}`);
    return response.data;
  },

  /**
   * Get latest quality analysis for a CV
   */
  async getLatestQualityAnalysis(
    cvId: string
  ): Promise<CVQualityAnalysisResponse | null> {
    const response = await api.get(`/cvs/${cvId}/quality-analysis/latest`);
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
    await api.patch(`/quality-analysis/${analysisId}`, {
      quality_data: qualityData,
    });
  },

  /**
   * Delete quality analysis
   */
  async deleteQualityAnalysis(analysisId: string): Promise<void> {
    await api.delete(`/quality-analysis/${analysisId}`);
  },

  /**
   * Delete all quality analyses for a CV
   */
  async deleteAllQualityAnalyses(cvId: string): Promise<void> {
    await api.delete(`/cvs/${cvId}/quality-analysis/all`);
  },

  /**
   * Run single-field coaching for one description field (retry). Appends to draft history.
   */
  async requestFieldRetry(
    cvId: string,
    analysisId: string,
    fieldPath: string,
    itemId?: string,
    rewordingMode: RewordingMode = 'minimal'
  ): Promise<FieldRetryResponse> {
    const response = await api.post(
      `/cvs/${cvId}/quality-analysis/field-retry`,
      {
        analysis_id: analysisId,
        field_path: fieldPath,
        item_id: itemId ?? null,
        rewording_mode: rewordingMode,
      }
    );
    return response.data;
  },
};
