import React, { useState, useCallback } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import Alert from "@mui/material/Alert";
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
  type UseSkillsQualitySuggestionsResult,
  type UpdateAndSaveSkills,
} from "./hooks/useSkillsQualitySuggestions";
import type { SkillsSuggestions } from "../../../types/ai";
import type { Language } from "../../../types/cv";
import { isCategorizedTechnical } from "../../../types/cv";
import { generateId } from "../../../utils/idGenerator";

/** Section data shape for skills (technical + soft + languages). */
export interface SkillsSectionData {
  technical?: string[] | Record<string, string[]>; // Support both flat and categorized
  soft?: string[];
  languages?: Language[];
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
  onHide,
  onDelete,
  readOnly,
}) => {
  const [newTechnicalSkill, setNewTechnicalSkill] = useState("");
  const [newSoftSkill, setNewSoftSkill] = useState("");
  const [newLanguageName, setNewLanguageName] = useState("");
  const [newLanguageProficiency, setNewLanguageProficiency] = useState<
    Language["proficiency"]
  >("Intermediate");
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

  // Helper functions for categorized technical skills
  const addSkillToCategory = useCallback((
    editData: SkillsSectionData,
    category: string,
    skill: string,
    updateData: (field: string, value: any) => void
  ) => {
    const technical = editData.technical || {};
    const categorized = isCategorizedTechnical(technical) ? technical : { "Technical": technical || [] };

    const updatedTechnical = {
      ...categorized,
      [category]: [...(categorized[category] || []), skill]
    };

    const updatedData = { ...editData, technical: updatedTechnical };
    updateData("technical", updatedTechnical);
    saveDataImmediately(updatedData, `Skill "${skill}" added to ${category}`);
  }, [saveDataImmediately]);

  const removeSkillFromCategory = useCallback((
    editData: SkillsSectionData,
    category: string,
    skillIndex: number,
    updateData: (field: string, value: any) => void
  ) => {
    const technical = editData.technical;
    if (!isCategorizedTechnical(technical)) return;

    const updatedCategorySkills = (technical[category] || []).filter((_, i) => i !== skillIndex);
    const updatedTechnical = updatedCategorySkills.length > 0
      ? { ...technical, [category]: updatedCategorySkills }
      : Object.fromEntries(Object.entries(technical).filter(([k]) => k !== category));

    const updatedData = { ...editData, technical: updatedTechnical };
    updateData("technical", updatedTechnical);
    saveDataImmediately(updatedData, "Skill removed");
  }, [saveDataImmediately]);

  const addCategory = useCallback((
    editData: SkillsSectionData,
    categoryName: string,
    updateData: (field: string, value: any) => void
  ) => {
    const technical = editData.technical || {};
    const categorized = isCategorizedTechnical(technical) ? technical : { "Technical": technical || [] };

    if (categorized[categoryName]) {
      showSuccess("Category already exists");
      return;
    }

    const updatedTechnical = { ...categorized, [categoryName]: [] };
    const updatedData = { ...editData, technical: updatedTechnical };
    updateData("technical", updatedTechnical);
    saveDataImmediately(updatedData, `Category "${categoryName}" added`);
    setNewCategoryName("");
  }, [saveDataImmediately, showSuccess]);

  const removeCategory = useCallback((
    editData: SkillsSectionData,
    category: string,
    updateData: (field: string, value: any) => void
  ) => {
    const technical = editData.technical;
    if (!isCategorizedTechnical(technical)) return;

    const updatedTechnical: Record<string, string[]> = { ...technical };
    delete updatedTechnical[category];

    const updatedData = { ...editData, technical: updatedTechnical };
    updateData("technical", updatedTechnical);
    saveDataImmediately(updatedData, `Category "${category}" removed`);
  }, [saveDataImmediately]);

  const renameCategory = useCallback((
    editData: SkillsSectionData,
    oldName: string,
    newName: string,
    updateData: (field: string, value: any) => void
  ) => {
    const technical = editData.technical;
    if (!isCategorizedTechnical(technical) || !newName.trim() || oldName === newName) return;

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
  }, [saveDataImmediately, showSuccess]);

  const renderForm = (
    editData: any,
    updateData: (field: string, value: any) => void,
  ) => {
    const wrappedUpdateData = createTrackedFieldUpdater(cvId, SKILLS_FIELD_KEY, updateData, ["technical", "soft", "languages"]);

    const addTechnicalSkill = () => {
      if (newTechnicalSkill.trim()) {
        const updatedData = {
          ...editData,
          technical: [...(editData.technical || []), newTechnicalSkill.trim()],
        };
        wrappedUpdateData("technical", updatedData.technical);
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
        wrappedUpdateData("soft", updatedData.soft);
        saveDataImmediately(updatedData, "Soft skill added");
        setNewSoftSkill("");
      }
    };

    const addTechnicalSkillDirect = (skill: string) => {
      const updatedData = {
        ...editData,
        technical: [...(editData.technical || []), skill],
      };
      wrappedUpdateData("technical", updatedData.technical);
      saveDataImmediately(updatedData, "Technical skill added");
    };

    const addSoftSkillDirect = (skill: string) => {
      const updatedData = {
        ...editData,
        soft: [...(editData.soft || []), skill],
      };
      wrappedUpdateData("soft", updatedData.soft);
      saveDataImmediately(updatedData, "Soft skill added");
    };

    const removeTechnicalSkill = (index: number) => {
      const updatedData = {
        ...editData,
        technical: (editData.technical || []).filter(
          (_: any, i: number) => i !== index,
        ),
      };
      wrappedUpdateData("technical", updatedData.technical);
      saveDataImmediately(updatedData, "Technical skill removed");
    };

    const removeSoftSkill = (index: number) => {
      const updatedData = {
        ...editData,
        soft: (editData.soft || []).filter((_: any, i: number) => i !== index),
      };
      wrappedUpdateData("soft", updatedData.soft);
      saveDataImmediately(updatedData, "Soft skill removed");
    };

    const addLanguage = () => {
      const trimmed = newLanguageName.trim();
      if (!trimmed) return;
      const newLang: Language = {
        id: generateId(),
        language: trimmed,
        proficiency: newLanguageProficiency,
      };
      const languages = [...(editData.languages || []), newLang];
      const updatedData = { ...editData, languages };
      wrappedUpdateData("languages", languages);
      saveDataImmediately(updatedData, "Language added");
      setNewLanguageName("");
      setNewLanguageProficiency("Intermediate");
    };

    const removeLanguage = (index: number) => {
      const languages = (editData.languages || []).filter(
        (_: Language, i: number) => i !== index,
      );
      const updatedData = { ...editData, languages };
      wrappedUpdateData("languages", languages);
      saveDataImmediately(updatedData, "Language removed");
    };

    // AI Suggestions handlers - category-aware
    const handleAddSuggestedSkill = async (
      skill: string,
      type: "technical" | "soft",
    ) => {
      if (type === "soft") {
        // Soft skills remain flat
        const updatedData = {
          ...editData,
          soft: [...(editData.soft || []), skill],
        };
        updateData("soft", updatedData.soft);
        saveDataImmediately(updatedData, `AI suggested skill "${skill}" added`);
        await dismissJobSkillSuggestion(skill, type);
      } else {
        // Technical skills: add to appropriate category
        const technical = editData.technical || [];
        if (isCategorizedTechnical(technical)) {
          // Add to "AI Suggested" category or first category if it exists
          const targetCategory = technical["AI Suggested"] !== undefined
            ? "AI Suggested"
            : Object.keys(technical)[0] || "Technical";

          const updatedTechnical = {
            ...technical,
            [targetCategory]: [...(technical[targetCategory] || []), skill]
          };

          const updatedData = { ...editData, technical: updatedTechnical };
          updateData("technical", updatedTechnical);
          saveDataImmediately(updatedData, `AI suggested skill "${skill}" added to ${targetCategory}`);
        } else {
          // Legacy format: just append to array
          const updatedData = {
            ...editData,
            technical: [...technical, skill],
          };
          updateData("technical", updatedData.technical);
          saveDataImmediately(updatedData, `AI suggested skill "${skill}" added`);
        }
        await dismissJobSkillSuggestion(skill, type);
      }
    };

    const handleApplyAllSuggestions = async () => {
      if (!skillsSuggestions) {
        return;
      }
      if (cvId && isEdited(cvId, SKILLS_FIELD_KEY)) {
        const ok = await overwriteConfirm(OVERWRITE_MSG);
        if (!ok) return;
      }

      const updatedData = { ...editData };

      // Add all technical skills - category-aware
      if (skillsSuggestions.technical.length > 0) {
        const technical = updatedData.technical || [];
        if (isCategorizedTechnical(technical)) {
          // Add to "AI Suggested" category
          const suggestedSkills = skillsSuggestions.technical.map((s) => s.skill);
          updatedData.technical = {
            ...technical,
            "AI Suggested": [...(technical["AI Suggested"] || []), ...suggestedSkills]
          };
        } else {
          // Legacy format
          updatedData.technical = [
            ...(Array.isArray(technical) ? technical : []),
            ...skillsSuggestions.technical.map((s) => s.skill),
          ];
        }
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

      if (cvId) clearEdited(cvId, SKILLS_FIELD_KEY);
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
      updateData("languages", updatedData.languages);
      await saveDataImmediately(updatedData, message);
    };

    return (
      <Box>
        {/* Legacy format alert */}
        {!isCategorizedTechnical(editData.technical) && editData.technical && editData.technical.length > 0 && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Your technical skills are in legacy format.
            Skills from newly parsed CVs will be automatically categorized by the AI.
          </Alert>
        )}

        {/* Technical Skills Section */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: "bold" }}>
            Technical Skills
          </Typography>

          {/* Render categorized technical skills */}
          {isCategorizedTechnical(editData.technical) ? (
            <Box>
              {Object.entries(editData.technical).map(([category, skills]) => (
                <Box key={category} sx={{ mb: 3, pl: 1, borderLeft: "3px solid #1976d2" }}>
                  {/* Category Header */}
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

                  {/* Skills in Category */}
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

                  {/* Add Skill to Category */}
                  <Box sx={{ ml: 1 }}>
                    <SkillsAutocomplete
                      value={newTechnicalSkill}
                      onChange={setNewTechnicalSkill}
                      onAdd={() => {
                        if (newTechnicalSkill.trim()) {
                          addSkillToCategory(editData, category, newTechnicalSkill.trim(), wrappedUpdateData);
                          setNewTechnicalSkill("");
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

              {/* Add New Category */}
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
          ) : (
            /* Legacy flat list rendering */
            <Box>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 2 }}>
                {(editData.technical || []).map((skill: string, index: number) => (
                  <Chip
                    key={index}
                    label={skill}
                    onDelete={() => removeTechnicalSkill(index)}
                    sx={{ bgcolor: "#e3f2fd", color: "#1976d2" }}
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
          )}
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

        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: "bold" }}>
            Languages
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 2 }}>
            {(editData.languages || []).map((lang: Language, index: number) => (
              <Chip
                key={lang.id}
                label={lang.proficiency ? `${lang.language} (${lang.proficiency})` : lang.language}
                onDelete={() => removeLanguage(index)}
                sx={{
                  bgcolor: "#e8f5e9",
                  color: "#2e7d32",
                }}
              />
            ))}
          </Box>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, alignItems: "center" }}>
            <TextField
              size="small"
              placeholder="Language name"
              value={newLanguageName}
              onChange={(e) => setNewLanguageName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addLanguage())}
              sx={{ minWidth: 160 }}
            />
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel id="skills-language-proficiency-label">Proficiency</InputLabel>
              <Select
                labelId="skills-language-proficiency-label"
                value={newLanguageProficiency}
                label="Proficiency"
                onChange={(e) => setNewLanguageProficiency(e.target.value as Language["proficiency"])}
              >
                <MenuItem value="Basic">Basic</MenuItem>
                <MenuItem value="Intermediate">Intermediate</MenuItem>
                <MenuItem value="Advanced">Advanced</MenuItem>
                <MenuItem value="Fluent">Fluent</MenuItem>
                <MenuItem value="Native">Native</MenuItem>
              </Select>
            </FormControl>
            <Button variant="outlined" size="small" onClick={addLanguage} disabled={!newLanguageName.trim()}>
              Add
            </Button>
          </Box>
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

  const renderDisplay = (data: SkillsSectionData) => {
    // Handler functions for display mode - category-aware
    const handleApplyAllSuggestionsDisplay = async () => {
      if (!skillsSuggestions) {
        return;
      }
      if (cvId && isEdited(cvId, SKILLS_FIELD_KEY)) {
        const ok = await overwriteConfirm(OVERWRITE_MSG);
        if (!ok) return;
      }

      const updatedData = { ...data };

      // Add all technical skills - category-aware
      if (skillsSuggestions.technical.length > 0) {
        const technical = updatedData.technical || [];
        if (isCategorizedTechnical(technical)) {
          // Add to "AI Suggested" category
          const suggestedSkills = skillsSuggestions.technical.map((s) => s.skill);
          updatedData.technical = {
            ...technical,
            "AI Suggested": [...(technical["AI Suggested"] || []), ...suggestedSkills]
          };
        } else {
          // Legacy format
          updatedData.technical = [
            ...(Array.isArray(technical) ? technical : []),
            ...skillsSuggestions.technical.map((s) => s.skill),
          ];
        }
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

      if (cvId) clearEdited(cvId, SKILLS_FIELD_KEY);
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
      if (type === "soft") {
        // Soft skills remain flat
        const updatedData = {
          ...data,
          soft: [...(data.soft || []), suggestion.skill],
        };
        onUpdate(updatedData);
        onSave?.(updatedData);
        await dismissJobSkillSuggestion(suggestion.skill, type);
        showSuccess(`Added "${suggestion.skill}" to soft skills`);
      } else {
        // Technical skills: category-aware
        const technical = data.technical || [];
        if (isCategorizedTechnical(technical)) {
          // Add to "AI Suggested" category or first category
          const targetCategory = technical["AI Suggested"] !== undefined
            ? "AI Suggested"
            : Object.keys(technical)[0] || "Technical";

          const updatedData = {
            ...data,
            technical: {
              ...technical,
              [targetCategory]: [...(technical[targetCategory] || []), suggestion.skill]
            }
          };
          onUpdate(updatedData);
          onSave?.(updatedData);
          await dismissJobSkillSuggestion(suggestion.skill, type);
          showSuccess(`Added "${suggestion.skill}" to ${targetCategory}`);
        } else {
          // Legacy format
          const updatedData = {
            ...data,
            technical: [...technical, suggestion.skill],
          };
          onUpdate(updatedData);
          onSave?.(updatedData);
          await dismissJobSkillSuggestion(suggestion.skill, type);
          showSuccess(`Added "${suggestion.skill}" to technical skills`);
        }
      }
    };

    return (
      <Box>
        {/* Legacy format alert */}
        {!isCategorizedTechnical(data.technical) && data.technical && data.technical.length > 0 && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Your technical skills are in legacy format.
            Skills from newly parsed CVs will be automatically categorized by the AI.
          </Alert>
        )}

        {/* Technical Skills - Categorized or Flat */}
        {isCategorizedTechnical(data.technical) ? (
          <Box sx={{ mb: 2 }}>
            {Object.entries(data.technical).map(([category, skills]) => (
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
        ) : (
          /* Legacy flat display - mixed with soft skills as before */
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 2 }}>
            {data.technical?.map((skill: string, index: number) => (
              <Chip
                key={index}
                label={skill}
                sx={{ bgcolor: "#e3f2fd", color: "#1976d2" }}
              />
            ))}
          </Box>
        )}

        {/* Soft Skills */}
        {data.soft && data.soft.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: "bold" }}>
              Soft Skills
            </Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
              {data.soft.map((skill: string, index: number) => (
                <Chip
                  key={`soft-${index}`}
                  label={skill}
                  sx={{ bgcolor: "#f3e5f5", color: "#7b1fa2" }}
                />
              ))}
            </Box>
          </Box>
        )}

        {data.languages && data.languages.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: "bold" }}>
              Languages
            </Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
              {data.languages.map((lang) => (
                <Chip
                  key={lang.id}
                  label={lang.proficiency ? `${lang.language} (${lang.proficiency})` : lang.language}
                  sx={{
                    bgcolor: "#e8f5e9",
                    color: "#2e7d32",
                  }}
                />
              ))}
            </Box>
          </Box>
        )}

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
      onHide={onHide}
      onDelete={onDelete}
      readOnly={readOnly}
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
