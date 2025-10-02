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
import { AllSuggestionsResponse } from '../types/ai';

interface AIStore {
  // Unified state
  allSuggestions: AllSuggestionsResponse | null;
  suggestionsLoading: boolean;
  suggestionsError: string | null;
  
  // Actions
  generateAllSuggestions: (cvId: string, jobDescId: string) => Promise<void>;
  dismissSkillSuggestion: (skill: string, type: 'technical' | 'soft') => void;
  dismissAllSkillSuggestions: () => void;
  dismissSummarySuggestion: () => void;
  clearAllSuggestions: () => void;
}

export const useAISuggestionsStore = create<AIStore>((set, get) => ({
  // Initial state
  allSuggestions: null,
  suggestionsLoading: false,
  suggestionsError: null,
  
  // Generate ALL suggestions from AI in one call
  generateAllSuggestions: async (cvId: string, jobDescId: string) => {
    set({ suggestionsLoading: true, suggestionsError: null });
    
    try {
      const result = await aiService.generateAllSuggestions(cvId, jobDescId);
      
      set({
        allSuggestions: result,
        suggestionsLoading: false,
        suggestionsError: null
      });
    } catch (error: any) {
      const errorMessage = error?.message || 'Failed to generate AI suggestions';
      
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
  
  // Dismiss a single skill suggestion from the UI
  dismissSkillSuggestion: (skill: string, type: 'technical' | 'soft') => {
    const currentSuggestions = get().allSuggestions;
    
    if (!currentSuggestions) return;
    
    set({
      allSuggestions: {
        ...currentSuggestions,
        skills: {
          ...currentSuggestions.skills,
          [type]: currentSuggestions.skills[type].filter(s => s.skill !== skill)
        }
      }
    });
  },
  
  // Dismiss all skill suggestions from the UI
  dismissAllSkillSuggestions: () => {
    const currentSuggestions = get().allSuggestions;
    
    if (!currentSuggestions) return;
    
    set({
      allSuggestions: {
        ...currentSuggestions,
        skills: {
          technical: [],
          soft: []
        }
      }
    });
  },
  
  // Dismiss professional summary suggestion
  dismissSummarySuggestion: () => {
    const currentSuggestions = get().allSuggestions;
    
    if (!currentSuggestions) return;
    
    set({
      allSuggestions: {
        ...currentSuggestions,
        professional_summary: {
          suggested_text: "",
          original_text: currentSuggestions.professional_summary.original_text,
          key_changes: []
        }
      }
    });
  },
  
  // Clear all suggestions (called when switching CVs or job descriptions)
  clearAllSuggestions: () => {
    set({
      allSuggestions: null,
      suggestionsLoading: false,
      suggestionsError: null
    });
  }
}));

