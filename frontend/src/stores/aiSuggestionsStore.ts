/**
 * Unified AI Suggestions Store
 * 
 * This module manages the state for ALL AI-powered suggestions using Zustand.
 * It handles fetching all suggestions in one call, managing loading states, and dismissing suggestions.
 * 
 * Key responsibilities:
 * - Generate ALL suggestions (skills + professional summary) in one API call
 * - Manage unified loading and error states
 * - Handle dismissing individual suggestions
 * - Clear all suggestions when switching CVs or job descriptions
 * 
 * Usage:
 * - Import useAISuggestionsStore hook in components
 * - Call generateAllSuggestions to get ALL AI suggestions at once
 * - Call dismiss functions to remove suggestions from UI
 * - Call clearAllSuggestions when switching context
 */

import { create } from 'zustand';
import { aiService } from '../services/aiService';
import { Logger } from '../utils/logger';
import { ErrorHandler } from '../utils/errorHandler';
import { AllSuggestionsResponse } from '../types/ai';

interface AIStore {
  // Unified state
  allSuggestions: AllSuggestionsResponse | null;
  currentCvId: string | null;
  currentEnhancementId: string | null;
  suggestionsLoading: boolean;
  suggestionsError: string | null;

  // Actions
  generateAllSuggestions: (cvId: string, jobDescId: string) => Promise<string | void>;
  updateAIEnhancementStatus: (enhancementId: string) => Promise<any>;
  loadLatestAIEnhancement: (cvId: string) => Promise<void>;
  setSuggestionsLoading: (loading: boolean) => void;
  dismissSkillSuggestion: (skill: string, type: 'technical' | 'soft') => Promise<void>;
  dismissAllSkillSuggestions: () => Promise<void>;
  dismissSummarySuggestion: () => Promise<void>;
  clearAllSuggestions: () => void;
  deleteCurrentEnhancement: () => Promise<void>;
}

export const useAISuggestionsStore = create<AIStore>((set, get) => ({
  // Initial state
  allSuggestions: null,
  currentCvId: null,
  currentEnhancementId: null,
  suggestionsLoading: false,
  suggestionsError: null,
  
  // Generate ALL suggestions from AI using background task (new approach)
  generateAllSuggestions: async (cvId: string, jobDescId: string) => {
    set({ suggestionsLoading: true, suggestionsError: null });
    
    try {
      // Create AI enhancement task using background task API
      const result = await aiService.createAIEnhancement(cvId, jobDescId);
      
      // Return the enhancement ID for global polling integration
      return result.enhancement_id;
      
    } catch (error: any) {
      const errorMessage = error?.message || 'Failed to generate AI suggestions';
      ErrorHandler.handle(error, {
        feature: 'ai-suggestions',
        action: 'create-enhancement',
        metadata: { cvId, jobDescId }
      });
      
      set({
        allSuggestions: {
          skills: { technical: [], soft: [] },
          professional_summary: {
            suggested_text: "",
            original_text: "",
            key_changes: []
          }
        },
        suggestionsLoading: false,
        suggestionsError: errorMessage
      });
    }
  },

  // Update AI enhancement status (called by polling)
  updateAIEnhancementStatus: async (enhancementId: string) => {
    try {
      const enhancement = await aiService.getAIEnhancementStatus(enhancementId);

      if (!enhancement.is_generating) {
        // Convert enhancement data to AllSuggestionsResponse format
        const allSuggestions = enhancement.enhancement_data || {
          skills: { technical: [], soft: [] },
          professional_summary: {
            suggested_text: "",
            original_text: "",
            key_changes: []
          }
        };

        set({
          allSuggestions,
          currentCvId: enhancement.cv_id,
          currentEnhancementId: enhancementId,
          suggestionsLoading: false,
          suggestionsError: enhancement.generation_error || null
        });
      }

      return enhancement;
    } catch (error) {
      Logger.error('Failed to update AI enhancement status', { enhancementId, error: error.message });
      throw error;
    }
  },

  // Load the latest AI enhancement from backend (for page refresh persistence)
  loadLatestAIEnhancement: async (cvId: string) => {
    // Skip loading for temporary CVs (not yet saved to backend)
    if (cvId.startsWith('temp-')) {
      Logger.debug('Skipping AI enhancement load for temporary CV', { cvId });
      return;
    }

    try {
      const enhancement = await aiService.getLatestAIEnhancement(cvId);

      // Backend returns null when no enhancement exists (expected case - not an error)
      if (enhancement && enhancement.enhancement_data && !enhancement.is_generating) {
        // VALIDATE: Only set suggestions if they belong to this CV
        if (enhancement.cv_id === cvId) {
          set({
            allSuggestions: enhancement.enhancement_data,
            currentCvId: cvId,
            currentEnhancementId: enhancement.id,
            suggestionsLoading: false,
            suggestionsError: enhancement.generation_error || null
          });
        }
      } else {
        Logger.debug('No suggestions to restore for CV', { cvId });
      }
    } catch (error) {
      // Only log actual errors (network issues, auth failures, etc.)
      Logger.error('Error loading AI enhancement', { cvId, error: error.message });
      // Don't throw - just fail silently since this is optional restoration
    }
  },

  // Set suggestions loading state
  setSuggestionsLoading: (loading: boolean) => {
    set({ suggestionsLoading: loading });
  },

  // Dismiss a single skill suggestion from the UI
  dismissSkillSuggestion: async (skill: string, type: 'technical' | 'soft') => {
    Logger.debug('Dismissing skill suggestion', { skill, type, cvId });
    const currentSuggestions = get().allSuggestions;
    const enhancementId = get().currentEnhancementId;

    if (!currentSuggestions) {
      return;
    }

    // Update UI immediately - remove just this skill
    const updatedSuggestions = {
      ...currentSuggestions,
      skills: {
        ...currentSuggestions.skills,
        [type]: currentSuggestions.skills[type].filter(s => s.skill !== skill)
      }
    };

    set({ allSuggestions: updatedSuggestions });

    // Check if ALL suggestions across ALL sections are now dismissed
    const hasNoSuggestions =
      updatedSuggestions.skills.technical.length === 0 &&
      updatedSuggestions.skills.soft.length === 0 &&
      !updatedSuggestions.professional_summary.suggested_text;

    if (hasNoSuggestions) {
      // Delete the entire enhancement if EVERYTHING is dismissed
      await get().deleteCurrentEnhancement();
    } else if (enhancementId) {
      // Update the backend with partial dismissal
      try {
        await aiService.updateAIEnhancement(enhancementId, updatedSuggestions);
      } catch (error) {
        console.error('❌ [dismissSkillSuggestion] Failed to update backend:', error);
      }
    }
  },

  // Dismiss all skill suggestions from the UI
  dismissAllSkillSuggestions: async () => {
    const currentSuggestions = get().allSuggestions;
    const enhancementId = get().currentEnhancementId;

    if (!currentSuggestions) {
      return;
    }

    // Update UI immediately - clear skills only
    const updatedSuggestions = {
      ...currentSuggestions,
      skills: {
        technical: [],
        soft: []
      }
    };

    set({ allSuggestions: updatedSuggestions });

    // Check if ALL suggestions across ALL sections are now dismissed
    const hasNoSuggestions =
      updatedSuggestions.skills.technical.length === 0 &&
      updatedSuggestions.skills.soft.length === 0 &&
      !updatedSuggestions.professional_summary.suggested_text;

    if (hasNoSuggestions) {
      // Delete the entire enhancement if EVERYTHING is dismissed
      await get().deleteCurrentEnhancement();
    } else if (enhancementId) {
      // Update the backend with partial dismissal
      try {
        await aiService.updateAIEnhancement(enhancementId, updatedSuggestions);
      } catch (error) {
        console.error('❌ [dismissAllSkillSuggestions] Failed to update backend:', error);
      }
    }
  },

  // Dismiss professional summary suggestion
  dismissSummarySuggestion: async () => {
    const currentSuggestions = get().allSuggestions;
    const enhancementId = get().currentEnhancementId;

    if (!currentSuggestions) {
      return;
    }

    // Update UI immediately - clear summary only
    const updatedSuggestions = {
      ...currentSuggestions,
      professional_summary: {
        suggested_text: "",
        original_text: currentSuggestions.professional_summary.original_text,
        key_changes: []
      }
    };

    set({ allSuggestions: updatedSuggestions });

    // Check if ALL suggestions across ALL sections are now dismissed
    const hasNoSuggestions =
      updatedSuggestions.skills.technical.length === 0 &&
      updatedSuggestions.skills.soft.length === 0 &&
      !updatedSuggestions.professional_summary.suggested_text;

    if (hasNoSuggestions) {
      // Delete the entire enhancement if EVERYTHING is dismissed
      await get().deleteCurrentEnhancement();
    } else if (enhancementId) {
      // Update the backend with partial dismissal - save the updated suggestions
      try {
        // Update the enhancement_data in the backend with the new state
        await aiService.updateAIEnhancement(enhancementId, updatedSuggestions);
      } catch (error) {
        console.error('❌ [dismissSummarySuggestion] Failed to update backend:', error);
      }
    }
  },

  // Delete the current enhancement from the backend
  deleteCurrentEnhancement: async () => {
    const enhancementId = get().currentEnhancementId;

    if (!enhancementId) return;

    try {
      await aiService.deleteAIEnhancement(enhancementId);

      // Clear the enhancement ID from state
      set({
        allSuggestions: null,
        currentCvId: null,
        currentEnhancementId: null,
        suggestionsLoading: false,
        suggestionsError: null
      });
    } catch (error) {
      Logger.error('Failed to delete AI enhancement', { enhancementId, error: error.message });
      // Don't throw - just log the error
    }
  },

  // Clear all suggestions (called when switching CVs or job descriptions)
  clearAllSuggestions: () => {
    set({
      allSuggestions: null,
      currentCvId: null,
      currentEnhancementId: null,
      suggestionsLoading: false,
      suggestionsError: null
    });
  }
}));

// CV-validated selector: Only return suggestions if they belong to the current CV
export const useValidatedSuggestions = (cvId: string) => {
  return useAISuggestionsStore((state) => {
    if (state.currentCvId === cvId) {
      return state.allSuggestions;
    }
    return null;
  });
};

