/**
 * CV History Slice - CV history tracking and snapshot functionality
 *
 * Manages CV history tracking including snapshots, restore points,
 * and auto-snapshot functionality. Handles history panel state
 * and integrates with backend history service.
 */

import { StateCreator } from "zustand";
import {
  CV,
  CVData,
  CVHistoryEntry,
  CreateSnapshotOptions,
  RestoreVersionOptions,
  HistoryStats,
} from "../../types";
import { backendHistoryService } from "../../services/backendHistoryService";
import { normalizeCVSkillsTechnicalInParsedData } from "../../utils/normalizeSkillsTechnical";
import { isHistoryEnabled } from "./constants";
import type { CVStore } from "./types";

export interface CVHistorySliceState {
  // History state
  historyPanelOpen: boolean;
  autoSnapshotsEnabled: boolean;
  lastAutoSnapshot: string | null;
}

export interface CVHistorySliceActions {
  // History actions
  createSnapshot: (
    cvId: string,
    cvData: CVData,
    options: CreateSnapshotOptions,
  ) => Promise<CVHistoryEntry>;
  getHistoryEntries: (cvId: string) => Promise<CVHistoryEntry[]>;
  getHistoryEntry: (
    cvId: string,
    entryId: string,
  ) => Promise<CVHistoryEntry | null>;
  restoreVersion: (cvId: string, options: RestoreVersionOptions) => Promise<CV>;
  deleteHistoryEntry: (cvId: string, entryId: string) => Promise<boolean>;
  getHistoryStats: (cvId: string) => Promise<HistoryStats>;
  setHistoryPanelOpen: (open: boolean) => void;
  setAutoSnapshotsEnabled: (enabled: boolean) => void;

  // Internal history helpers
  shouldCreateAutoSnapshot: (cvId: string) => Promise<boolean>;
  createAutoSnapshotIfNeeded: (
    cvId: string,
    cvData: CVData,
    changeType?: string,
  ) => Promise<void>;
  createSnapshotOnUserAction: (
    cvId: string,
    cvData: CVData,
    action: string,
    customDescription?: string,
  ) => Promise<void>;
}

export type CVHistorySlice = CVHistorySliceState & CVHistorySliceActions;

export const createCVHistorySlice: StateCreator<
  CVStore,
  [],
  [],
  CVHistorySlice
> = (set, get) => ({
  // Initial state
  historyPanelOpen: false,
  autoSnapshotsEnabled: false,
  lastAutoSnapshot: null,

  // History actions
  createSnapshot: async (
    cvId: string,
    cvData: CVData,
    options: CreateSnapshotOptions,
  ): Promise<CVHistoryEntry> => {
    // Skip if history feature is disabled
    if (!isHistoryEnabled()) {
      // Return a mock entry to prevent crashes
      return {
        id: `disabled_${Date.now()}`,
        timestamp: new Date().toISOString(),
        cvData: cvData,
        changeType: options.changeType,
        description: options.description || "Snapshot created",
        isAutomatic:
          options.changeType !== "manual_save" &&
          options.changeType !== "restore_point",
        isInitial: options.changeType === "initial_load",
        label: options.label,
        dataSize: JSON.stringify(cvData).length,
      };
    }

    const entry = await backendHistoryService.createSnapshot(
      cvId,
      cvData,
      options,
    );

    // Update last auto snapshot time if this was automatic
    if (entry.isAutomatic) {
      set({ lastAutoSnapshot: entry.timestamp });
    }

    return entry;
  },

  getHistoryEntries: async (cvId: string): Promise<CVHistoryEntry[]> => {
    return await backendHistoryService.getHistoryEntries(cvId);
  },

  getHistoryEntry: async (
    cvId: string,
    entryId: string,
  ): Promise<CVHistoryEntry | null> => {
    return await backendHistoryService.getHistoryEntry(cvId, entryId);
  },

  restoreVersion: async (
    cvId: string,
    options: RestoreVersionOptions,
  ): Promise<CV> => {
    get().setLoading(true);
    get().setError(null);

    try {
      // Use the backend restore endpoint which handles CV update
      const result = await backendHistoryService.restoreVersion(
        cvId,
        options.entryId,
      );

      const updatedCV = normalizeCVSkillsTechnicalInParsedData(result.cv);

      // Update local state
      set({
        currentCV: updatedCV,
        loading: false,
        error: null,
      });

      get().updateCVInList(updatedCV);

      return updatedCV;
    } catch (error: any) {
      set({ loading: false });
      throw error;
    }
  },

  deleteHistoryEntry: async (
    cvId: string,
    entryId: string,
  ): Promise<boolean> => {
    return await backendHistoryService.deleteHistoryEntry(cvId, entryId);
  },

  getHistoryStats: async (cvId: string): Promise<HistoryStats> => {
    return await backendHistoryService.getHistoryStats(cvId);
  },

  setHistoryPanelOpen: (open: boolean) => {
    set({ historyPanelOpen: open });
  },

  setAutoSnapshotsEnabled: (enabled: boolean) => {
    set({ autoSnapshotsEnabled: enabled });
  },

  // Internal history helpers
  shouldCreateAutoSnapshot: async (cvId: string): Promise<boolean> => {
    const { autoSnapshotsEnabled } = get();
    if (!autoSnapshotsEnabled) return false;

    try {
      const historyEntries = await get().getHistoryEntries(cvId);

      // If no history at all, don't auto-create (initial load will handle this)
      if (historyEntries.length === 0) return false;

      // Get the most recent entry
      const lastEntry = historyEntries[0];
      if (!lastEntry) return true;

      // Check if enough time has passed since last entry (30 seconds)
      const timeSinceLastEntry =
        Date.now() - new Date(lastEntry.timestamp).getTime();
      return timeSinceLastEntry >= 30000;
    } catch (error) {
      return false;
    }
  },

  createAutoSnapshotIfNeeded: async (
    cvId: string,
    cvData: CVData,
    changeType: string = "auto_save",
  ): Promise<void> => {
    // Skip if history feature is disabled
    if (!isHistoryEnabled()) return;

    if (!(await get().shouldCreateAutoSnapshot(cvId))) return;

    try {
      const descriptions = {
        auto_save: "Auto-saved changes",
        manual_save: "CV saved",
        section_edit: "Section edited",
      };

      await get().createSnapshot(cvId, cvData, {
        changeType: changeType as any,
        description:
          descriptions[changeType as keyof typeof descriptions] ||
          "CV updated",
        force: false,
      });
    } catch (error: any) {
      // Don't throw on auto-snapshot failures
    }
  },

  createSnapshotOnUserAction: async (
    cvId: string,
    cvData: CVData,
    action: string,
    customDescription?: string,
  ): Promise<void> => {
    // Skip if history feature is disabled
    if (!isHistoryEnabled()) return;

    try {
      const actionDescriptions = {
        section_completed: "Section editing completed",
        bulk_edit: "Multiple sections updated",
        major_change: "Significant changes made",
        manual_save: "CV saved by user",
      };

      // Use custom description if provided, otherwise fall back to action descriptions
      const description =
        customDescription ||
        actionDescriptions[action as keyof typeof actionDescriptions] ||
        "CV updated";

      await get().createSnapshot(cvId, cvData, {
        changeType: "manual_save",
        description: description,
        force: false,
      });
    } catch (error: any) {
      // Snapshot creation failed
    }
  },
});
