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

import { create } from "zustand";
import { aiService } from "../services/ai";
import { Logger } from "../utils/logger";
import { ErrorHandler } from "../utils/errorHandler";
import { AllSuggestionsResponse, ItemDescriptionSuggestion } from "../types/ai";
import { useAIStore } from "./ai";
import { useEditedSinceAIStore } from "./editedSinceAIStore";

/** Section keys in AllSuggestionsResponse that have item arrays using id/item_id. */
const SUGGESTION_SECTIONS: (keyof Pick<
  AllSuggestionsResponse,
  | "work_experience"
  | "education"
  | "certifications"
  | "projects"
  | "awards"
  | "volunteer_experience"
>)[] = [
  "work_experience",
  "education",
  "certifications",
  "projects",
  "awards",
  "volunteer_experience",
];

/** Get item identifier from API shape (id is canonical; item_id for compatibility). */
function getSuggestionItemId(item: ItemDescriptionSuggestion | { id?: string; item_id?: string }): string | undefined {
  return item.id ?? (item as { item_id?: string }).item_id;
}

function clearEditedFlagsForNewSuggestions(cvId: string, allSuggestions: AllSuggestionsResponse) {
  const { clearEdited } = useEditedSinceAIStore.getState();
  for (const section of SUGGESTION_SECTIONS) {
    const items = allSuggestions[section];
    if (!Array.isArray(items)) continue;
    for (const item of items) {
      const itemId = getSuggestionItemId(item);
      if (itemId) clearEdited(cvId, `${section}:${itemId}`);
    }
  }
  const hasSkills =
    allSuggestions.skills &&
    ((allSuggestions.skills.technical?.length ?? 0) > 0 || (allSuggestions.skills.soft?.length ?? 0) > 0);
  if (hasSkills) clearEdited(cvId, "skills");
}

interface AIStore {
  // Unified state
  allSuggestions: AllSuggestionsResponse | null;
  currentCvId: string | null;
  currentEnhancementId: string | null;
  suggestionsLoading: boolean;
  suggestionsError: string | null;

  // Actions
  generateAllSuggestions: (
    cvId: string,
    jobDescId: string,
  ) => Promise<string | void>;
  updateAIEnhancementStatus: (enhancementId: string) => Promise<any>;
  loadLatestAIEnhancement: (cvId: string) => Promise<void>;
  setSuggestionsLoading: (loading: boolean) => void;
  dismissSkillSuggestion: (
    skill: string,
    type: "technical" | "soft",
  ) => Promise<void>;
  dismissAllSkillSuggestions: () => Promise<void>;
  dismissSummarySuggestion: () => Promise<void>;
  dismissWhyGoodFitSuggestion: () => Promise<void>;
  dismissWorkExperienceSuggestion: (itemId: string) => Promise<void>;
  dismissAllWorkExperienceSuggestions: () => Promise<void>;
  dismissEducationSuggestion: (itemId: string) => Promise<void>;
  dismissAllEducationSuggestions: () => Promise<void>;
  dismissAllSuggestions: () => Promise<void>;
  clearAllSuggestions: () => void;
  clearSuggestionsError: () => void;
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
      // Create combined AI suggestions task (includes Why Good Fit draft)
      const result = await aiService.createCombinedAISuggestions(cvId, jobDescId);

      // Return the enhancement ID for global polling integration
      return result.enhancement_id;
    } catch (error: any) {
      const errorMessage =
        error?.message || "Failed to generate AI suggestions";

      // Check if this is a rate limit error - don't set inline error for rate limits
      const isRateLimitError =
        error?.code === '429' ||
        error?.code === 429 ||
        error?.response?.status === 429 ||
        error?.message?.includes('429');

      ErrorHandler.handle(error, {
        feature: "ai-suggestions",
        action: "create-enhancement",
        metadata: { cvId, jobDescId },
      });

      // Only set inline error if it's NOT a rate limit error
      // Rate limit errors are shown as toast notifications only
      set({
        allSuggestions: {
          skills: { technical: [], soft: [] },
          professional_summary: {
            suggested_text: "",
            original_text: "",
            key_changes: [],
          },
          work_experience: [],
          education: [],
        },
        suggestionsLoading: false,
        suggestionsError: isRateLimitError ? null : errorMessage,
      });
    }
  },

  // Update AI enhancement status (called by polling)
  updateAIEnhancementStatus: async (enhancementId: string) => {
    try {
      const enhancement = await aiService.getAIEnhancementStatus(enhancementId);

      if (!enhancement.is_generating) {
        // Convert enhancement data to AllSuggestionsResponse format
        const rawData = enhancement.enhancement_data || {};
        const allSuggestions: AllSuggestionsResponse = {
          skills: rawData.skills || { technical: [], soft: [] },
          professional_summary: rawData.professional_summary || {
            suggested_text: "",
            original_text: "",
            key_changes: [],
          },
          work_experience: Array.isArray(rawData.work_experience) ? rawData.work_experience : [],
          education: Array.isArray(rawData.education) ? rawData.education : [],
          why_good_fit: rawData.why_good_fit || {
            title: "",
            confidence_score: 0,
            fit_analysis: "",
            key_matches: [],
            missing_skills: [],
            suggested_improvements: [],
            strengths: [],
            weaknesses: [],
          },
          certifications: Array.isArray(rawData.certifications) ? rawData.certifications : [],
          projects: Array.isArray(rawData.projects) ? rawData.projects : [],
          awards: Array.isArray(rawData.awards) ? rawData.awards : [],
          volunteer_experience: Array.isArray(rawData.volunteer_experience) ? rawData.volunteer_experience : [],
        };

        set({
          allSuggestions,
          currentCvId: enhancement.cv_id,
          currentEnhancementId: enhancementId,
          suggestionsLoading: false,
          suggestionsError: enhancement.generation_error || null,
        });

        clearEditedFlagsForNewSuggestions(enhancement.cv_id, allSuggestions);

        // Extract draft_id from meta and update job fit analysis
        const draftId = (rawData.meta as any)?.draft_id;
        if (draftId) {
          // Update job fit analysis lastAnalysis from the draft
          const updateLastAnalysis = useAIStore.getState().updateLastAnalysisFromDraft;
          if (updateLastAnalysis) {
            await updateLastAnalysis(draftId);
          }
        }
      }

      return enhancement;
    } catch (error: any) {
      Logger.error("Failed to update AI enhancement status", {
        enhancementId,
        error: error?.message || String(error),
      });
      throw error;
    }
  },

  // Load the latest AI enhancement from backend (for page refresh persistence)
  loadLatestAIEnhancement: async (cvId: string) => {
    // Skip loading for temporary CVs (not yet saved to backend)
    if (cvId.startsWith("temp-")) {
      return;
    }

    try {
      const enhancement = await aiService.getLatestAIEnhancement(cvId);

      // Backend returns null when no enhancement exists (expected case - not an error)
      if (
        enhancement &&
        enhancement.enhancement_data &&
        !enhancement.is_generating
      ) {
        // VALIDATE: Only set suggestions if they belong to this CV
        if (enhancement.cv_id === cvId) {
          // Normalize enhancement data to ensure proper structure
          const rawData = enhancement.enhancement_data || {};
          const allSuggestions: AllSuggestionsResponse = {
            skills: rawData.skills || { technical: [], soft: [] },
            professional_summary: rawData.professional_summary || {
              suggested_text: "",
              original_text: "",
              key_changes: [],
            },
            work_experience: Array.isArray(rawData.work_experience) ? rawData.work_experience : [],
            education: Array.isArray(rawData.education) ? rawData.education : [],
            why_good_fit: rawData.why_good_fit || {
              title: "",
              confidence_score: 0,
              fit_analysis: "",
              key_matches: [],
              missing_skills: [],
              suggested_improvements: [],
              strengths: [],
              weaknesses: [],
            },
            certifications: Array.isArray(rawData.certifications) ? rawData.certifications : [],
            projects: Array.isArray(rawData.projects) ? rawData.projects : [],
            awards: Array.isArray(rawData.awards) ? rawData.awards : [],
            volunteer_experience: Array.isArray(rawData.volunteer_experience) ? rawData.volunteer_experience : [],
          };

          set({
            allSuggestions,
            currentCvId: cvId,
            currentEnhancementId: enhancement.id,
            suggestionsLoading: false,
            suggestionsError: enhancement.generation_error || null,
          });

          clearEditedFlagsForNewSuggestions(cvId, allSuggestions);

          // Extract draft_id from meta and update job fit analysis
          const draftId = (rawData.meta as any)?.draft_id;
          if (draftId) {
            // Update job fit analysis lastAnalysis from the draft
            const updateLastAnalysis = useAIStore.getState().updateLastAnalysisFromDraft;
            if (updateLastAnalysis) {
              await updateLastAnalysis(draftId);
            }
          }
        } else {
          // Enhancement CV ID mismatch - skip loading
        }
      } else {
        // No enhancement to load
      }
    } catch (error: any) {
      // Only log actual errors (network issues, auth failures, etc.)
      Logger.error("[loadLatestAIEnhancement] Error loading enhancement", {
        cvId,
        error: error?.message || String(error),
        errorCode: error?.code,
        errorStatus: error?.response?.status,
      });
      // Don't throw - just fail silently since this is optional restoration
    }
  },

  // Set suggestions loading state
  setSuggestionsLoading: (loading: boolean) => {
    set({ suggestionsLoading: loading });
  },

  // Dismiss a single skill suggestion from the UI
  dismissSkillSuggestion: async (skill: string, type: "technical" | "soft") => {
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
        [type]: currentSuggestions.skills[type].filter(
          (s) => s.skill !== skill,
        ),
      },
    };

    set({ allSuggestions: updatedSuggestions });

    // Check if ALL suggestions across ALL sections are now dismissed
    const hasNoSuggestions =
      updatedSuggestions.skills.technical.length === 0 &&
      updatedSuggestions.skills.soft.length === 0 &&
      !updatedSuggestions.professional_summary.suggested_text &&
      (updatedSuggestions.work_experience || []).length === 0 &&
      (updatedSuggestions.education || []).length === 0 &&
      !updatedSuggestions.why_good_fit?.fit_analysis;

    if (hasNoSuggestions) {
      // Delete the entire enhancement if EVERYTHING is dismissed
      await get().deleteCurrentEnhancement();
    } else if (enhancementId) {
      // Update the backend with partial dismissal
      try {
        await aiService.updateAIEnhancement(enhancementId, updatedSuggestions);
      } catch (error) {
        console.error(
          "❌ [dismissSkillSuggestion] Failed to update backend:",
          error,
        );
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
        soft: [],
      },
    };

    set({ allSuggestions: updatedSuggestions });

    // Check if ALL suggestions across ALL sections are now dismissed
    const hasNoSuggestions =
      updatedSuggestions.skills.technical.length === 0 &&
      updatedSuggestions.skills.soft.length === 0 &&
      !updatedSuggestions.professional_summary.suggested_text &&
      (updatedSuggestions.work_experience || []).length === 0 &&
      (updatedSuggestions.education || []).length === 0 &&
      !updatedSuggestions.why_good_fit?.fit_analysis;

    if (hasNoSuggestions) {
      // Delete the entire enhancement if EVERYTHING is dismissed
      await get().deleteCurrentEnhancement();
    } else if (enhancementId) {
      // Update the backend with partial dismissal
      try {
        await aiService.updateAIEnhancement(enhancementId, updatedSuggestions);
      } catch (error) {
        console.error(
          "❌ [dismissAllSkillSuggestions] Failed to update backend:",
          error,
        );
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
        key_changes: [],
      },
    };

    set({ allSuggestions: updatedSuggestions });

    // Check if ALL suggestions across ALL sections are now dismissed
    const hasNoSuggestions =
      updatedSuggestions.skills.technical.length === 0 &&
      updatedSuggestions.skills.soft.length === 0 &&
      !updatedSuggestions.professional_summary.suggested_text &&
      (updatedSuggestions.work_experience || []).length === 0 &&
      (updatedSuggestions.education || []).length === 0 &&
      !updatedSuggestions.why_good_fit?.fit_analysis;

    if (hasNoSuggestions) {
      // Delete the entire enhancement if EVERYTHING is dismissed
      await get().deleteCurrentEnhancement();
    } else if (enhancementId) {
      // Update the backend with partial dismissal - save the updated suggestions
      try {
        // Update the enhancement_data in the backend with the new state
        await aiService.updateAIEnhancement(enhancementId, updatedSuggestions);
      } catch (error) {
        console.error(
          "❌ [dismissSummarySuggestion] Failed to update backend:",
          error,
        );
      }
    }
  },

  // Dismiss why_good_fit suggestion
  dismissWhyGoodFitSuggestion: async () => {
    const currentSuggestions = get().allSuggestions;
    const enhancementId = get().currentEnhancementId;

    if (!currentSuggestions) {
      return;
    }

    // Update UI immediately - clear why_good_fit only
    const updatedSuggestions = {
      ...currentSuggestions,
      why_good_fit: {
        title: "",
        confidence_score: 0,
        fit_analysis: "",
        key_matches: [],
        missing_skills: [],
        suggested_improvements: [],
        strengths: [],
        weaknesses: [],
      },
    };

    set({ allSuggestions: updatedSuggestions });

    // Check if ALL suggestions across ALL sections are now dismissed
    const hasNoSuggestions =
      updatedSuggestions.skills.technical.length === 0 &&
      updatedSuggestions.skills.soft.length === 0 &&
      !updatedSuggestions.professional_summary.suggested_text &&
      (updatedSuggestions.work_experience || []).length === 0 &&
      (updatedSuggestions.education || []).length === 0 &&
      !updatedSuggestions.why_good_fit?.fit_analysis;

    if (hasNoSuggestions) {
      // Delete the entire enhancement if EVERYTHING is dismissed
      await get().deleteCurrentEnhancement();
    } else if (enhancementId) {
      // Update the backend with partial dismissal - save the updated suggestions
      try {
        // Update the enhancement_data in the backend with the new state
        await aiService.updateAIEnhancement(enhancementId, updatedSuggestions);
      } catch (error) {
        console.error(
          "❌ [dismissWhyGoodFitSuggestion] Failed to update backend:",
          error,
        );
      }
    }
  },

  // Dismiss a single work experience suggestion
  dismissWorkExperienceSuggestion: async (itemId: string) => {
    const currentSuggestions = get().allSuggestions;
    const enhancementId = get().currentEnhancementId;

    if (!currentSuggestions) {
      return;
    }

    // Update UI immediately - remove just this item's suggestion
    const updatedSuggestions = {
      ...currentSuggestions,
      work_experience: (currentSuggestions.work_experience || []).filter(
        (s) => s.id !== itemId,
      ),
    };

    set({ allSuggestions: updatedSuggestions });

    // Check if ALL suggestions across ALL sections are now dismissed
    const hasNoSuggestions =
      updatedSuggestions.skills.technical.length === 0 &&
      updatedSuggestions.skills.soft.length === 0 &&
      !updatedSuggestions.professional_summary.suggested_text &&
      (updatedSuggestions.work_experience || []).length === 0 &&
      (updatedSuggestions.education || []).length === 0 &&
      !updatedSuggestions.why_good_fit?.fit_analysis;

    if (hasNoSuggestions) {
      // Delete the entire enhancement if EVERYTHING is dismissed
      await get().deleteCurrentEnhancement();
    } else if (enhancementId) {
      // Update the backend with partial dismissal
      try {
        await aiService.updateAIEnhancement(enhancementId, updatedSuggestions);
      } catch (error) {
        console.error(
          "❌ [dismissWorkExperienceSuggestion] Failed to update backend:",
          error,
        );
      }
    }
  },

  // Dismiss all work experience suggestions
  dismissAllWorkExperienceSuggestions: async () => {
    const currentSuggestions = get().allSuggestions;
    const enhancementId = get().currentEnhancementId;

    if (!currentSuggestions) {
      return;
    }

    // Update UI immediately - clear work experience suggestions only
    const updatedSuggestions = {
      ...currentSuggestions,
      work_experience: [],
    };

    set({ allSuggestions: updatedSuggestions });

    // Check if ALL suggestions across ALL sections are now dismissed
    const hasNoSuggestions =
      updatedSuggestions.skills.technical.length === 0 &&
      updatedSuggestions.skills.soft.length === 0 &&
      !updatedSuggestions.professional_summary.suggested_text &&
      (updatedSuggestions.work_experience || []).length === 0 &&
      (updatedSuggestions.education || []).length === 0 &&
      !updatedSuggestions.why_good_fit?.fit_analysis;

    if (hasNoSuggestions) {
      // Delete the entire enhancement if EVERYTHING is dismissed
      await get().deleteCurrentEnhancement();
    } else if (enhancementId) {
      // Update the backend with partial dismissal
      try {
        await aiService.updateAIEnhancement(enhancementId, updatedSuggestions);
      } catch (error) {
        console.error(
          "❌ [dismissAllWorkExperienceSuggestions] Failed to update backend:",
          error,
        );
      }
    }
  },

  // Dismiss a single education suggestion
  dismissEducationSuggestion: async (itemId: string) => {
    const currentSuggestions = get().allSuggestions;
    const enhancementId = get().currentEnhancementId;

    if (!currentSuggestions) {
      return;
    }

    // Update UI immediately - remove just this item's suggestion
    const updatedSuggestions = {
      ...currentSuggestions,
      education: (currentSuggestions.education || []).filter(
        (s) => s.id !== itemId,
      ),
    };

    set({ allSuggestions: updatedSuggestions });

    // Check if ALL suggestions across ALL sections are now dismissed
    const hasNoSuggestions =
      updatedSuggestions.skills.technical.length === 0 &&
      updatedSuggestions.skills.soft.length === 0 &&
      !updatedSuggestions.professional_summary.suggested_text &&
      (updatedSuggestions.work_experience || []).length === 0 &&
      (updatedSuggestions.education || []).length === 0 &&
      !updatedSuggestions.why_good_fit?.fit_analysis;

    if (hasNoSuggestions) {
      // Delete the entire enhancement if EVERYTHING is dismissed
      await get().deleteCurrentEnhancement();
    } else if (enhancementId) {
      // Update the backend with partial dismissal
      try {
        await aiService.updateAIEnhancement(enhancementId, updatedSuggestions);
      } catch (error) {
        console.error(
          "❌ [dismissEducationSuggestion] Failed to update backend:",
          error,
        );
      }
    }
  },

  // Dismiss all education suggestions
  dismissAllEducationSuggestions: async () => {
    const currentSuggestions = get().allSuggestions;
    const enhancementId = get().currentEnhancementId;

    if (!currentSuggestions) {
      return;
    }

    // Update UI immediately - clear education suggestions only
    const updatedSuggestions = {
      ...currentSuggestions,
      education: [],
    };

    set({ allSuggestions: updatedSuggestions });

    // Check if ALL suggestions across ALL sections are now dismissed
    const hasNoSuggestions =
      updatedSuggestions.skills.technical.length === 0 &&
      updatedSuggestions.skills.soft.length === 0 &&
      !updatedSuggestions.professional_summary.suggested_text &&
      (updatedSuggestions.work_experience || []).length === 0 &&
      (updatedSuggestions.education || []).length === 0 &&
      !updatedSuggestions.why_good_fit?.fit_analysis;

    if (hasNoSuggestions) {
      // Delete the entire enhancement if EVERYTHING is dismissed
      await get().deleteCurrentEnhancement();
    } else if (enhancementId) {
      // Update the backend with partial dismissal
      try {
        await aiService.updateAIEnhancement(enhancementId, updatedSuggestions);
      } catch (error) {
        console.error(
          "❌ [dismissAllEducationSuggestions] Failed to update backend:",
          error,
        );
      }
    }
  },

  // Dismiss all suggestions across all sections
  dismissAllSuggestions: async () => {
    const currentSuggestions = get().allSuggestions;
    const cvId = get().currentCvId;

    if (!currentSuggestions) {
      return;
    }

    if (!cvId) {
      Logger.warn("[dismissAllSuggestions] No cvId found, clearing state only");
      // Clear state even if no cvId
      set({
        allSuggestions: null,
        suggestionsLoading: false,
        suggestionsError: null,
        currentEnhancementId: null,
      });
      return;
    }

    // Delete ALL enhancements for this CV from backend FIRST before clearing state
    try {
      await aiService.deleteAllAIEnhancementsForCV(cvId);
    } catch (error: any) {
      Logger.error("[dismissAllSuggestions] Failed to delete from backend", {
        cvId,
        error: error?.message || String(error),
        errorCode: error?.code,
        errorStatus: error?.response?.status,
      });
      // Re-throw to allow error handling in UI
      throw error;
    }

    // Only clear state AFTER successful deletion
    set({
      allSuggestions: null,
      currentEnhancementId: null,
      suggestionsLoading: false,
      suggestionsError: null,
      // NOTE: We keep currentCvId so the CV context is preserved
    });
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
        suggestionsError: null,
      });
    } catch (error: any) {
      Logger.error("Failed to delete AI enhancement", {
        enhancementId,
        error: error?.message || String(error),
      });
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
      suggestionsError: null,
    });
  },

  // Clear suggestions error (called when user dismisses error)
  clearSuggestionsError: () => {
    set({ suggestionsError: null });
  },
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
