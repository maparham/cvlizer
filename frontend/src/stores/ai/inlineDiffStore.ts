/**
 * Inline Diff Store - Inline suggestion and diff mode management
 *
 * Manages the inline diff system including generating suggestions from
 * ATS optimization results, applying suggestions to temp CV state,
 * and handling user acceptance/rejection of suggestions.
 */

import { StateCreator } from "zustand";
import type { AIStore } from "./types";
import { InlineDiffState, TempCVState, AISuggestion } from "../../types/ai";
import { aiService } from "../../services/ai";

export interface InlineDiffSliceState {
  inlineDiff: InlineDiffState;
}

export interface InlineDiffSliceActions {
  generateInlineSuggestions: (cvId: string, jobDescriptionId: string) => Promise<void>;
  applyAllSuggestions: (cvData: any, cvId: string) => void;
  acceptInlineSuggestion: (suggestionId: string) => void;
  rejectInlineSuggestion: (suggestionId: string) => void;
  toggleSuggestionPanel: (isOpen?: boolean) => void;
  setHighlightMode: (mode: "all" | "pending" | "approved") => void;
  exitDiffMode: () => void;
  commitApprovedChanges: () => any;
}

export type InlineDiffSlice = InlineDiffSliceState & InlineDiffSliceActions;

export const createInlineDiffSlice: StateCreator<
  AIStore,
  [],
  [],
  InlineDiffSlice
> = (set, get) => ({
  inlineDiff: {
    tempCV: null,
    suggestions: [],
    isApplyingAll: false,
    isPanelOpen: false,
    highlightMode: "all",
  },

  generateInlineSuggestions: async (cvId: string, jobDescriptionId: string) => {
    set((state) => ({
      inlineDiff: {
        ...state.inlineDiff,
        isApplyingAll: true,
        error: undefined,
      },
    }));

    try {
      // First, get ATS optimization suggestions
      const atsOptimization = await aiService.analyzeATSOptimization(cvId, {
        job_description_id: jobDescriptionId,
      });

      // Transform ATS suggestions into inline diff format
      const suggestions: AISuggestion[] = [];
      const processedKeywords = new Set<string>(); // Track processed keywords to avoid duplicates
      let suggestionIndex = 0;

      // Add missing keywords as suggestions
      atsOptimization.missing_keywords.forEach((keyword) => {
        // Skip if we've already processed this keyword
        if (processedKeywords.has(keyword.keyword.toLowerCase())) {
          return;
        }

        // Parse suggested_placement to determine section and field
        let section = "skills";
        let fieldPath = "technical";

        if (keyword.suggested_placement) {
          const placement = keyword.suggested_placement.toLowerCase();
          if (
            placement.includes("skills") ||
            placement.includes("technical")
          ) {
            section = "skills";
            fieldPath = "technical";
          } else if (
            placement.includes("soft") ||
            placement.includes("interpersonal")
          ) {
            section = "skills";
            fieldPath = "soft";
          } else if (
            placement.includes("professional") ||
            placement.includes("summary")
          ) {
            section = "professional_summary";
            fieldPath = "content";
          } else if (
            placement.includes("work") ||
            placement.includes("experience")
          ) {
            section = "work_experience";
            fieldPath = "";
          }
        }

        // Generate more specific description based on section and field
        let description = "";
        if (section === "skills") {
          if (fieldPath === "technical") {
            description = `Add "${keyword.keyword}" to technical skills`;
          } else if (fieldPath === "soft") {
            description = `Add "${keyword.keyword}" to soft skills`;
          } else {
            description = `Add "${keyword.keyword}" to skills section`;
          }
        } else if (section === "work_experience") {
          description = `Integrate "${keyword.keyword}" into work experience descriptions`;
        } else if (section === "professional_summary") {
          description = `Add "${keyword.keyword}" to professional summary`;
        } else {
          description = `Add "${keyword.keyword}" to ${section}`;
        }

        const suggestion: AISuggestion = {
          id: `keyword-${suggestionIndex++}`,
          section,
          type: "add_keyword",
          description,
          originalValue: "",
          suggestedValue: keyword.keyword,
          status: "pending",
          changeType: "addition",
          fieldPath,
        };

        suggestions.push(suggestion);
        processedKeywords.add(keyword.keyword.toLowerCase());
      });

      // Add content optimization suggestions
      // Handle both old and new response formats
      const contentOptimizations = atsOptimization.content_optimization || [];
      contentOptimizations.forEach((optimization) => {
        suggestions.push({
          id: `content-${suggestionIndex++}`,
          section: optimization.section,
          type: "enhance_content",
          description: optimization.suggestion,
          originalValue: "", // Will be filled when applied
          suggestedValue: optimization.suggestion,
          status: "pending",
          changeType: "modification",
          fieldPath:
            optimization.section === "professional_summary"
              ? "content"
              : undefined,
        });
      });

      // Also create suggestions from the general suggestions array
      if (
        atsOptimization.suggestions &&
        atsOptimization.suggestions.length > 0
      ) {
        atsOptimization.suggestions.forEach((suggestionText) => {
          // For general suggestions, only create section-specific suggestions when they would be meaningful
          const lowerText = suggestionText.toLowerCase();

          // Extract keyword from suggestion for meaningful content creation
          const keywordMatch = suggestionText.match(/['"]([^'"]+)['"]/);
          const keyword = keywordMatch ? keywordMatch[1] : null;

          // Skip if we've already processed this keyword from missing_keywords
          if (keyword && processedKeywords.has(keyword.toLowerCase())) {
            return;
          }

          // Skills section: Only if the suggestion is about enhancing skills content specifically
          if (
            lowerText.includes("skills") &&
            (lowerText.includes("enhance") ||
              lowerText.includes("improve") ||
              lowerText.includes("add"))
          ) {
            const meaningfulContent = keyword
              ? `Enhanced technical skills including ${keyword.toLowerCase()} and related competencies.`
              : "Enhanced technical skills and competencies.";

            suggestions.push({
              id: `skills-general-${suggestionIndex++}`,
              section: "skills",
              type: "enhance_content",
              description: suggestionText,
              originalValue: "",
              suggestedValue: meaningfulContent,
              status: "pending",
              changeType: "modification",
              fieldPath: "technical",
            });
          }

          // Work Experience: Only if the suggestion is about enhancing work experience content specifically
          if (
            (lowerText.includes("work experience") ||
              lowerText.includes("employment")) &&
            (lowerText.includes("enhance") ||
              lowerText.includes("improve") ||
              lowerText.includes("descriptions"))
          ) {
            const meaningfulContent = keyword
              ? `Enhanced work experience descriptions highlighting ${keyword.toLowerCase()} expertise and achievements.`
              : "Enhanced work experience descriptions with improved detail and impact.";

            suggestions.push({
              id: `work-general-${suggestionIndex++}`,
              section: "work_experience",
              type: "enhance_content",
              description: suggestionText,
              originalValue: "",
              suggestedValue: meaningfulContent,
              status: "pending",
              changeType: "modification",
              fieldPath: undefined,
            });
          }

          // Professional Summary: Only if the suggestion is about enhancing professional summary content
          if (
            (lowerText.includes("professional") ||
              lowerText.includes("summary") ||
              lowerText.includes("profile") ||
              lowerText.includes("overview")) &&
            (lowerText.includes("enhance") ||
              lowerText.includes("improve") ||
              lowerText.includes("content"))
          ) {
            const meaningfulContent = keyword
              ? `Experienced professional with strong ${keyword.toLowerCase()} skills and diverse problem-solving capabilities.`
              : "Enhanced professional summary highlighting key strengths and expertise.";

            suggestions.push({
              id: `professional-general-${suggestionIndex++}`,
              section: "professional_summary",
              type: "enhance_content",
              description: suggestionText,
              originalValue: "",
              suggestedValue: meaningfulContent,
              status: "pending",
              changeType: "modification",
              fieldPath: "content",
            });
          }
        });
      }

      set((state) => ({
        inlineDiff: {
          ...state.inlineDiff,
          suggestions,
          isApplyingAll: false,
          isPanelOpen: true,
        },
      }));
    } catch (error) {
      set((state) => ({
        inlineDiff: {
          ...state.inlineDiff,
          isApplyingAll: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to generate suggestions",
        },
      }));
    }
  },

  applyAllSuggestions: (cvData: any, cvId: string) => {
    const { suggestions } = get().inlineDiff;

    // Create a deep copy of the original CV data
    const tempData = JSON.parse(JSON.stringify(cvData));

    // Apply all suggestions to create temp state
    // NOTE: We don't actually apply suggestions to temp data here
    // Instead, we let the UI components handle displaying suggestions
    // and only apply them when the user explicitly accepts them
    suggestions.forEach((suggestion) => {
      if (suggestion.type === "add_keyword") {
        // For keyword suggestions, we don't add them to temp data
        // They will be shown as pending suggestions in the UI
        // and only added when user accepts them
        if (suggestion.section === "skills" && suggestion.fieldPath) {
          // Ensure the skills structure exists but don't add the keyword yet
          if (!tempData.skills) {
            tempData.skills = { technical: [], soft: [] };
          }
          if (!tempData.skills[suggestion.fieldPath]) {
            tempData.skills[suggestion.fieldPath] = [];
          }
        }
      } else if (suggestion.type === "enhance_content") {
        // Handle content enhancement suggestions
        if (
          suggestion.section === "professional_summary" &&
          suggestion.fieldPath === "content"
        ) {
          // For professional summary, we don't modify content yet
          // The UI will show the suggestion and let user accept/reject
          if (!tempData.professional_summary) {
            tempData.professional_summary = { content: "", keywords: [] };
          }
        }
      }
    });

    const tempCV: TempCVState = {
      originalCV: cvData,
      appliedSuggestions: suggestions,
      tempData,
      isDiffMode: true,
    };

    set((state) => ({
      inlineDiff: {
        ...state.inlineDiff,
        tempCV,
        isPanelOpen: true,
        cvId, // Store cvId for cache clearing when exiting
      },
    }));
  },

  acceptInlineSuggestion: (suggestionId: string) => {
    set((state) => {
      const updatedSuggestions = state.inlineDiff.suggestions.map(
        (suggestion) =>
          suggestion.id === suggestionId
            ? { ...suggestion, status: "approved" as const }
            : suggestion,
      );

      // Update temp CV with accepted changes
      const updatedTempData = state.inlineDiff.tempCV?.tempData;
      const acceptedSuggestion = updatedSuggestions.find(
        (s) => s.id === suggestionId,
      );

      if (acceptedSuggestion && updatedTempData) {
        // Apply the accepted suggestion to temp data
        if (
          acceptedSuggestion.type === "add_keyword" &&
          acceptedSuggestion.section === "skills"
        ) {
          // Ensure skills object exists before accessing it
          if (!updatedTempData.skills) {
            updatedTempData.skills = { technical: [], soft: [] };
          }
          // Ensure field path array exists
          if (
            acceptedSuggestion.fieldPath &&
            !updatedTempData.skills[acceptedSuggestion.fieldPath]
          ) {
            updatedTempData.skills[acceptedSuggestion.fieldPath] = [];
          }
          // Add the skill if not already present
          if (
            acceptedSuggestion.fieldPath &&
            !updatedTempData.skills[acceptedSuggestion.fieldPath].includes(
              acceptedSuggestion.suggestedValue,
            )
          ) {
            updatedTempData.skills[acceptedSuggestion.fieldPath].push(
              acceptedSuggestion.suggestedValue,
            );
          }
        } else if (
          acceptedSuggestion.type === "enhance_content" &&
          acceptedSuggestion.section === "professional_summary"
        ) {
          // Apply content enhancement to professional summary
          if (acceptedSuggestion.fieldPath === "content") {
            if (!updatedTempData.professional_summary) {
              updatedTempData.professional_summary = {
                content: "",
                keywords: [],
              };
            }
            updatedTempData.professional_summary.content =
              acceptedSuggestion.suggestedValue;
          }
        }
      }

      return {
        inlineDiff: {
          ...state.inlineDiff,
          suggestions: updatedSuggestions,
          tempCV: state.inlineDiff.tempCV
            ? {
                ...state.inlineDiff.tempCV,
                tempData: updatedTempData,
                appliedSuggestions: updatedSuggestions,
              }
            : null,
        },
      };
    });
  },

  rejectInlineSuggestion: (suggestionId: string) => {
    set((state) => {
      const updatedSuggestions = state.inlineDiff.suggestions.map(
        (suggestion) =>
          suggestion.id === suggestionId
            ? { ...suggestion, status: "rejected" as const }
            : suggestion,
      );

      return {
        inlineDiff: {
          ...state.inlineDiff,
          suggestions: updatedSuggestions,
          tempCV: state.inlineDiff.tempCV
            ? {
                ...state.inlineDiff.tempCV,
                appliedSuggestions: updatedSuggestions,
              }
            : null,
        },
      };
    });
  },

  toggleSuggestionPanel: (isOpen?: boolean) => {
    set((state) => ({
      inlineDiff: {
        ...state.inlineDiff,
        isPanelOpen:
          isOpen !== undefined ? isOpen : !state.inlineDiff.isPanelOpen,
      },
    }));
  },

  setHighlightMode: (mode: "all" | "pending" | "approved") => {
    set((state) => ({
      inlineDiff: {
        ...state.inlineDiff,
        highlightMode: mode,
      },
    }));
  },

  exitDiffMode: () => {
    // Clear ATS optimization cache when exiting diff mode
    // This prevents suggestions from reappearing after rejection
    const cvId = get().inlineDiff.cvId;
    if (cvId) {
      aiService.clearCacheForCV(cvId);
    }

    set(() => ({
      inlineDiff: {
        tempCV: null,
        suggestions: [],
        isApplyingAll: false,
        isPanelOpen: false,
        highlightMode: "all",
      },
    }));
  },

  commitApprovedChanges: () => {
    const { tempCV, suggestions } = get().inlineDiff;
    if (!tempCV) return;

    // Get only approved suggestions
    const approvedSuggestions = suggestions.filter(
      (s) => s.status === "approved",
    );

    // Apply approved changes to original CV
    const finalData = JSON.parse(JSON.stringify(tempCV.originalCV));

    approvedSuggestions.forEach((suggestion) => {
      if (
        suggestion.type === "add_keyword" &&
        suggestion.section === "skills"
      ) {
        if (suggestion.fieldPath) {
          if (!finalData.skills[suggestion.fieldPath]) {
            finalData.skills[suggestion.fieldPath] = [];
          }
          if (
            !finalData.skills[suggestion.fieldPath].includes(
              suggestion.suggestedValue,
            )
          ) {
            finalData.skills[suggestion.fieldPath].push(
              suggestion.suggestedValue,
            );
          }
        }
      } else if (
        suggestion.type === "enhance_content" &&
        suggestion.section === "professional_summary"
      ) {
        // Apply content enhancement to professional summary
        if (suggestion.fieldPath === "content") {
          if (!finalData.professional_summary) {
            finalData.professional_summary = { content: "", keywords: [] };
          }
          finalData.professional_summary.content = suggestion.suggestedValue;
        }
      }
    });

    // Clear diff mode
    get().exitDiffMode();

    return finalData;
  },
});
