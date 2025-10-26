/**
 * CV Polling Slice - Background parsing status polling
 *
 * Manages background polling for CV parsing status updates.
 * Uses PollingManager to periodically check for unparsed CVs
 * and updates state accordingly.
 */

import { StateCreator } from "zustand";
import { PollingManager } from "../utils";
import { cvApi } from "../../services/api";
import { CV } from "../../types";
import type { CVStore } from "./types";

export interface CVPollingSliceState {
  // Polling state
  hasUnparsedCVs: boolean;
  pollingManager: PollingManager | null;
}

export interface CVPollingSliceActions {
  // Polling actions
  startPolling: () => void;
  stopPolling: () => void;
}

export type CVPollingSlice = CVPollingSliceState & CVPollingSliceActions;

export const createCVPollingSlice: StateCreator<
  CVStore,
  [],
  [],
  CVPollingSlice
> = (set, get) => ({
  // Initial state
  hasUnparsedCVs: false,
  pollingManager: null,

  startPolling: () => {
    // Don't start if already polling
    if (get().pollingManager?.isActive()) return;

    const pollingFn = async () => {
      const { loading, uploading, currentPage, cvsPerPage } = get();

      // Don't poll if already loading or uploading
      if (loading || uploading) return;

      // Fetch CVs without setting loading state to avoid UI flicker
      const response = await cvApi.getCVs(currentPage, cvsPerPage);
      const cvs = response.cvs || [];
      const newHasUnparsedCVs = cvs.some(
        (cv: CV) => !cv.is_parsed && !cv.parse_error,
      );

      set({
        cvs,
        hasUnparsedCVs: newHasUnparsedCVs,
        currentPage: response.page || currentPage,
        totalPages: response.pages || 1,
        totalCVs: response.total || 0,
      });

      // Stop polling if no unparsed CVs remain
      if (!newHasUnparsedCVs) {
        get().stopPolling();
      }
    };

    const pollingManager = new PollingManager(pollingFn, 2000);
    pollingManager.start();
    set({ pollingManager });
  },

  stopPolling: () => {
    const { pollingManager } = get();
    if (pollingManager) {
      pollingManager.stop();
      set({ pollingManager: null });
    }
  },
});
