/**
 * Inline Drafts Hook
 * 
 * This hook provides functionality for managing inline draft sections within the CV editor.
 * It handles draft loading, positioning, and integration with the CV content flow.
 * 
 * Key responsibilities:
 * - Load and manage drafts for a specific CV
 * - Determine appropriate positioning for draft sections
 * - Provide draft data for inline rendering
 * - Handle draft state updates and notifications
 * 
 * Usage:
 * - Used in CV editor components to manage inline draft display
 * - Provides draft data and positioning information
 * - Handles draft lifecycle events
 */

import { useState, useEffect, useCallback } from 'react';
import { useAIStore, useCVDrafts } from '../stores/aiStore';
import { useNotifications } from '../stores/uiStore';
import { DraftResponse } from '../types/ai';

interface DraftPosition {
  sectionId: string;
  position: 'before' | 'after';
  order: number;
}

interface InlineDraftState {
  drafts: DraftResponse[];
  isLoading: boolean;
  error: string | null;
  draftPositions: Map<string, DraftPosition>;
}

export const useInlineDrafts = (cvId: string, cvData?: any) => {
  const [state, setState] = useState<InlineDraftState>({
    drafts: [],
    isLoading: false,
    error: null,
    draftPositions: new Map(),
  });

  const { getCVDrafts } = useAIStore();
  const { showError } = useNotifications();
  const drafts = useCVDrafts(cvId);

  // Load drafts when component mounts or cvId changes
  useEffect(() => {
    if (cvId) {
      loadDrafts();
    }
  }, [cvId]);

  // Update state when drafts change - use a more stable comparison
  useEffect(() => {
    if (drafts && drafts.length >= 0) {
      // Filter out drafts for sections that already exist in the CV
      const filteredDrafts = drafts.filter(draft => {
        // For why_good_fit drafts, check if the section already exists in CV data
        if (draft.section_type === 'why_good_fit') {
          // Check if why_good_fit section exists and has content
          const hasWhyGoodFitSection = cvData?.why_good_fit && 
            (cvData.why_good_fit.content || cvData.why_good_fit.fit_analysis);
          
          if (hasWhyGoodFitSection) {
            return false; // Don't show draft if section already exists with content
          }
        }
        return true;
      });
      
      const positions = calculateDraftPositions(filteredDrafts);
      setState(prev => {
        // Only update if the drafts have actually changed
        const draftsChanged = prev.drafts.length !== filteredDrafts.length || 
          prev.drafts.some((prevDraft, index) => {
            const currentDraft = filteredDrafts[index];
            return !currentDraft || prevDraft.id !== currentDraft.id;
          });
        
        if (!draftsChanged) {
          return prev;
        }
        
        return {
          ...prev,
          drafts: filteredDrafts,
          draftPositions: positions,
        };
      });
    }
  }, [drafts, cvData]);

  const loadDrafts = useCallback(async () => {
    if (!cvId) return;

    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      await getCVDrafts(cvId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load drafts';
      setState(prev => ({ ...prev, error: errorMessage }));
      showError('Error', errorMessage);
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [cvId, getCVDrafts, showError]);

  // Calculate where each draft should be positioned in the CV
  const calculateDraftPositions = (drafts: DraftResponse[]): Map<string, DraftPosition> => {
    const positions = new Map<string, DraftPosition>();
    
    drafts.forEach((draft, index) => {
      let sectionId: string;
      let position: 'before' | 'after';
      let order: number;

      switch (draft.section_type) {
        case 'why_good_fit':
          // Position after personal info, before professional summary
          sectionId = 'personal_info';
          position = 'after';
          order = 150; // Between personal info (100) and professional summary (200)
          break;
        default:
          // Default positioning - add at the end
          sectionId = 'personal_info'; // Use personal info as reference point
          position = 'after';
          order = 1000 + index * 10; // Place after all regular sections
      }

      positions.set(draft.id, {
        sectionId,
        position,
        order,
      });
    });

    return positions;
  };

  // Get draft position for a specific draft
  const getDraftPosition = useCallback((draftId: string): DraftPosition | null => {
    return state.draftPositions.get(draftId) || null;
  }, [state.draftPositions]);

  // Check if a section should show drafts
  const shouldShowDraftsForSection = useCallback((sectionId: string): boolean => {
    return Array.from(state.draftPositions.values()).some(
      pos => pos.sectionId === sectionId
    );
  }, [state.draftPositions]);

  // Get drafts that should appear after a specific section
  const getDraftsAfterSection = useCallback((sectionId: string): DraftResponse[] => {
    return state.drafts.filter(draft => {
      const position = state.draftPositions.get(draft.id);
      return position?.sectionId === sectionId && position?.position === 'after';
    });
  }, [state.drafts, state.draftPositions]);

  // Get drafts that should appear before a specific section
  const getDraftsBeforeSection = useCallback((sectionId: string): DraftResponse[] => {
    return state.drafts.filter(draft => {
      const position = state.draftPositions.get(draft.id);
      return position?.sectionId === sectionId && position?.position === 'before';
    });
  }, [state.drafts, state.draftPositions]);

  // Handle draft approval
  const handleDraftApproved = useCallback((draftId: string) => {
    setState(prev => ({
      ...prev,
      drafts: prev.drafts.filter(draft => draft.id !== draftId),
      draftPositions: new Map(
        Array.from(prev.draftPositions.entries()).filter(([id]) => id !== draftId)
      ),
    }));
  }, []);

  // Handle draft rejection
  const handleDraftRejected = useCallback((draftId: string) => {
    setState(prev => ({
      ...prev,
      drafts: prev.drafts.filter(draft => draft.id !== draftId),
      draftPositions: new Map(
        Array.from(prev.draftPositions.entries()).filter(([id]) => id !== draftId)
      ),
    }));
  }, []);

  return {
    drafts: state.drafts,
    isLoading: state.isLoading,
    error: state.error,
    loadDrafts,
    getDraftPosition,
    shouldShowDraftsForSection,
    getDraftsAfterSection,
    getDraftsBeforeSection,
    handleDraftApproved,
    handleDraftRejected,
  };
};
