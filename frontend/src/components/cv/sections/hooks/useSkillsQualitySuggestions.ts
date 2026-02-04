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

/** Section data shape for skills (technical + soft arrays). */
export interface SkillsSectionDataForQuality {
  technical?: string[];
  soft?: string[];
}

export type UpdateAndSaveSkills = (
  updatedData: SkillsSectionDataForQuality,
  message?: string
) => Promise<void>;

export interface UseSkillsQualitySuggestionsParams {
  /** Quality skills from CV quality analysis (technical + soft). */
  qualitySkills: { technical: QualitySkillSuggestion[]; soft: QualitySkillSuggestion[] } | null;
  /** Dismiss a single skill suggestion. */
  dismissOne: (skill: string, type: "technical" | "soft") => Promise<void>;
  /** Dismiss multiple suggestions in one call (for Apply All). */
  dismissBatch: (suggestions: Array<{ skill: string; type: "technical" | "soft" }>) => Promise<void>;
  showSuccess: (message: string) => void;
}

export interface UseSkillsQualitySuggestionsResult {
  /** Apply one suggestion. Pass sectionData and updateAndSave from renderForm or renderDisplay. */
  handleAddQualitySkill: (
    suggestion: QualitySkillSuggestion,
    type: "technical" | "soft",
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
      type: "technical" | "soft",
      sectionData: SkillsSectionDataForQuality,
      updateAndSave: UpdateAndSaveSkills
    ) => {
      const { skill } = suggestion;
      const existingList = (sectionData[type] || []) as string[];
      const newList = applyOneQualitySuggestion(existingList, suggestion);
      if (newList === null) {
        await dismissOne(skill, type);
        showSuccess(`Skill correction "${skill}" dismissed (already present).`);
        return;
      }
      const updatedData = { ...sectionData, [type]: newList };
      const isCorrection = newList.length === existingList.length;
      await updateAndSave(
        updatedData,
        `CV quality skill "${skill}" ${isCorrection ? "corrected" : "added"} in ${type} skills`
      );
      await dismissOne(skill, type);
    },
    [dismissOne, showSuccess]
  );

  const handleApplyAllQualitySuggestions = useCallback(
    async (
      sectionData: SkillsSectionDataForQuality,
      updateAndSave: UpdateAndSaveSkills
    ) => {
      if (!qualitySkills) return;

      const updatedData = { ...sectionData };
      if (qualitySkills.technical.length > 0) {
        updatedData.technical = applyQualitySuggestionsToList(
          (updatedData.technical || []) as string[],
          qualitySkills.technical
        );
      }
      if (qualitySkills.soft.length > 0) {
        updatedData.soft = applyQualitySuggestionsToList(
          (updatedData.soft || []) as string[],
          qualitySkills.soft
        );
      }

      await updateAndSave(updatedData, "All CV quality skill corrections applied");

      const toDismiss = [
        ...(qualitySkills?.technical || []).map((s) => ({ skill: s.skill, type: "technical" as const })),
        ...(qualitySkills?.soft || []).map((s) => ({ skill: s.skill, type: "soft" as const })),
      ];
      if (toDismiss.length > 0) {
        await dismissBatch(toDismiss);
      }

      showSuccess("All CV quality skill corrections have been applied");
    },
    [qualitySkills, dismissBatch, showSuccess]
  );

  const handleRejectAllQualitySuggestions = useCallback(async () => {
    if (!qualitySkills) return;

    await Promise.all([
      ...(qualitySkills.technical || []).map((s) => dismissOne(s.skill, "technical")),
      ...(qualitySkills.soft || []).map((s) => dismissOne(s.skill, "soft")),
    ]);

    showSuccess("All CV quality skill corrections have been dismissed");
  }, [qualitySkills, dismissOne, showSuccess]);

  return {
    handleAddQualitySkill,
    handleApplyAllQualitySuggestions,
    handleRejectAllQualitySuggestions,
  };
}
