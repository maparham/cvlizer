/**
 * Drafts Store - Draft management for AI-generated CV sections
 *
 * Manages AI-generated draft sections including loading, approving, and
 * deleting drafts, with support for background task polling.
 */

import { StateCreator } from "zustand";
import type { AIStore } from "./types";
import { DraftState } from "../../types/ai";
import { aiService } from "../../services/ai";
import { ErrorHandler } from "../../utils/errorHandler";

export interface DraftsSliceState {
  drafts: DraftState;
}

export interface DraftsSliceActions {
  getCVDrafts: (cvId: string) => Promise<any[]>;
  approveWhyGoodFitDraft: (cvId: string, draftId: string) => Promise<any>;
  deleteWhyGoodFitDraft: (cvId: string) => Promise<void>;
  clearDrafts: () => void;
  clearDraftsForCV: (cvId: string) => void;
  clearAllDrafts: () => void;
  createJobFitDraft: (cvId: string, jobDescriptionId: string) => Promise<any>;
  updateDraftStatus: (draftId: string) => Promise<any>;
}

export type DraftsSlice = DraftsSliceState & DraftsSliceActions;

export const createDraftsSlice: StateCreator<
  AIStore,
  [],
  [],
  DraftsSlice
> = (set, _get) => ({
  drafts: {
    drafts: [],
    isLoading: false,
  },

  getCVDrafts: async (cvId: string) => {
    // Skip loading for temporary CVs (not yet saved to backend)
    if (cvId.startsWith("temp-")) {
      return [];
    }

    set((state) => ({
      drafts: { ...state.drafts, isLoading: true, error: undefined },
    }));

    try {
      const drafts = await aiService.getCVDrafts(cvId);

      set((state) => {
        // Clear existing drafts for this CV and add new ones
        // This ensures we don't accumulate drafts from different CVs
        const otherCVDrafts = state.drafts.drafts.filter(
          (draft) => draft.cv_id !== cvId,
        );

        return {
          drafts: {
            ...state.drafts,
            drafts: [...otherCVDrafts, ...drafts],
            isLoading: false,
            error: undefined,
          },
        };
      });

      return drafts;
    } catch (error) {
      set((state) => ({
        drafts: {
          ...state.drafts,
          isLoading: false,
          error:
            error instanceof Error ? error.message : "Failed to get drafts",
        },
      }));
      throw error;
    }
  },

  approveWhyGoodFitDraft: async (cvId: string, draftId: string) => {
    try {
      const result = await aiService.approveWhyGoodFitDraft(cvId, draftId);

      // Remove the approved draft from the drafts list
      set((state) => ({
        drafts: {
          ...state.drafts,
          drafts: state.drafts.drafts.filter(
            (draft) => draft.id !== draftId,
          ),
        },
      }));

      // Return the full result including updated CV data
      return result;
    } catch (error) {
      set((state) => ({
        drafts: {
          ...state.drafts,
          error:
            error instanceof Error
              ? error.message
              : "Failed to approve draft",
        },
      }));
      throw error;
    }
  },

  deleteWhyGoodFitDraft: async (cvId: string) => {
    try {
      await aiService.deleteWhyGoodFitDraft(cvId);

      // Remove the draft from the drafts list
      set((state) => ({
        drafts: {
          ...state.drafts,
          drafts: state.drafts.drafts.filter(
            (draft) =>
              !(
                draft.cv_id === cvId &&
                draft.section_type === "why_good_fit"
              ),
          ),
        },
      }));
    } catch (error) {
      set((state) => ({
        drafts: {
          ...state.drafts,
          error:
            error instanceof Error
              ? error.message
              : "Failed to delete draft",
        },
      }));
      throw error;
    }
  },

  clearDrafts: () => {
    set((state) => ({
      drafts: { ...state.drafts, drafts: [], error: undefined },
    }));
  },

  clearDraftsForCV: (cvId: string) => {
    set((state) => ({
      drafts: {
        ...state.drafts,
        drafts: state.drafts.drafts.filter((draft) => draft.cv_id !== cvId),
      },
    }));
  },

  clearAllDrafts: () => {
    set((state) => ({
      drafts: {
        ...state.drafts,
        drafts: [],
      },
    }));
  },

  createJobFitDraft: async (cvId: string, jobDescriptionId: string) => {
    try {
      const response = await aiService.createJobFitDraft(
        cvId,
        jobDescriptionId,
      );

      // Backend deletes any existing why_good_fit draft before creating a new one
      // So we need to remove any existing why_good_fit drafts from the store
      set((state) => {
        // Remove any existing why_good_fit drafts for this CV
        const filteredDrafts = state.drafts.drafts.filter(
          (draft) =>
            !(
              draft.cv_id === cvId && draft.section_type === "why_good_fit"
            ),
        );

        // If generation is complete immediately, add the new draft
        const newDrafts = response.is_generating
          ? filteredDrafts
          : [...filteredDrafts, response];

        return {
          drafts: {
            ...state.drafts,
            drafts: newDrafts,
          },
        };
      });

      return response;
    } catch (error) {
      ErrorHandler.handle(error, {
        feature: "job-fit-draft",
        action: "create",
        userMessage: "Failed to create job fit analysis",
        metadata: { cvId, jobDescriptionId },
      });
      throw error;
    }
  },

  updateDraftStatus: async (draftId: string) => {
    try {
      const updatedDraft = await aiService.getDraftStatus(draftId);

      // Update or add the draft in the store
      set((state) => {
        const existingDraftIndex = state.drafts.drafts.findIndex(
          (draft) => draft.id === draftId,
        );

        let newDrafts;
        if (existingDraftIndex >= 0) {
          // Draft exists - update it
          newDrafts = state.drafts.drafts.map((draft) =>
            draft.id === draftId ? updatedDraft : draft,
          );
        } else {
          // Draft doesn't exist - add it (this happens when background task completes)
          newDrafts = [...state.drafts.drafts, updatedDraft];
        }

        return {
          drafts: {
            ...state.drafts,
            drafts: newDrafts,
          },
        };
      });

      return updatedDraft;
    } catch (error) {
      console.error("Failed to update draft status:", error);
      throw error;
    }
  },
});
