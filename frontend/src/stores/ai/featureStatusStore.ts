/**
 * Feature Status Store - AI feature availability management
 *
 * Manages the availability status of AI features including checking
 * backend connectivity and feature enablement status.
 */

import { StateCreator } from "zustand";
import type { AIStore } from "./types";
import { AIFeatureStatus } from "../../types/ai";
import { aiService } from "../../services/aiService";

export interface FeatureStatusState {
  featureStatus: AIFeatureStatus;
}

export interface FeatureStatusActions {
  checkFeatureStatus: () => Promise<void>;
  setFeatureStatus: (status: Partial<AIFeatureStatus>) => void;
}

export type FeatureStatusSlice = FeatureStatusState & FeatureStatusActions;

export const createFeatureStatusSlice: StateCreator<
  AIStore,
  [],
  [],
  FeatureStatusSlice
> = (set) => ({
  featureStatus: {
    isEnabled: false,
    lastChecked: new Date(),
  },

  checkFeatureStatus: async () => {
    try {
      const isEnabled = await aiService.checkAIFeatureStatus();
      set((state) => ({
        featureStatus: {
          ...state.featureStatus,
          isEnabled,
          lastChecked: new Date(),
          error: undefined,
        },
      }));
    } catch (error) {
      set((state) => ({
        featureStatus: {
          ...state.featureStatus,
          isEnabled: false,
          lastChecked: new Date(),
          error: error instanceof Error ? error.message : "Unknown error",
        },
      }));
    }
  },

  setFeatureStatus: (status) => {
    set((state) => ({
      featureStatus: { ...state.featureStatus, ...status },
    }));
  },
});
