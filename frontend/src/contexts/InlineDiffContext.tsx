/**
 * Inline Diff Context Provider
 * 
 * This context provider manages the inline diff functionality for AI suggestions.
 * It provides a convenient wrapper around the AI store's inline diff capabilities
 * and handles the integration with CV data.
 * 
 * Key responsibilities:
 * - Provide easy access to inline diff state and actions
 * - Handle CV data integration for diff mode
 * - Manage suggestion highlighting and visual feedback
 * - Coordinate between AI store and CV components
 * 
 * Usage:
 * - Wrap CV editor components with InlineDiffProvider
 * - Use useInlineDiffContext hook to access functionality
 * - Components can check if they're in diff mode and react accordingly
 */

import React, { createContext, useContext, ReactNode } from 'react';
import { useAIStore, useInlineDiff, useInlineDiffSuggestions, useTempCV, useIsDiffMode } from '../stores/aiStore';
import { AISuggestion } from '../types/ai';

interface InlineDiffContextValue {
  // State
  isInDiffMode: boolean;
  suggestions: AISuggestion[];
  tempCV: any;
  isPanelOpen: boolean;
  isApplyingAll: boolean;
  highlightMode: 'all' | 'pending' | 'approved';
  error?: string;

  // Actions
  generateSuggestions: (cvId: string, jobDescriptionId: string) => Promise<void>;
  applyAllSuggestions: (cvData: any) => void;
  acceptSuggestion: (suggestionId: string) => void;
  rejectSuggestion: (suggestionId: string) => void;
  togglePanel: (isOpen?: boolean) => void;
  setHighlightMode: (mode: 'all' | 'pending' | 'approved') => void;
  exitDiffMode: () => void;
  commitChanges: () => any;

  // Utility functions
  getSuggestionsBySection: (section: string) => AISuggestion[];
  getSuggestionById: (id: string) => AISuggestion | undefined;
  hasSuggestionsForSection: (section: string) => boolean;
  getPendingSuggestionsCount: () => number;
  getApprovedSuggestionsCount: () => number;
}

const InlineDiffContext = createContext<InlineDiffContextValue | null>(null);

interface InlineDiffProviderProps {
  children: ReactNode;
}

export const InlineDiffProvider: React.FC<InlineDiffProviderProps> = ({ children }) => {
  const generateInlineSuggestions = useAIStore((state) => state.generateInlineSuggestions);
  const applyAllSuggestions = useAIStore((state) => state.applyAllSuggestions);
  const acceptSuggestion = useAIStore((state) => state.acceptInlineSuggestion);
  const rejectSuggestion = useAIStore((state) => state.rejectInlineSuggestion);
  const toggleSuggestionPanel = useAIStore((state) => state.toggleSuggestionPanel);
  const setHighlightMode = useAIStore((state) => state.setHighlightMode);
  const exitDiffMode = useAIStore((state) => state.exitDiffMode);
  const commitApprovedChanges = useAIStore((state) => state.commitApprovedChanges);

  const inlineDiff = useInlineDiff();
  const suggestions = useInlineDiffSuggestions();
  const tempCV = useTempCV();
  const isInDiffMode = useIsDiffMode();

  // Utility functions
  const getSuggestionsBySection = (section: string): AISuggestion[] => {
    return suggestions.filter(suggestion => suggestion.section === section);
  };

  const getSuggestionById = (id: string): AISuggestion | undefined => {
    return suggestions.find(suggestion => suggestion.id === id);
  };

  const hasSuggestionsForSection = (section: string): boolean => {
    return suggestions.some(suggestion => suggestion.section === section);
  };

  const getPendingSuggestionsCount = (): number => {
    return suggestions.filter(suggestion => suggestion.status === 'pending').length;
  };

  const getApprovedSuggestionsCount = (): number => {
    return suggestions.filter(suggestion => suggestion.status === 'approved').length;
  };

  const contextValue: InlineDiffContextValue = {
    // State
    isInDiffMode,
    suggestions,
    tempCV,
    isPanelOpen: inlineDiff.isPanelOpen,
    isApplyingAll: inlineDiff.isApplyingAll,
    highlightMode: inlineDiff.highlightMode,
    error: inlineDiff.error,

    // Actions
    generateSuggestions: generateInlineSuggestions,
    applyAllSuggestions,
    acceptSuggestion,
    rejectSuggestion,
    togglePanel: toggleSuggestionPanel,
    setHighlightMode,
    exitDiffMode,
    commitChanges: commitApprovedChanges,

    // Utility functions
    getSuggestionsBySection,
    getSuggestionById,
    hasSuggestionsForSection,
    getPendingSuggestionsCount,
    getApprovedSuggestionsCount,
  };

  return (
    <InlineDiffContext.Provider value={contextValue}>
      {children}
    </InlineDiffContext.Provider>
  );
};

export const useInlineDiffContext = (): InlineDiffContextValue => {
  const context = useContext(InlineDiffContext);
  if (!context) {
    throw new Error('useInlineDiffContext must be used within an InlineDiffProvider');
  }
  return context;
};
