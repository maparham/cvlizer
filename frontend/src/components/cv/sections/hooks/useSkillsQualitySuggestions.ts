/**
 * Hook for CV quality skill suggestions (spelling/grammar) in Skills section.
 * Centralizes apply-one, apply-all, and dismiss-all logic for both edit and display modes.
 * Handlers accept sectionData and updateAndSave so the hook can be called once at top level
 * while renderForm/renderDisplay supply context-specific data and save logic.
 */

import { useCallback } from "react";
import {
  applyOneQualitySuggestion,
  applyQualitySuggestionsToList,
  type QualitySkillSuggestion,
} from "../utils/qualitySkillHelpers";
import { normalizeSkillsTechnical } from "../../../../utils/normalizeSkillsTechnical";

/** Section data shape for skills (categorized technical only). */
export interface SkillsSectionDataForQuality {
  technical?: Record<string, string[]>;
}

export type UpdateAndSaveSkills = (
  updatedData: SkillsSectionDataForQuality,
  message?: string
) => Promise<void>;

export interface UseSkillsQualitySuggestionsParams {
  /** Quality skills grouped by category from CV quality analysis. */
  qualitySkills: Record<string, QualitySkillSuggestion[]> | null;
  /** Dismiss a single skill suggestion. */
  dismissOne: (skill: string, type: string) => Promise<void>;
  /** Dismiss multiple suggestions in one call (for Apply All). */
  dismissBatch: (suggestions: Array<{ skill: string; type: string }>) => Promise<void>;
  showSuccess: (message: string) => void;
}

export interface UseSkillsQualitySuggestionsResult {
  /** Apply one suggestion. Pass sectionData and updateAndSave from renderForm or renderDisplay. */
  handleAddQualitySkill: (
    suggestion: QualitySkillSuggestion,
    category: string,
    sectionData: SkillsSectionDataForQuality,
    updateAndSave: UpdateAndSaveSkills
  ) => Promise<void>;
  /** Apply all suggestions. Pass sectionData and updateAndSave from current context. */
  handleApplyAllQualitySuggestions: (
    sectionData: SkillsSectionDataForQuality,
    updateAndSave: UpdateAndSaveSkills
  ) => Promise<void>;
  handleRejectAllQualitySuggestions: () => Promise<void>;
}

/**
 * Returns handlers for applying/dismissing CV quality skill suggestions.
 * Call once at top level; pass sectionData and updateAndSave when invoking handlers in renderForm/renderDisplay.
 */
export function useSkillsQualitySuggestions(
  params: UseSkillsQualitySuggestionsParams
): UseSkillsQualitySuggestionsResult {
  const { qualitySkills, dismissOne, dismissBatch, showSuccess } = params;

  const handleAddQualitySkill = useCallback(
    async (
      suggestion: QualitySkillSuggestion,
      category: string,
      sectionData: SkillsSectionDataForQuality,
      updateAndSave: UpdateAndSaveSkills
    ) => {
      const { skill } = suggestion;
      const normalizedCategory = category.trim();
      if (!normalizedCategory) return;
      const technical = normalizeSkillsTechnical(sectionData.technical);
      const existingList = technical[normalizedCategory] || [];
      const newList = applyOneQualitySuggestion(existingList, suggestion);
      if (newList === null) {
        await dismissOne(skill, normalizedCategory);
        showSuccess(`Skill correction "${skill}" dismissed (already present).`);
        return;
      }
      const updatedData = {
        ...sectionData,
        technical: {
          ...technical,
          [normalizedCategory]: newList,
        },
      };
      const isCorrection = newList.length === existingList.length;
      await updateAndSave(
        updatedData,
        `CV quality skill "${skill}" ${isCorrection ? "corrected" : "added"} in ${normalizedCategory}`
      );
      await dismissOne(skill, normalizedCategory);
    },
    [dismissOne, showSuccess]
  );

  const handleApplyAllQualitySuggestions = useCallback(
    async (
      sectionData: SkillsSectionDataForQuality,
      updateAndSave: UpdateAndSaveSkills
    ) => {
      if (!qualitySkills) return;

      const technical = { ...normalizeSkillsTechnical(sectionData.technical) };
      for (const [category, suggestions] of Object.entries(qualitySkills)) {
        if (!Array.isArray(suggestions) || suggestions.length === 0) continue;
        technical[category] = applyQualitySuggestionsToList(
          technical[category] || [],
          suggestions
        );
      }
      const updatedData = { ...sectionData, technical };

      await updateAndSave(updatedData, "All CV quality skill corrections applied");

      const toDismiss = Object.entries(qualitySkills).flatMap(
        ([category, suggestions]) =>
          (suggestions || []).map((s) => ({ skill: s.skill, type: category }))
      );
      if (toDismiss.length > 0) {
        await dismissBatch(toDismiss);
      }

      showSuccess("All CV quality skill corrections have been applied");
    },
    [qualitySkills, dismissBatch, showSuccess]
  );

  const handleRejectAllQualitySuggestions = useCallback(async () => {
    if (!qualitySkills) return;

    const toDismiss = Object.entries(qualitySkills).flatMap(
      ([category, suggestions]) =>
        (suggestions || []).map((s) => ({ skill: s.skill, type: category }))
    );
    if (toDismiss.length > 0) {
      await dismissBatch(toDismiss);
    }

    showSuccess("All CV quality skill corrections have been dismissed");
  }, [qualitySkills, dismissBatch, showSuccess]);

  return {
    handleAddQualitySkill,
    handleApplyAllQualitySuggestions,
    handleRejectAllQualitySuggestions,
  };
}
