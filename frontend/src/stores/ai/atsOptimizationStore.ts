/**
 * ATS Optimization Store - ATS optimization state management
 *
 * Manages ATS optimization operations including analyzing CV against
 * job descriptions for ATS compatibility and storing analysis results.
 */

import { StateCreator } from "zustand";
import type { AIStore } from "./types";
import { ATSOptimizationResponse } from "../../types/ai";
import { aiService } from "../../services/ai";

export interface ATSOptimizationState {
  atsOptimization: {
    isAnalyzing: boolean;
    lastAnalysis?: ATSOptimizationResponse;
    error?: string;
  };
}

export interface ATSOptimizationActions {
  analyzeATSOptimization: (cvId: string, jobDescriptionId: string) => Promise<void>;
  clearATSOptimization: () => void;
}

export type ATSOptimizationSlice = ATSOptimizationState & ATSOptimizationActions;

export const createATSOptimizationSlice: StateCreator<
  AIStore,
  [],
  [],
  ATSOptimizationSlice
> = (set) => ({
  atsOptimization: {
    isAnalyzing: false,
  },

  analyzeATSOptimization: async (cvId: string, jobDescriptionId: string): Promise<void> => {
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
      throw error;
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
