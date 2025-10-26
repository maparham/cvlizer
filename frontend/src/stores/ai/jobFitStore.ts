/**
 * Job Fit Store - Job fit analysis state management
 *
 * Manages job fit analysis operations including analyzing CV against
 * job descriptions and storing analysis results.
 */

import { StateCreator } from "zustand";
import type { AIStore } from "./types";
import { JobFitAnalysisState, DraftResponse, JobFitAnalysisResponse } from "../../types/ai";
import { aiService } from "../../services/ai";

export interface JobFitState {
  jobFitAnalysis: JobFitAnalysisState;
}

export interface JobFitActions {
  analyzeJobFit: (cvId: string, jobDescriptionId: string) => Promise<DraftResponse>;
  clearJobFitAnalysis: () => void;
}

export type JobFitSlice = JobFitState & JobFitActions;

export const createJobFitSlice: StateCreator<
  AIStore,
  [],
  [],
  JobFitSlice
> = (set) => ({
  jobFitAnalysis: {
    isAnalyzing: false,
    isGenerating: false,
  },

  analyzeJobFit: async (cvId: string, jobDescriptionId: string): Promise<DraftResponse> => {
    set((state) => ({
      jobFitAnalysis: {
        ...state.jobFitAnalysis,
        isAnalyzing: true,
        error: undefined,
      },
    }));

    try {
      const result = await aiService.analyzeJobFit(cvId, {
        job_description_id: jobDescriptionId,
      });

      // Extract job fit analysis data from draft_data
      const analysisData = result.draft_data || {};

      set((state) => ({
        jobFitAnalysis: {
          ...state.jobFitAnalysis,
          isAnalyzing: false,
          lastAnalysis: {
            ...result,
            confidence_score: analysisData.confidence_score || 0,
            fit_analysis: analysisData.fit_analysis || "",
            key_matches: analysisData.key_matches || [],
            missing_skills: analysisData.missing_skills || [],
            strengths: analysisData.strengths || [],
            weaknesses: analysisData.weaknesses || [],
            suggested_improvements: analysisData.suggested_improvements || [],
            tokens_used: result.tokens_used || 0,
            generation_time: result.generation_time || 0,
            model_used: result.ai_model || "gpt-4o-mini",
          } as JobFitAnalysisResponse,
          error: undefined,
        },
      }));

      return result;
    } catch (error) {
      set((state) => ({
        jobFitAnalysis: {
          ...state.jobFitAnalysis,
          isAnalyzing: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to analyze job fit",
        },
      }));
      throw error;
    }
  },

  clearJobFitAnalysis: () => {
    set((state) => ({
      jobFitAnalysis: {
        ...state.jobFitAnalysis,
        lastAnalysis: undefined,
        error: undefined,
      },
    }));
  },
});
