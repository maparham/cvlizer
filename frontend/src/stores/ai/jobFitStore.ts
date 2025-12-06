/**
 * Job Fit Store - Job fit analysis state management
 *
 * Manages job fit analysis operations including analyzing CV against
 * job descriptions and storing analysis results.
 */

import { StateCreator } from "zustand";
import type { AIStore } from "./types";
import { JobFitAnalysisState } from "../../types/ai";
import { aiService } from "../../services/ai";

export interface JobFitState {
  jobFitAnalysis: JobFitAnalysisState;
}

export interface JobFitActions {
  analyzeJobFit: (cvId: string, jobDescriptionId: string) => Promise<string>;
  updateLastAnalysisFromDraft: (draftId: string) => Promise<void>;
  loadJobFitAnalysisForCV: (cvId: string) => Promise<void>;
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

  analyzeJobFit: async (cvId: string, jobDescriptionId: string): Promise<string> => {
    set((state) => ({
      jobFitAnalysis: {
        ...state.jobFitAnalysis,
        isAnalyzing: true,
        error: undefined,
      },
    }));

    try {
      // Use new combined AI suggestions endpoint
      const result = await aiService.createCombinedAISuggestions(cvId, jobDescriptionId);

      set((state) => ({
        jobFitAnalysis: {
          ...state.jobFitAnalysis,
          isAnalyzing: false,
          error: undefined,
        },
      }));

      // Return enhancement_id for polling
      return result.enhancement_id;
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

  updateLastAnalysisFromDraft: async (draftId: string) => {
    try {
      const draft = await aiService.getDraftStatus(draftId);

      // Only update if this is a why_good_fit draft and generation is complete
      if (draft.section_type === "why_good_fit" && !draft.is_generating) {
        const draftData = draft.draft_data || {};

        set((state) => ({
          jobFitAnalysis: {
            ...state.jobFitAnalysis,
            lastAnalysis: {
              id: draft.id,
              cv_id: draft.cv_id,
              job_description_id: draft.job_description_id,
              confidence_score: draftData.confidence_score || 0,
              fit_analysis: draftData.fit_analysis || draftData.content || "",
              key_matches: draftData.key_matches || [],
              missing_skills: draftData.missing_skills || [],
              strengths: draftData.strengths || [],
              weaknesses: draftData.weaknesses || [],
              suggested_improvements: draftData.suggested_improvements || [],
              tokens_used: draft.tokens_used || 0,
              generation_time: draft.generation_time || 0,
              model_used: draft.ai_model || "gpt-4o-mini",
            },
          },
        }));
      }
    } catch (error) {
      console.error("Failed to update last analysis from draft:", error);
      // Don't throw - this is an optional enhancement
    }
  },

  loadJobFitAnalysisForCV: async (cvId: string) => {
    // Skip loading for temporary CVs (not yet saved to backend)
    if (cvId.startsWith("temp-")) {
      return;
    }

    try {
      // Get all drafts for this CV
      const drafts = await aiService.getCVDrafts(cvId);

      // Find the why_good_fit draft
      const whyGoodFitDraft = drafts.find(
        (draft: any) => draft.section_type === "why_good_fit" && !draft.is_generating
      );

      if (whyGoodFitDraft) {
        const draftData = whyGoodFitDraft.draft_data || {};

        set((state) => ({
          jobFitAnalysis: {
            ...state.jobFitAnalysis,
            lastAnalysis: {
              id: whyGoodFitDraft.id,
              cv_id: whyGoodFitDraft.cv_id,
              job_description_id: whyGoodFitDraft.job_description_id,
              confidence_score: draftData.confidence_score || 0,
              fit_analysis: draftData.fit_analysis || draftData.content || "",
              key_matches: draftData.key_matches || [],
              missing_skills: draftData.missing_skills || [],
              strengths: draftData.strengths || [],
              weaknesses: draftData.weaknesses || [],
              suggested_improvements: draftData.suggested_improvements || [],
              tokens_used: whyGoodFitDraft.tokens_used || 0,
              generation_time: whyGoodFitDraft.generation_time || 0,
              model_used: whyGoodFitDraft.ai_model || "gpt-4o-mini",
            },
          },
        }));
      }
    } catch (error) {
      console.error("Failed to load job fit analysis for CV:", error);
      // Don't throw - this is an optional load
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
