/**
 * Writing Corrections API Service
 *
 * Handles all API calls for applying writing corrections to CV data.
 */

import api from '../api';
import { CV } from '../../types/cv';

export interface ApplyWritingCorrectionRequest {
  cv_id: string;
  analysis_id: string;
  draft_index: number;
}

export interface ApplyWritingCorrectionsBatchRequest {
  cv_id: string;
  analysis_id: string;
  correction_ids: string[];
}

export const writingCorrectionsService = {
  /**
   * Apply a single writing correction to CV data (0-based draft index).
   */
  async applyWritingCorrection(
    cvId: string,
    analysisId: string,
    correctionId: string,
    draftIndex: number
  ): Promise<CV> {
    try {
      const response = await api.post<CV>(
        `/writing-corrections/${correctionId}/apply`,
        {
          cv_id: cvId,
          analysis_id: analysisId,
          draft_index: draftIndex,
        } as ApplyWritingCorrectionRequest
      );
      return response.data;
    } catch (error: any) {
      throw error;
    }
  },

  /**
   * Apply multiple writing corrections to CV data in a single operation
   */
  async applyWritingCorrectionsBatch(
    cvId: string,
    analysisId: string,
    correctionIds: string[]
  ): Promise<CV> {
    try {
      const response = await api.post<CV>(
        `/writing-corrections/apply-batch`,
        {
          cv_id: cvId,
          analysis_id: analysisId,
          correction_ids: correctionIds,
        } as ApplyWritingCorrectionsBatchRequest
      );
      return response.data;
    } catch (error: any) {
      throw error;
    }
  },
};
