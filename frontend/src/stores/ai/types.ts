/**
 * AI Store Type Definitions
 *
 * This module defines the complete AI store type by combining
 * all slice types together.
 */

import type { FeatureStatusSlice } from "./featureStatusStore";
import type { JobFitSlice } from "./jobFitStore";
import type { ATSOptimizationSlice } from "./atsOptimizationStore";
import type { JobDescriptionsSlice } from "./jobDescriptionsStore";
import type { DraftsSlice } from "./draftsStore";
import type { ContentEnhancementSlice } from "./contentEnhancementStore";
import type { InlineDiffSlice } from "./inlineDiffStore";
import type { aiService } from "../../services/aiService";

// Utility actions that work across multiple slices
export interface UtilityActions {
  clearAllData: () => void;
  clearCacheForCV: (cvId: string) => void;
}

// Complete AI store type combining all slices
export type AIStore = FeatureStatusSlice &
  JobFitSlice &
  ATSOptimizationSlice &
  JobDescriptionsSlice &
  DraftsSlice &
  ContentEnhancementSlice &
  InlineDiffSlice &
  UtilityActions;
