import React, { useState, useCallback } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import { SectionProps } from "../../../types";
import SimpleFormSection from "../core/SimpleFormSection";
import ConfirmDialog from "../../common/ConfirmDialog";
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
import { useEditedSinceAIStore } from "../../../stores/editedSinceAIStore";
import { useOverwriteConfirm, OVERWRITE_MSG } from "../../../contexts/OverwriteConfirmContext";
import { createTrackedFieldUpdater } from "./hooks/createTrackedFieldUpdater";
import { JobBasedSkillsSuggestionsBox } from "./JobBasedSkillsSuggestionsBox";
import { SkillsQualitySuggestions } from "./SkillsQualitySuggestions";
import {
  useSkillsQualitySuggestions,
  type SkillsSectionDataForQuality,
  type UseSkillsQualitySuggestionsResult,
  type UpdateAndSaveSkills,
} from "./hooks/useSkillsQualitySuggestions";
import type { SkillsSuggestions } from "../../../types/ai";
import {
  mergeAllJobSkillSuggestions,
  mergeOneJobSkillSuggestion,
} from "../../../utils/skillsSuggestionHelpers";
import { normalizeSkillsTechnical } from "../../../utils/normalizeSkillsTechnical";

export interface SkillsSectionData {
  technical?: Record<string, string[]>;
}

const SkillsQualityBlock: React.FC<{
  suggestions: Record<string, { skill: string; reasoning: string; original?: string }[]>;
  sectionData: SkillsSectionDataForQuality;
  updateAndSave: UpdateAndSaveSkills;
  onDismissOne: (skill: string, type: string) => Promise<void>;
  qualityHandlers: UseSkillsQualitySuggestionsResult;
}> = ({
  suggestions,
  sectionData,
  updateAndSave,
  onDismissOne,
  qualityHandlers,
}) => (
  <SkillsQualitySuggestions
    suggestions={suggestions as SkillsSuggestions}
    onApplyOne={(suggestion, type) =>
      qualityHandlers.handleAddQualitySkill(suggestion, type, sectionData, updateAndSave)
    }
    onDismissOne={onDismissOne}
    onApplyAll={() =>
      qualityHandlers.handleApplyAllQualitySuggestions(sectionData, updateAndSave)
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
  onHide,
  onDelete,
  readOnly,
}) => {
  const [newSkillByCategory, setNewSkillByCategory] = useState<Record<string, string>>({});
  const [newCategoryName, setNewCategoryName] = useState("");
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [categoryEditValue, setCategoryEditValue] = useState("");
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);

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
  const { isEdited, clearEdited } = useEditedSinceAIStore();
  const { confirm: overwriteConfirm } = useOverwriteConfirm();
  const SKILLS_FIELD_KEY = "skills";

  // Extract skills suggestions from unified store
  const skillsSuggestions = allSuggestions?.skills || null;
  const hasSuggestions =
    !!skillsSuggestions &&
    Object.values(skillsSuggestions).some(
      (items) => Array.isArray(items) && items.length > 0,
    );

  // Extract skills suggestions from CV-quality analysis
  const qualitySkills = qualityAnalysis?.skills || null;
  const qualityHasSuggestions = !!qualitySkills &&
    Object.values(qualitySkills).some(
      (items) => Array.isArray(items) && items.length > 0,
    );

  const qualityHandlers = useSkillsQualitySuggestions({
    qualitySkills,
    dismissOne: dismissQualitySkillSuggestion,
    dismissBatch: (suggestions) =>
      dismissQualitySkillSuggestionsBatch(
        suggestions,
      ),
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

  const applySingleJobSkillSuggestion = useCallback(
    async (
      sectionData: SkillsSectionData,
      skill: string,
      category: string,
      persist: (updatedData: SkillsSectionData, message?: string) => Promise<void>,
      successMessage?: string,
    ) => {
      const updatedData = mergeOneJobSkillSuggestion(
        sectionData,
        skill,
        category,
      ) as SkillsSectionData;

      await persist(updatedData, `AI suggested skill "${skill}" added to ${category}`);
      await dismissJobSkillSuggestion(skill, category);

      if (successMessage) {
        showSuccess(successMessage);
      }
    },
    [dismissJobSkillSuggestion, showSuccess],
  );

  const applyAllJobSkillSuggestions = useCallback(
    async (
      sectionData: SkillsSectionData,
      persist: (updatedData: SkillsSectionData, message?: string) => Promise<void>,
      successMessage?: string,
    ) => {
      if (!skillsSuggestions) {
        return;
      }
      if (cvId && isEdited(cvId, SKILLS_FIELD_KEY)) {
        const ok = await overwriteConfirm(OVERWRITE_MSG);
        if (!ok) return;
      }

      const updatedData = mergeAllJobSkillSuggestions(
        sectionData,
        skillsSuggestions,
      ) as SkillsSectionData;

      await persist(updatedData, "All AI suggested skills applied");
      await dismissAllJobSkillSuggestions();

      if (cvId) clearEdited(cvId, SKILLS_FIELD_KEY);
      showSuccess(successMessage || "All AI suggested skills have been applied");
    },
    [
      clearEdited,
      cvId,
      dismissAllJobSkillSuggestions,
      isEdited,
      overwriteConfirm,
      showSuccess,
      skillsSuggestions,
    ],
  );

  const getTechnical = useCallback((sectionData: SkillsSectionData) => {
    return normalizeSkillsTechnical(sectionData.technical);
  }, []);

  const addSkillToCategory = useCallback((
    editData: SkillsSectionData,
    category: string,
    skill: string,
    updateData: (field: string, value: any) => void
  ) => {
    const technical = getTechnical(editData);
    const updatedTechnical = {
      ...technical,
      [category]: [...(technical[category] || []), skill]
    };

    const updatedData = { ...editData, technical: updatedTechnical };
    updateData("technical", updatedTechnical);
    saveDataImmediately(updatedData, `Skill "${skill}" added to ${category}`);
  }, [getTechnical, saveDataImmediately]);

  const removeSkillFromCategory = useCallback((
    editData: SkillsSectionData,
    category: string,
    skillIndex: number,
    updateData: (field: string, value: any) => void
  ) => {
    const technical = getTechnical(editData);

    const updatedCategorySkills = (technical[category] || []).filter((_, i) => i !== skillIndex);
    const updatedTechnical = updatedCategorySkills.length > 0
      ? { ...technical, [category]: updatedCategorySkills }
      : Object.fromEntries(Object.entries(technical).filter(([k]) => k !== category));

    const updatedData = { ...editData, technical: updatedTechnical };
    updateData("technical", updatedTechnical);
    saveDataImmediately(updatedData, "Skill removed");
  }, [getTechnical, saveDataImmediately]);

  const addCategory = useCallback((
    editData: SkillsSectionData,
    categoryName: string,
    updateData: (field: string, value: any) => void
  ) => {
    const technical = getTechnical(editData);

    if (technical[categoryName]) {
      showSuccess("Category already exists");
      return;
    }

    const updatedTechnical = { ...technical, [categoryName]: [] };
    const updatedData = { ...editData, technical: updatedTechnical };
    updateData("technical", updatedTechnical);
    saveDataImmediately(updatedData, `Category "${categoryName}" added`);
    setNewCategoryName("");
  }, [getTechnical, saveDataImmediately, showSuccess]);

  const removeCategory = useCallback((
    editData: SkillsSectionData,
    category: string,
    updateData: (field: string, value: any) => void
  ) => {
    const technical = getTechnical(editData);
    const updatedTechnical: Record<string, string[]> = { ...technical };
    delete updatedTechnical[category];

    const updatedData = { ...editData, technical: updatedTechnical };
    updateData("technical", updatedTechnical);
    saveDataImmediately(updatedData, `Category "${category}" removed`);
  }, [getTechnical, saveDataImmediately]);

  const renameCategory = useCallback((
    editData: SkillsSectionData,
    oldName: string,
    newName: string,
    updateData: (field: string, value: any) => void
  ) => {
    const technical = getTechnical(editData);
    if (!newName.trim() || oldName === newName) return;

    if (technical[newName]) {
      showSuccess("Category with this name already exists");
      return;
    }

    const updatedTechnical = Object.fromEntries(
      Object.entries(technical).map(([k, v]) => k === oldName ? [newName, v] : [k, v])
    );

    const updatedData = { ...editData, technical: updatedTechnical };
    updateData("technical", updatedTechnical);
    saveDataImmediately(updatedData, `Category renamed to "${newName}"`);
    setEditingCategory(null);
  }, [getTechnical, saveDataImmediately, showSuccess]);

  const renderForm = (
    editData: SkillsSectionData,
    updateData: (field: string, value: any) => void,
  ) => {
    const wrappedUpdateData = createTrackedFieldUpdater(cvId, SKILLS_FIELD_KEY, updateData, ["technical"]);

    const technical = getTechnical(editData);

    const handleAddSuggestedSkill = async (skill: string, category: string) => {
      await applySingleJobSkillSuggestion(
        editData,
        skill,
        category,
        async (updatedData, message) => {
          updateData("technical", updatedData.technical);
          await saveDataImmediately(updatedData, message);
        },
      );
    };

    const handleApplyAllSuggestions = async () => {
      await applyAllJobSkillSuggestions(
        editData,
        async (updatedData, message) => {
          updateData("technical", updatedData.technical);
          await saveDataImmediately(updatedData, message);
        },
      );
    };

    const handleRejectAllSuggestions = async () => {
      await dismissAllJobSkillSuggestions();
      showSuccess("All AI suggestions have been rejected");
    };

    const hasSuggestions =
      !!skillsSuggestions &&
      Object.values(skillsSuggestions).some(
        (items) => Array.isArray(items) && items.length > 0,
      );

    const updateAndSaveEdit = async (
      updatedData: SkillsSectionData,
      message?: string,
    ) => {
      updateData("technical", updatedData.technical);
      await saveDataImmediately(updatedData, message);
    };

    return (
      <Box>
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: "bold" }}>
            Technical Skills
          </Typography>

          <Box>
            {Object.entries(technical).map(([category, skills]) => (
              <Box key={category} sx={{ mb: 3, pl: 1, borderLeft: "3px solid #1976d2" }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                  {editingCategory === category ? (
                    <>
                      <TextField
                        size="small"
                        value={categoryEditValue}
                        onChange={(e) => setCategoryEditValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            renameCategory(editData, category, categoryEditValue, wrappedUpdateData);
                          } else if (e.key === "Escape") {
                            setEditingCategory(null);
                          }
                        }}
                        autoFocus
                        sx={{ flex: 1 }}
                      />
                      <Button
                        size="small"
                        onClick={() => renameCategory(editData, category, categoryEditValue, wrappedUpdateData)}
                      >
                        Save
                      </Button>
                      <Button size="small" onClick={() => setEditingCategory(null)}>
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: "#1976d2", flex: 1 }}>
                        {category}
                      </Typography>
                      <IconButton
                        size="small"
                        onClick={() => {
                          setEditingCategory(category);
                          setCategoryEditValue(category);
                        }}
                        title="Rename category"
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => {
                          setCategoryToDelete(category);
                        }}
                        title="Delete category"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </>
                  )}
                </Box>

                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 1, ml: 1 }}>
                  {skills.map((skill: string, index: number) => (
                    <Chip
                      key={index}
                      label={skill}
                      onDelete={() => removeSkillFromCategory(editData, category, index, wrappedUpdateData)}
                      sx={{ bgcolor: "#e3f2fd", color: "#1976d2" }}
                    />
                  ))}
                </Box>

                <Box sx={{ ml: 1 }}>
                  <SkillsAutocomplete
                    value={newSkillByCategory[category] || ""}
                    onChange={(value) =>
                      setNewSkillByCategory((prev) => ({ ...prev, [category]: value }))
                    }
                    onAdd={() => {
                      const skill = (newSkillByCategory[category] || "").trim();
                      if (skill) {
                        addSkillToCategory(editData, category, skill, wrappedUpdateData);
                        setNewSkillByCategory((prev) => ({ ...prev, [category]: "" }));
                      }
                    }}
                    onAddDirect={(skill) => {
                      addSkillToCategory(editData, category, skill, wrappedUpdateData);
                    }}
                    placeholder={`Add skill to ${category}`}
                    skillType="technical"
                    existingSkills={skills}
                  />
                </Box>
              </Box>
            ))}

            {Object.keys(technical).length === 0 && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Add a category to start organizing skills.
                </Typography>
              </Box>
            )}

            <Box sx={{ display: "flex", gap: 1, alignItems: "center", mt: 2 }}>
              <TextField
                size="small"
                placeholder="New category name"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newCategoryName.trim()) {
                    e.preventDefault();
                    addCategory(editData, newCategoryName.trim(), wrappedUpdateData);
                  }
                }}
                sx={{ flex: 1 }}
              />
              <Button
                variant="outlined"
                size="small"
                startIcon={<AddIcon />}
                onClick={() => {
                  if (newCategoryName.trim()) {
                    addCategory(editData, newCategoryName.trim(), wrappedUpdateData);
                  }
                }}
                disabled={!newCategoryName.trim()}
              >
                Add Category
              </Button>
            </Box>
          </Box>
        </Box>

        {qualityHasSuggestions && qualitySkills && (
          <SkillsQualityBlock
            suggestions={qualitySkills}
            sectionData={editData}
            updateAndSave={updateAndSaveEdit}
            onDismissOne={dismissQualitySkillSuggestion}
            qualityHandlers={qualityHandlers}
          />
        )}

        {hasSuggestions && skillsSuggestions && (
          <JobBasedSkillsSuggestionsBox
            suggestions={skillsSuggestions}
            onApplyOne={(suggestion, category) =>
              handleAddSuggestedSkill(suggestion.skill, category)
            }
            onApplyAll={handleApplyAllSuggestions}
            onRejectAll={handleRejectAllSuggestions}
            variant="edit"
          />
        )}

        <ConfirmDialog
          open={Boolean(categoryToDelete)}
          onClose={() => setCategoryToDelete(null)}
          onConfirm={() => {
            if (!categoryToDelete) return;
            removeCategory(editData, categoryToDelete, wrappedUpdateData);
            setCategoryToDelete(null);
          }}
          title="Delete category?"
          message={
            categoryToDelete
              ? `Remove the entire category "${categoryToDelete}"?`
              : "Remove the entire category?"
          }
          confirmButtonText="Delete"
          confirmButtonColor="error"
          severity="warning"
        />
      </Box>
    );
  };

  const renderDisplay = (sectionData: SkillsSectionData) => {
    const technical = getTechnical(sectionData);
    const handleApplyAllSuggestionsDisplay = async () => {
      await applyAllJobSkillSuggestions(
        sectionData,
        async (updatedData, message) => {
          onUpdate(updatedData);
          await onSave?.(updatedData, message);
        },
      );
    };

    const handleRejectAllSuggestionsDisplay = async () => {
      await dismissAllJobSkillSuggestions();
      showSuccess("All AI suggestions have been rejected");
    };

    const handleApplyOneDisplay = async (
      suggestion: { skill: string },
      category: string,
    ) => {
      await applySingleJobSkillSuggestion(
        sectionData,
        suggestion.skill,
        category,
        async (updatedData) => {
          onUpdate(updatedData);
          await onSave?.(updatedData);
        },
        `Added "${suggestion.skill}" to ${category}`,
      );
    };

    return (
      <Box>
        <Box sx={{ mb: 2 }}>
          {Object.entries(technical).map(([category, skills]) => (
            <Box key={category} sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: "bold", color: "#1976d2" }}>
                {category}
              </Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                {skills.map((skill: string, index: number) => (
                  <Chip
                    key={index}
                    label={skill}
                    sx={{ bgcolor: "#e3f2fd", color: "#1976d2" }}
                  />
                ))}
              </Box>
            </Box>
          ))}
        </Box>

        {qualityHasSuggestions && qualitySkills && (
          <SkillsQualityBlock
            suggestions={qualitySkills}
            sectionData={sectionData}
            updateAndSave={saveDataImmediately}
            onDismissOne={dismissQualitySkillSuggestion}
            qualityHandlers={qualityHandlers}
          />
        )}

        {hasSuggestions && skillsSuggestions && (
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
      onHide={onHide}
      onDelete={onDelete}
      readOnly={readOnly}
    />
  );
};

// Memoize component to prevent unnecessary re-renders
export default React.memo(SkillsSection, (prevProps, nextProps) => {
  return (
    prevProps.data === nextProps.data &&
    prevProps.isEditing === nextProps.isEditing &&
    prevProps.cvId === nextProps.cvId
  );
});
