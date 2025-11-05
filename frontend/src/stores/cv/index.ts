/**
 * CV Store - Main export file combining all slices
 *
 * This module exports the unified CV store that combines all feature slices
 * using Zustand's StateCreator pattern. All slices are combined and wrapped
 * with devtools middleware for debugging.
 */

import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { CVStore } from "./types";
import { createCVCrudSlice } from "./cvCrudSlice";
import { createCVHistorySlice } from "./cvHistorySlice";
import { createCVPollingSlice } from "./cvPollingSlice";

// Export constants and utilities
export { DEFAULT_CV_DATA, isTempCVId, DEFAULT_CV_FILENAME, TEMP_CV_ID_PREFIX, isHistoryEnabled } from "./constants";

/**
 * Main CV store combining all slices
 */
export const useCVStore = create<CVStore>()(
  devtools(
    (set, get, api) => ({
      ...createCVCrudSlice(set, get, api),
      ...createCVHistorySlice(set, get, api),
      ...createCVPollingSlice(set, get, api),
    }),
    {
      name: "cv-store",
    },
  ),
);

// Cleanup function to stop polling when the store is no longer used
// This should be called when the app unmounts or the user logs out
export const cleanupCVStore = () => {
  useCVStore.getState().stopPolling();
};
