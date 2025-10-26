/**
 * ATS Optimization Store - ATS optimization state management
 *
 * Manages ATS (Applicant Tracking System) optimization operations
 * including analyzing CV for keyword matching and optimization suggestions.
 */

import { StateCreator } from "zustand";
import type { AIStore } from "./types";
import { ATSOptimizationState } from "../../types/ai";
import { aiService } from "../../services/aiService";

export interface ATSOptimizationSliceState {
  atsOptimization: ATSOptimizationState;
}

export interface ATSOptimizationSliceActions {
  analyzeATSOptimization: (cvId: string, jobDescriptionId: string) => Promise<void>;
  clearATSOptimization: () => void;
}

export type ATSOptimizationSlice = ATSOptimizationSliceState & ATSOptimizationSliceActions;

export const createATSOptimizationSlice: StateCreator<
  AIStore,
  [],
  [],
  ATSOptimizationSlice
> = (set) => ({
  atsOptimization: {
    isAnalyzing: false,
    isOptimizing: false,
  },

  analyzeATSOptimization: async (cvId: string, jobDescriptionId: string) => {
    set((state) => ({
      atsOptimization: {
        ...state.atsOptimization,
        isAnalyzing: true,
        error: undefined,
      },
    }));

    try {
      const result = await aiService.analyzeATSOptimization(cvId, {
        job_description_id: jobDescriptionId,
      });
      set((state) => ({
        atsOptimization: {
          ...state.atsOptimization,
          isAnalyzing: false,
          lastAnalysis: result,
          error: undefined,
        },
      }));
    } catch (error) {
      set((state) => ({
        atsOptimization: {
          ...state.atsOptimization,
          isAnalyzing: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to analyze ATS optimization",
        },
      }));
    }
  },

  clearATSOptimization: () => {
    set((state) => ({
      atsOptimization: {
        ...state.atsOptimization,
        lastAnalysis: undefined,
        error: undefined,
      },
    }));
  },
});
