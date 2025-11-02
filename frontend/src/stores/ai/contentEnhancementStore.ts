/**
 * Content Enhancement Store - AI content enhancement suggestions
 *
 * Manages content enhancement operations including enhancing CV content
 * and tracking suggestion states (accepted/rejected).
 */

import { StateCreator } from "zustand";
import type { AIStore } from "./types";
import { AISuggestionState } from "../../types/ai";
import { aiService } from "../../services/ai";
import { Logger } from "../../utils/logger";
import { ErrorHandler } from "../../utils/errorHandler";

export interface ContentEnhancementState {
  suggestions: Record<string, AISuggestionState>;
}

export interface ContentEnhancementActions {
  clearSuggestions: () => void;
  acceptSuggestion: (suggestionId: string, suggestionIndex: number) => void;
  rejectSuggestion: (suggestionId: string) => void;
  enhanceContent: (cvId: string, content: string, contentType: string) => Promise<any>;
  updateContentEnhancementStatus: (enhancementId: string) => Promise<any>;
}

export type ContentEnhancementSlice = ContentEnhancementState & ContentEnhancementActions;

export const createContentEnhancementSlice: StateCreator<
  AIStore,
  [],
  [],
  ContentEnhancementSlice
> = (set) => ({
  suggestions: {},

  clearSuggestions: () => {
    set({ suggestions: {} });
  },

  acceptSuggestion: (suggestionId: string, suggestionIndex: number) => {
    set((state) => {
      const suggestion = state.suggestions[suggestionId];
      if (suggestion) {
        return {
          suggestions: {
            ...state.suggestions,
            [suggestionId]: {
              ...suggestion,
              isAccepted: true,
              selectedSuggestion: suggestionIndex,
            },
          },
        };
      }
      return state;
    });
  },

  rejectSuggestion: (suggestionId: string) => {
    set((state) => {
      const suggestion = state.suggestions[suggestionId];
      if (suggestion) {
        return {
          suggestions: {
            ...state.suggestions,
            [suggestionId]: {
              ...suggestion,
              isAccepted: false,
              selectedSuggestion: undefined,
            },
          },
        };
      }
      return state;
    });
  },

  enhanceContent: async (cvId: string, content: string, contentType: string) => {
    try {
      const response = await aiService.enhanceContent(cvId, {
        original_content: content,
        content_type: contentType,
      });

      // If generation is complete immediately, add to suggestions
      if (!response.is_generating && response.enhancement_id) {
        const enhancement = await aiService.getContentEnhancementStatus(
          response.enhancement_id,
        );
        const suggestionId = `${contentType}-${content.substring(0, 20)}`;
        set((state) => ({
          suggestions: {
            ...state.suggestions,
            [suggestionId]: {
              id: suggestionId,
              originalContent: content,
              suggestions: enhancement.suggestions || [],
              overall_improvements: enhancement.overall_improvements || [],
              isLoading: false,
              error: undefined,
            },
          },
        }));
      }

      return response;
    } catch (error) {
      ErrorHandler.handle(error, {
        feature: "content-enhancement",
        action: "enhance",
        userMessage: "Failed to enhance content",
        metadata: { cvId, contentType },
      });
      throw error;
    }
  },

  updateContentEnhancementStatus: async (enhancementId: string) => {
    try {
      const updatedEnhancement =
        await aiService.getContentEnhancementStatus(enhancementId);

      // Update the enhancement in the store if it exists
      set((state) => ({
        suggestions: {
          ...state.suggestions,
          [enhancementId]: {
            ...state.suggestions[enhancementId],
            isLoading: updatedEnhancement.is_generating,
            error: updatedEnhancement.generation_error,
            suggestions: updatedEnhancement.suggestions || [],
            overall_improvements: updatedEnhancement.overall_improvements || [],
          },
        },
      }));

      return updatedEnhancement;
    } catch (error) {
      console.error("Failed to update content enhancement status:", error);
      throw error;
    }
  },
});
