/**
 * Inline Diff Section Hook
 * 
 * This hook provides functionality for individual CV sections to integrate with
 * the inline diff system. It handles highlighting logic, suggestion retrieval,
 * and data merging for sections that have AI suggestions.
 * 
 * Key responsibilities:
 * - Retrieve suggestions relevant to a specific section
 * - Provide highlighted data that merges original and suggested content
 * - Handle section-specific suggestion acceptance and rejection
 * - Determine if section should show diff highlights
 * - Provide utility functions for rendering suggested vs original content
 * 
 * Usage:
 * - Import and use in section components (SkillsSection, ProfessionalSummarySection, etc.)
 * - Hook automatically handles diff mode detection and data merging
 * - Components can render highlighted content based on hook results
 */

import { useMemo } from 'react';
import { useInlineDiffContext } from '../contexts/InlineDiffContext';
import { AISuggestion } from '../types/ai';

interface SectionDiffData {
  // Data with suggestions applied
  displayData: any;
  // Original data without suggestions
  originalData: any;
  // Suggestions specific to this section
  suggestions: AISuggestion[];
  // Whether section has pending suggestions
  hasPendingSuggestions: boolean;
  // Whether section has any suggestions
  hasSuggestions: boolean;
  // Whether to show highlighting
  shouldHighlight: boolean;
}

interface UseInlineDiffSectionOptions {
  section: string;
  fieldPath?: string;
  originalData: any;
}

export const useInlineDiffSection = ({
  section,
  fieldPath,
  originalData,
}: UseInlineDiffSectionOptions): SectionDiffData => {
  const {
    isInDiffMode,
    // suggestions, // Unused variable removed
    tempCV,
    highlightMode,
    getSuggestionsBySection,
  } = useInlineDiffContext();

  const sectionSuggestions = useMemo(() => {
    if (!isInDiffMode) return [];
    
    return getSuggestionsBySection(section).filter(suggestion => {
      // If fieldPath is specified, filter by it
      if (fieldPath) {
        return suggestion.fieldPath === fieldPath;
      }
      // If no fieldPath specified, include all suggestions for this section
      return true;
    });
  }, [isInDiffMode, section, fieldPath, getSuggestionsBySection]);

  const displayData = useMemo(() => {
    if (!isInDiffMode || !tempCV) {
      return originalData;
    }

    // Start with original data (not temp data with suggestions)
    let data = { ...originalData };
    
    // Get temp data for this section (but don't use it for display)
    // The temp data is only used to ensure structure exists
    if (tempCV.tempData && section in tempCV.tempData) {
      // Only use temp data structure, not the content
      const tempSectionData = tempCV.tempData[section];
      if (typeof tempSectionData === 'object' && tempSectionData !== null) {
        // Merge structure but keep original content
        data = { ...data, ...tempSectionData };
        // Restore original content
        if (Array.isArray(originalData)) {
          data = originalData;
        } else if (typeof originalData === 'object' && originalData !== null) {
          Object.keys(originalData).forEach(key => {
            if (originalData[key] !== undefined) {
              data[key] = originalData[key];
            }
          });
        }
      }
    }

    // Apply ONLY approved suggestions to display data
    sectionSuggestions
      .filter(s => s.status === 'approved')
      .forEach(suggestion => {
        if (suggestion.type === 'add_keyword') {
          if (suggestion.fieldPath && data[suggestion.fieldPath]) {
            // Add keyword if not already present
            if (Array.isArray(data[suggestion.fieldPath]) && 
                !data[suggestion.fieldPath].includes(suggestion.suggestedValue)) {
              data[suggestion.fieldPath] = [...data[suggestion.fieldPath], suggestion.suggestedValue];
            }
          }
        } else if (suggestion.type === 'enhance_content') {
          if (suggestion.fieldPath && suggestion.fieldPath in data) {
            data[suggestion.fieldPath] = suggestion.suggestedValue;
          } else if (!suggestion.fieldPath && typeof data === 'string') {
            data = suggestion.suggestedValue;
          }
        }
      });

    return data;
  }, [isInDiffMode, tempCV, originalData, section, sectionSuggestions]);

  const shouldHighlight = useMemo(() => {
    if (!isInDiffMode || sectionSuggestions.length === 0) {
      return false;
    }

    switch (highlightMode) {
      case 'pending':
        return sectionSuggestions.some(s => s.status === 'pending');
      case 'approved':
        return sectionSuggestions.some(s => s.status === 'approved');
      case 'all':
      default:
        return true;
    }
  }, [isInDiffMode, sectionSuggestions, highlightMode]);

  const hasPendingSuggestions = useMemo(() => {
    return sectionSuggestions.some(s => s.status === 'pending');
  }, [sectionSuggestions]);

  const hasSuggestions = sectionSuggestions.length > 0;

  return {
    displayData,
    originalData,
    suggestions: sectionSuggestions,
    hasPendingSuggestions,
    hasSuggestions,
    shouldHighlight,
  };
};

// Utility hook for getting highlighted keywords specifically
export const useHighlightedKeywords = (
  section: string,
  fieldPath: string,
  originalKeywords: string[]
): {
  highlightedKeywords: Array<{
    keyword: string;
    isNew: boolean;
    suggestion?: AISuggestion;
  }>;
  newKeywords: string[];
} => {
  const { getSuggestionsBySection, highlightMode } = useInlineDiffContext();

  const highlightedKeywords = useMemo(() => {
    const suggestions = getSuggestionsBySection(section).filter(
      s => s.fieldPath === fieldPath && s.type === 'add_keyword'
    );

    // Create array with original keywords
    const result = originalKeywords.map(keyword => ({
      keyword,
      isNew: false,
      suggestion: undefined,
    }));

    // Add new keywords from suggestions
    suggestions.forEach(suggestion => {
      const shouldShow = (suggestion.status === 'pending' && highlightMode !== 'approved') ||
          (suggestion.status === 'approved' && highlightMode !== 'pending') ||
          highlightMode === 'all';
      
      if (shouldShow) {
        // Only add if not already in original keywords
        if (!originalKeywords.includes(suggestion.suggestedValue)) {
          result.push({
            keyword: suggestion.suggestedValue,
            isNew: true,
            suggestion: undefined,
          });
        }
      }
    });
    return result;
  }, [originalKeywords, section, fieldPath, getSuggestionsBySection, highlightMode]);

  const newKeywords = highlightedKeywords
    .filter(item => item.isNew)
    .map(item => item.keyword);

  return {
    highlightedKeywords,
    newKeywords,
  };
};

// Utility hook for highlighted text content
export const useHighlightedContent = (
  section: string,
  fieldPath: string | undefined,
  originalContent: string
): {
  displayContent: string;
  hasChanges: boolean;
  suggestion?: AISuggestion;
} => {
  const { getSuggestionsBySection, highlightMode } = useInlineDiffContext();

  const result = useMemo(() => {
    const suggestions = getSuggestionsBySection(section).filter(s => {
      if (fieldPath) {
        return s.fieldPath === fieldPath && s.type === 'enhance_content';
      }
      return s.type === 'enhance_content' && !s.fieldPath;
    });

    const activeSuggestion = suggestions.find(s => {
      if (highlightMode === 'pending' && s.status === 'pending') return true;
      if (highlightMode === 'approved' && s.status === 'approved') return true;
      if (highlightMode === 'all') return true;
      return false;
    });

    return {
      displayContent: activeSuggestion?.suggestedValue || originalContent,
      hasChanges: !!activeSuggestion,
      suggestion: activeSuggestion,
    };
  }, [section, fieldPath, originalContent, getSuggestionsBySection, highlightMode]);

  return result;
};

export default useInlineDiffSection;
