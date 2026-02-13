import React, { useState, useCallback } from "react";
import { Box, Typography, Chip } from "@mui/material";
import { SectionProps } from "../../../types";
import SimpleFormSection from "../core/SimpleFormSection";
import SkillsAutocomplete from "../ui/SkillsAutocomplete";
import {
  useAISuggestionsStore,
  useValidatedSuggestions,
} from "../../../stores/aiSuggestionsStore";
import { useNotifications } from "../../../packages/notifications";
import {
  useValidatedQualityAnalysis,
  useCVQualityStore,
} from "../../../stores/cvQualityStore";
import { JobBasedSkillsSuggestionsBox } from "./JobBasedSkillsSuggestionsBox";
import { SkillsQualitySuggestions } from "./SkillsQualitySuggestions";
import {
  useSkillsQualitySuggestions,
  type UseSkillsQualitySuggestionsResult,
  type UpdateAndSaveSkills,
} from "./hooks/useSkillsQualitySuggestions";
import type { SkillsSuggestions } from "../../../types/ai";

/** Section data shape for skills (technical + soft arrays). */
export interface SkillsSectionData {
  technical?: string[];
  soft?: string[];
}

/** Wrapper that wires CV quality skill suggestions to context-specific sectionData and updateAndSave. */
const SkillsQualityBlock: React.FC<{
  suggestions: SkillsSuggestions;
  sectionData: SkillsSectionData;
  updateAndSave: UpdateAndSaveSkills;
  onDismissOne: (skill: string, type: "technical" | "soft") => Promise<void>;
  qualityHandlers: UseSkillsQualitySuggestionsResult;
}> = ({
  suggestions,
  sectionData,
  updateAndSave,
  onDismissOne,
  qualityHandlers,
}) => (
  <SkillsQualitySuggestions
    suggestions={suggestions}
    onApplyOne={(suggestion, type) =>
      qualityHandlers.handleAddQualitySkill(
        suggestion,
        type,
        sectionData,
        updateAndSave,
      )
    }
    onDismissOne={onDismissOne}
    onApplyAll={() =>
      qualityHandlers.handleApplyAllQualitySuggestions(
        sectionData,
        updateAndSave,
      )
    }
    onDismissAll={qualityHandlers.handleRejectAllQualitySuggestions}
  />
);

interface SkillsSectionProps extends SectionProps {
  cvId?: string;
}

const SkillsSection: React.FC<SkillsSectionProps> = ({
  data,
  onUpdate,
  onSave,
  isEditing,
  onEdit,
  onClose,
  cvId,
  title = "Skills",
  onTitleSave,
}) => {
  const [newTechnicalSkill, setNewTechnicalSkill] = useState("");
  const [newSoftSkill, setNewSoftSkill] = useState("");

  // Get unified AI suggestions store with CV validation
  const {
    dismissSkillSuggestion: dismissJobSkillSuggestion,
    dismissAllSkillSuggestions: dismissAllJobSkillSuggestions,
  } = useAISuggestionsStore();

  // Get CV-quality analysis (independent of job descriptions)
  const qualityAnalysis = useValidatedQualityAnalysis(cvId || "");
  const {
    dismissSkillSuggestion: dismissQualitySkillSuggestion,
    dismissSkillSuggestionsBatch: dismissQualitySkillSuggestionsBatch,
  } = useCVQualityStore();

  // Use CV-validated selector to prevent cross-CV contamination
  const allSuggestions = useValidatedSuggestions(cvId || "");

  // Get notifications for user feedback
  const { showSuccess } = useNotifications();

  // Extract skills suggestions from unified store
  const skillsSuggestions = allSuggestions?.skills || null;
  const hasSuggestions =
    skillsSuggestions &&
    (skillsSuggestions.technical.length > 0 ||
      skillsSuggestions.soft.length > 0);

  // Extract skills suggestions from CV-quality analysis
  const qualitySkills = qualityAnalysis?.skills;
  const qualityHasSuggestions =
    !!qualitySkills &&
    (qualitySkills.technical.length > 0 || qualitySkills.soft.length > 0);

  // CV-quality skill handlers (shared between edit and display; pass sectionData + updateAndSave at call site)
  const qualityHandlers = useSkillsQualitySuggestions({
    qualitySkills: qualitySkills ?? null,
    dismissOne: dismissQualitySkillSuggestion,
    dismissBatch: dismissQualitySkillSuggestionsBatch,
    showSuccess,
  });

  // Helper: persist skills to CV (await so backend receives update before we dismiss suggestions).
  const saveDataImmediately = useCallback(
    async (updatedData: SkillsSectionData, message?: string) => {
      onUpdate(updatedData);
      if (onSave) {
        await onSave(updatedData, message);
      }
    },
    [onUpdate, onSave],
  );

  const renderForm = (
    editData: any,
    updateData: (field: string, value: any) => void,
  ) => {
    const addTechnicalSkill = () => {
      if (newTechnicalSkill.trim()) {
        const updatedData = {
          ...editData,
          technical: [...(editData.technical || []), newTechnicalSkill.trim()],
        };
        updateData("technical", updatedData.technical);
        saveDataImmediately(updatedData, "Technical skill added");
        setNewTechnicalSkill("");
      }
    };

    const addSoftSkill = () => {
      if (newSoftSkill.trim()) {
        const updatedData = {
          ...editData,
          soft: [...(editData.soft || []), newSoftSkill.trim()],
        };
        updateData("soft", updatedData.soft);
        saveDataImmediately(updatedData, "Soft skill added");
        setNewSoftSkill("");
      }
    };

    const addTechnicalSkillDirect = (skill: string) => {
      const updatedData = {
        ...editData,
        technical: [...(editData.technical || []), skill],
      };
      updateData("technical", updatedData.technical);
      saveDataImmediately(updatedData, "Technical skill added");
    };

    const addSoftSkillDirect = (skill: string) => {
      const updatedData = {
        ...editData,
        soft: [...(editData.soft || []), skill],
      };
      updateData("soft", updatedData.soft);
      saveDataImmediately(updatedData, "Soft skill added");
    };

    const removeTechnicalSkill = (index: number) => {
      const updatedData = {
        ...editData,
        technical: (editData.technical || []).filter(
          (_: any, i: number) => i !== index,
        ),
      };
      updateData("technical", updatedData.technical);
      saveDataImmediately(updatedData, "Technical skill removed");
    };

    const removeSoftSkill = (index: number) => {
      const updatedData = {
        ...editData,
        soft: (editData.soft || []).filter((_: any, i: number) => i !== index),
      };
      updateData("soft", updatedData.soft);
      saveDataImmediately(updatedData, "Soft skill removed");
    };

    // AI Suggestions handlers
    const handleAddSuggestedSkill = async (
      skill: string,
      type: "technical" | "soft",
    ) => {
      const updatedData = {
        ...editData,
        [type]: [...(editData[type] || []), skill],
      };
      updateData(type, updatedData[type]);
      saveDataImmediately(updatedData, `AI suggested skill "${skill}" added`);
      await dismissJobSkillSuggestion(skill, type);
    };

    const handleApplyAllSuggestions = async () => {
      if (!skillsSuggestions) {
        return;
      }

      const updatedData = { ...editData };

      // Add all technical skills
      if (skillsSuggestions.technical.length > 0) {
        updatedData.technical = [
          ...(updatedData.technical || []),
          ...skillsSuggestions.technical.map((s) => s.skill),
        ];
      }

      // Add all soft skills
      if (skillsSuggestions.soft.length > 0) {
        updatedData.soft = [
          ...(updatedData.soft || []),
          ...skillsSuggestions.soft.map((s) => s.skill),
        ];
      }

      // Update both technical and soft skills
      updateData("technical", updatedData.technical);
      updateData("soft", updatedData.soft);
      saveDataImmediately(updatedData, "All AI suggested skills applied");

      // Dismiss all suggestions - this will DELETE the enhancement from backend since all are applied
      await dismissAllJobSkillSuggestions();

      showSuccess("All AI suggested skills have been applied");
    };

    const handleRejectAllSuggestions = async () => {
      await dismissAllJobSkillSuggestions();
      showSuccess("All AI suggestions have been rejected");
    };

    const hasSuggestions =
      skillsSuggestions &&
      (skillsSuggestions.technical.length > 0 ||
        skillsSuggestions.soft.length > 0);

    const updateAndSaveEdit = async (
      updatedData: SkillsSectionData,
      message?: string,
    ) => {
      updateData("technical", updatedData.technical);
      updateData("soft", updatedData.soft);
      await saveDataImmediately(updatedData, message);
    };

    return (
      <Box>
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: "bold" }}>
            Technical Skills
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 2 }}>
            {(editData.technical || []).map((skill: string, index: number) => (
              <Chip
                key={index}
                label={skill}
                onDelete={() => removeTechnicalSkill(index)}
                sx={{
                  bgcolor: "#e3f2fd",
                  color: "#1976d2",
                }}
              />
            ))}
          </Box>
          <SkillsAutocomplete
            value={newTechnicalSkill}
            onChange={setNewTechnicalSkill}
            onAdd={addTechnicalSkill}
            onAddDirect={addTechnicalSkillDirect}
            placeholder="Add technical skill"
            skillType="technical"
            existingSkills={editData.technical || []}
          />
        </Box>

        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: "bold" }}>
            Soft Skills
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 2 }}>
            {(editData.soft || []).map((skill: string, index: number) => (
              <Chip
                key={index}
                label={skill}
                onDelete={() => removeSoftSkill(index)}
                sx={{
                  bgcolor: "#f3e5f5",
                  color: "#7b1fa2",
                }}
              />
            ))}
          </Box>
          <SkillsAutocomplete
            value={newSoftSkill}
            onChange={setNewSoftSkill}
            onAdd={addSoftSkill}
            onAddDirect={addSoftSkillDirect}
            placeholder="Add soft skill"
            skillType="soft"
            existingSkills={editData.soft || []}
          />
        </Box>

        {/* CV Quality Skill Corrections - shared component for edit and display */}
        {qualityHasSuggestions && qualitySkills && (
          <SkillsQualityBlock
            suggestions={qualitySkills}
            sectionData={editData}
            updateAndSave={updateAndSaveEdit}
            onDismissOne={dismissQualitySkillSuggestion}
            qualityHandlers={qualityHandlers}
          />
        )}

        {/* AI Suggestions Section (Job-based) - Only show if suggestions exist */}
        {hasSuggestions && (
          <JobBasedSkillsSuggestionsBox
            suggestions={skillsSuggestions}
            onApplyOne={(suggestion, type) =>
              handleAddSuggestedSkill(suggestion.skill, type)
            }
            onApplyAll={handleApplyAllSuggestions}
            onRejectAll={handleRejectAllSuggestions}
            variant="edit"
          />
        )}
      </Box>
    );
  };

  const renderDisplay = (data: SkillsSectionData) => {
    // Handler functions for display mode
    const handleApplyAllSuggestionsDisplay = async () => {
      if (!skillsSuggestions) {
        return;
      }

      const updatedData = { ...data };

      // Add all technical skills
      if (skillsSuggestions.technical.length > 0) {
        updatedData.technical = [
          ...(updatedData.technical || []),
          ...skillsSuggestions.technical.map((s) => s.skill),
        ];
      }

      // Add all soft skills
      if (skillsSuggestions.soft.length > 0) {
        updatedData.soft = [
          ...(updatedData.soft || []),
          ...skillsSuggestions.soft.map((s) => s.skill),
        ];
      }

      // Update the data
      onUpdate(updatedData);
      onSave?.(updatedData, "All AI suggested skills applied");

      // Dismiss all suggestions - this will DELETE the enhancement from backend since all are applied
      await dismissAllJobSkillSuggestions();

      showSuccess("All AI suggested skills have been applied");
    };

    const handleRejectAllSuggestionsDisplay = async () => {
      await dismissAllJobSkillSuggestions();
      showSuccess("All AI suggestions have been rejected");
    };

    const handleApplyOneDisplay = async (
      suggestion: { skill: string },
      type: "technical" | "soft",
    ) => {
      const updatedData = {
        ...data,
        [type]: [...(data[type] || []), suggestion.skill],
      };
      onUpdate(updatedData);
      onSave?.(updatedData);
      await dismissJobSkillSuggestion(suggestion.skill, type);
      showSuccess(
        `Added "${suggestion.skill}" to ${type === "technical" ? "technical" : "soft"} skills`,
      );
    };

    return (
      <Box>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
          {data.technical?.map((skill: string, index: number) => (
            <Chip
              key={index}
              label={skill}
              sx={{
                bgcolor: "#e3f2fd",
                color: "#1976d2",
              }}
            />
          ))}
          {data.soft?.map((skill: string, index: number) => (
            <Chip
              key={`soft-${index}`}
              label={skill}
              sx={{
                bgcolor: "#f3e5f5",
                color: "#7b1fa2",
              }}
            />
          ))}
        </Box>

        {/* CV Quality Skill Corrections - shared component (display mode) */}
        {qualityHasSuggestions && qualitySkills && (
          <SkillsQualityBlock
            suggestions={qualitySkills}
            sectionData={data}
            updateAndSave={saveDataImmediately}
            onDismissOne={dismissQualitySkillSuggestion}
            qualityHandlers={qualityHandlers}
          />
        )}

        {/* AI Skills Suggestions (Job-based) - Show in display mode too */}
        {hasSuggestions && (
          <JobBasedSkillsSuggestionsBox
            suggestions={skillsSuggestions}
            onApplyOne={handleApplyOneDisplay}
            onApplyAll={handleApplyAllSuggestionsDisplay}
            onRejectAll={handleRejectAllSuggestionsDisplay}
            variant="display"
          />
        )}
      </Box>
    );
  };

  return (
    <SimpleFormSection
      data={data}
      onUpdate={onUpdate}
      onSave={onSave}
      isEditing={isEditing}
      onEdit={onEdit}
      onClose={onClose}
      onUnsavedChanges={undefined} // Skills auto-save immediately, no unsaved changes tracking needed
      title={title}
      sectionId="skills"
      requiredFields={[]} // Skills are optional
      renderForm={renderForm}
      renderDisplay={renderDisplay}
      autoSaveMessage="Skills auto-saved"
      autoSaveMode={true} // Hide save/cancel buttons for Skills section
      onTitleSave={onTitleSave}
    />
  );
};

// Memoize component to prevent unnecessary re-renders
export default React.memo(SkillsSection, (prevProps, nextProps) => {
  // Re-render only if critical props change
  return (
    prevProps.data === nextProps.data &&
    prevProps.isEditing === nextProps.isEditing &&
    prevProps.cvId === nextProps.cvId
  );
});
