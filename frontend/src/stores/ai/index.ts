/**
 * AI Store - Main export file combining all slices
 *
 * This module exports the unified AI store that combines all feature slices
 * using Zustand's StateCreator pattern. All slices are combined and wrapped
 * with devtools middleware for debugging.
 */

import { createWithEqualityFn } from "zustand/traditional";
import { devtools } from "zustand/middleware";
import { shallow } from "zustand/shallow";
import type { AIStore } from "./types";
import { createFeatureStatusSlice } from "./featureStatusStore";
import { createJobFitSlice } from "./jobFitStore";
import { createATSOptimizationSlice } from "./atsOptimizationStore";
import { createJobDescriptionsSlice } from "./jobDescriptionsStore";
import { createDraftsSlice } from "./draftsStore";
import { createInlineDiffSlice } from "./inlineDiffStore";
import { aiService } from "../../services/ai";

// Initial state for utility actions
const initialState = {
  featureStatus: {
    isEnabled: false,
    lastChecked: new Date(),
  },
  jobFitAnalysis: {
    isAnalyzing: false,
    isGenerating: false,
  },
  atsOptimization: {
    isAnalyzing: false,
    isOptimizing: false,
  },
  suggestions: {},
  jobDescriptions: [],
  activeJobDescriptionId: undefined,
  activeJobDescriptionIdPerCV:
    typeof window !== "undefined"
      ? JSON.parse(localStorage.getItem("activeJobDescriptionIdPerCV") || "{}")
      : {},
  hiddenJobDescriptionIds:
    typeof window !== "undefined"
      ? JSON.parse(localStorage.getItem("hiddenJobDescriptionIds") || "[]")
      : [],
  inlineDiff: {
    tempCV: null,
    suggestions: [],
    isApplyingAll: false,
    isPanelOpen: false,
    highlightMode: "all" as const,
  },
  drafts: {
    drafts: [],
    isLoading: false,
  },
};

/**
 * Main AI store combining all slices
 */
export const useAIStore = createWithEqualityFn<AIStore>()(
  devtools(
    (set, get) => ({
      // Combine all slices
      ...createFeatureStatusSlice(set, get, undefined),
      ...createJobFitSlice(set, get, undefined),
      ...createATSOptimizationSlice(set, get, undefined),
      ...createJobDescriptionsSlice(set, get, undefined),
      ...createDraftsSlice(set, get, undefined),
      ...createInlineDiffSlice(set, get, undefined),

      // Utility actions
      clearAllData: () => {
        set(initialState);
        aiService.clearAllCache();
        // Clear per-CV map from localStorage
        localStorage.removeItem("activeJobDescriptionIdPerCV");
      },

      clearCacheForCV: (cvId: string) => {
        aiService.clearCacheForCV(cvId);
        set((state) => ({
          jobFitAnalysis: { ...state.jobFitAnalysis, lastAnalysis: undefined },
          atsOptimization: {
            ...state.atsOptimization,
            lastAnalysis: undefined,
          },
          jobDescriptions: state.jobDescriptions.filter(
            (jd) => jd.cv_id !== cvId,
          ),
          // Don't clear drafts here to allow background tasks to complete
          // Drafts will be refreshed from backend when loading the CV
        }));
      },
    }),
    {
      name: "ai-store",
    },
  ),
);

// Selectors for common use cases
export const useAIFeatureStatus = () =>
  useAIStore((state) => state.featureStatus);

export const useJobFitAnalysis = () =>
  useAIStore((state) => state.jobFitAnalysis);

export const useATSOptimization = () =>
  useAIStore((state) => state.atsOptimization);

export const useJobDescriptions = () =>
  useAIStore((state) => state.jobDescriptions);

export const useCVJobDescriptions = (cvId: string) =>
  useAIStore(
    (state) => state.jobDescriptions.filter((jd) => jd.cv_ids.includes(cvId)),
    shallow,
  );

export const useVisibleJobDescriptions = () =>
  useAIStore((state) =>
    state.jobDescriptions.filter(
      (jd) => !state.hiddenJobDescriptionIds.includes(jd.id),
    ),
  );

export const useVisibleCVJobDescriptions = (cvId: string) =>
  useAIStore(
    (state) =>
      state.jobDescriptions.filter(
        (jd) =>
          jd.cv_id === cvId && !state.hiddenJobDescriptionIds.includes(jd.id),
      ),
    shallow,
  );

export const useActiveJobDescription = () =>
  useAIStore((state) => {
    const activeId = state.activeJobDescriptionId;
    if (!activeId) return undefined;

    const jobDescription = state.jobDescriptions.find(
      (jd) => jd.id === activeId,
    );
    // If the active job description is hidden, return undefined
    if (jobDescription && state.hiddenJobDescriptionIds.includes(activeId)) {
      return undefined;
    }

    return jobDescription;
  });

export const useSuggestions = () => useAIStore((state) => state.suggestions);

// Inline diff selectors
export const useInlineDiff = () => useAIStore((state) => state.inlineDiff);

export const useInlineDiffSuggestions = () =>
  useAIStore((state) => state.inlineDiff.suggestions);

export const useTempCV = () => useAIStore((state) => state.inlineDiff.tempCV);

export const useIsDiffMode = () =>
  useAIStore((state) => !!state.inlineDiff.tempCV?.isDiffMode);

export const useSuggestionPanel = () =>
  useAIStore((state) => state.inlineDiff.isPanelOpen);

// Draft selectors
export const useDrafts = () => useAIStore((state) => state.drafts);

export const useCVDrafts = (cvId: string) => {
  const drafts = useAIStore(
    (state) => state.drafts.drafts.filter((draft) => draft.cv_id === cvId),
    shallow,
  );
  return drafts;
};

export const useWhyGoodFitDraft = (cvId: string) =>
  useAIStore((state) =>
    state.drafts.drafts.find(
      (draft) => draft.cv_id === cvId && draft.section_type === "why_good_fit",
    ),
  );
