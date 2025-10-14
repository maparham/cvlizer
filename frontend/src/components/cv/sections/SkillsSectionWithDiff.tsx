/**
 * Skills Section with Inline Diff Support
 *
 * Enhanced version of the SkillsSection that integrates with the inline diff system
 * to show AI suggestions for keyword additions and skill enhancements.
 *
 * Key responsibilities:
 * - Render skills with highlighted suggestions
 * - Show new keyword suggestions with appropriate visual indicators
 * - Allow users to accept/reject individual skill suggestions
 * - Maintain backward compatibility with original SkillsSection functionality
 * - Handle both technical and soft skills with diff highlighting
 *
 * Usage:
 * - Drop-in replacement for original SkillsSection when diff mode is active
 * - Automatically detects diff mode and renders accordingly
 * - Falls back to original behavior when not in diff mode
 */

import React, { useState } from "react";
import { Box, Typography, Chip, IconButton, Tooltip } from "@mui/material";
import { CheckCircleOutline, CancelOutlined, Add } from "@mui/icons-material";
import { SectionProps } from "../../../types";
import SimpleFormSection from "../core/SimpleFormSection";
import SkillsAutocomplete from "../ui/SkillsAutocomplete";
import { SuggestionHighlight } from "../ai/SuggestionHighlight";
import {
  useInlineDiffSection,
  useHighlightedKeywords,
} from "../../../hooks/useInlineDiffSection";
import { useInlineDiffContext } from "../../../contexts/InlineDiffContext";

const SkillsSectionWithDiff: React.FC<SectionProps> = ({
  data,
  onUpdate,
  onSave,
  isEditing,
  onEdit,
  onClose,
}) => {
  const [newTechnicalSkill, setNewTechnicalSkill] = useState("");
  const [newSoftSkill, setNewSoftSkill] = useState("");

  const {
    isInDiffMode,
    acceptSuggestion: acceptInlineSuggestion,
    rejectSuggestion: rejectInlineSuggestion,
  } = useInlineDiffContext();

  // Use diff hooks for both technical and soft skills
  const technicalDiffData = useInlineDiffSection({
    section: "skills",
    fieldPath: "technical",
    originalData: (data as any)?.technical || [],
  });

  const softDiffData = useInlineDiffSection({
    section: "skills",
    fieldPath: "soft",
    originalData: (data as any)?.soft || [],
  });

  const technicalKeywords = useHighlightedKeywords(
    "skills",
    "technical",
    (data as any)?.technical || [],
  );

  const softKeywords = useHighlightedKeywords(
    "skills",
    "soft",
    (data as any)?.soft || [],
  );

  // Enhanced chip renderer that handles suggestions
  const renderSkillChip = (
    skill: string,
    index: number,
    isNew: boolean,
    suggestion: any,
    onRemove: (index: number) => void,
    skillType: "technical" | "soft",
  ) => {
    const chipElement = (
      <Chip
        key={`${skill}-${index}`}
        label={skill}
        onDelete={!isNew ? () => onRemove(index) : undefined}
        color={isNew ? "success" : "default"}
        variant={isNew ? "filled" : "outlined"}
        size="small"
        sx={{
          m: 0.25,
          ...(isNew && {
            animation: "fadeIn 0.3s ease-in",
            boxShadow: 1,
          }),
        }}
      />
    );

    if (isNew && suggestion) {
      return (
        <Box
          key={`${skill}-${index}`}
          sx={{ position: "relative", display: "inline-block" }}
        >
          <SuggestionHighlight
            suggestion={suggestion}
            section="skills"
            fieldPath={skillType}
          >
            {chipElement}
          </SuggestionHighlight>
          {suggestion.status === "pending" && (
            <Box
              sx={{
                position: "absolute",
                top: -8,
                right: -8,
                display: "flex",
                gap: 0.5,
              }}
            >
              <Tooltip title="Accept skill">
                <IconButton
                  size="small"
                  color="success"
                  onClick={() => acceptInlineSuggestion(suggestion.id)}
                  sx={{
                    width: 20,
                    height: 20,
                    bgcolor: "background.paper",
                    boxShadow: 1,
                    "&:hover": { boxShadow: 2 },
                  }}
                >
                  <CheckCircleOutline fontSize="inherit" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Reject skill">
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => rejectInlineSuggestion(suggestion.id)}
                  sx={{
                    width: 20,
                    height: 20,
                    bgcolor: "background.paper",
                    boxShadow: 1,
                    "&:hover": { boxShadow: 2 },
                  }}
                >
                  <CancelOutlined fontSize="inherit" />
                </IconButton>
              </Tooltip>
            </Box>
          )}
        </Box>
      );
    }

    return chipElement;
  };

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
        onSave?.(updatedData, "Technical skill added");
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
        onSave?.(updatedData, "Soft skill added");
        setNewSoftSkill("");
      }
    };

    const addTechnicalSkillDirect = (skill: string) => {
      const updatedData = {
        ...editData,
        technical: [...(editData.technical || []), skill],
      };
      updateData("technical", updatedData.technical);
      onSave?.(updatedData, "Technical skill added");
    };

    const addSoftSkillDirect = (skill: string) => {
      const updatedData = {
        ...editData,
        soft: [...(editData.soft || []), skill],
      };
      updateData("soft", updatedData.soft);
      onSave?.(updatedData, "Soft skill added");
    };

    const removeTechnicalSkill = (index: number) => {
      const updatedData = {
        ...editData,
        technical: (editData.technical || []).filter(
          (_: any, i: number) => i !== index,
        ),
      };
      updateData("technical", updatedData.technical);
      onSave?.(updatedData, "Technical skill removed");
    };

    const removeSoftSkill = (index: number) => {
      const updatedData = {
        ...editData,
        soft: (editData.soft || []).filter((_: any, i: number) => i !== index),
      };
      updateData("soft", updatedData.soft);
      onSave?.(updatedData, "Soft skill removed");
    };

    // Prepare skills for rendering (combining original and new)
    const displayTechnicalSkills = isInDiffMode
      ? technicalKeywords.highlightedKeywords
      : (editData.technical || []).map((skill: string) => ({
          keyword: skill,
          isNew: false,
          suggestion: undefined,
        }));

    const displaySoftSkills = isInDiffMode
      ? softKeywords.highlightedKeywords
      : (editData.soft || []).map((skill: string) => ({
          keyword: skill,
          isNew: false,
          suggestion: undefined,
        }));

    return (
      <Box>
        {/* Technical Skills Section */}
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: "bold" }}>
              Technical Skills
            </Typography>
            {isInDiffMode && technicalDiffData.hasPendingSuggestions && (
              <Chip
                label={`${technicalDiffData.suggestions.filter((s) => s.status === "pending").length} new`}
                size="small"
                color="success"
                variant="outlined"
                icon={<Add />}
              />
            )}
          </Box>

          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 2 }}>
            {displayTechnicalSkills.map((item: any, index: number) =>
              renderSkillChip(
                item.keyword,
                index,
                item.isNew,
                item.suggestion,
                removeTechnicalSkill,
                "technical",
              ),
            )}
          </Box>

          <SkillsAutocomplete
            value={newTechnicalSkill}
            onChange={setNewTechnicalSkill}
            onAdd={addTechnicalSkill}
            onAddDirect={addTechnicalSkillDirect}
            placeholder="Add technical skill"
            skillType="technical"
            disabled={isInDiffMode}
          />
        </Box>

        {/* Soft Skills Section */}
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: "bold" }}>
              Soft Skills
            </Typography>
            {isInDiffMode && softDiffData.hasPendingSuggestions && (
              <Chip
                label={`${softDiffData.suggestions.filter((s) => s.status === "pending").length} new`}
                size="small"
                color="success"
                variant="outlined"
                icon={<Add />}
              />
            )}
          </Box>

          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 2 }}>
            {displaySoftSkills.map((item: any, index: number) =>
              renderSkillChip(
                item.keyword,
                index,
                item.isNew,
                item.suggestion,
                removeSoftSkill,
                "soft",
              ),
            )}
          </Box>

          <SkillsAutocomplete
            value={newSoftSkill}
            onChange={setNewSoftSkill}
            onAdd={addSoftSkill}
            onAddDirect={addSoftSkillDirect}
            placeholder="Add soft skill"
            skillType="soft"
            disabled={isInDiffMode}
          />
        </Box>
      </Box>
    );
  };

  const renderDisplay = (displayData: any) => {
    // Safely extract arrays, ensuring they are arrays and not objects
    let technicalSkills = [];
    let softSkills = [];

    if (isInDiffMode) {
      technicalSkills = Array.isArray(technicalDiffData.displayData)
        ? technicalDiffData.displayData
        : [];
      softSkills = Array.isArray(softDiffData.displayData)
        ? softDiffData.displayData
        : [];
    } else {
      if (displayData && typeof displayData === "object") {
        technicalSkills = Array.isArray(displayData.technical)
          ? displayData.technical
          : [];
        softSkills = Array.isArray(displayData.soft) ? displayData.soft : [];
      }
    }

    return (
      <Box data-section="skills">
        {technicalSkills && technicalSkills.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: "bold" }}>
              Technical Skills
            </Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
              {technicalSkills.map((skill: string, index: number) => {
                const isNewSkill =
                  isInDiffMode && technicalKeywords.newKeywords.includes(skill);
                const suggestion = technicalKeywords.highlightedKeywords.find(
                  (item) => item.keyword === skill,
                )?.suggestion;

                if (isNewSkill && suggestion) {
                  return (
                    <SuggestionHighlight
                      key={index}
                      suggestion={suggestion}
                      section="skills"
                      fieldPath="technical"
                    >
                      <Chip
                        label={skill}
                        size="small"
                        color="success"
                        variant="filled"
                      />
                    </SuggestionHighlight>
                  );
                }

                return (
                  <Chip
                    key={index}
                    label={skill}
                    size="small"
                    variant="outlined"
                  />
                );
              })}
            </Box>
          </Box>
        )}

        {softSkills && softSkills.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: "bold" }}>
              Soft Skills
            </Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
              {softSkills.map((skill: string, index: number) => {
                const isNewSkill =
                  isInDiffMode && softKeywords.newKeywords.includes(skill);
                const suggestion = softKeywords.highlightedKeywords.find(
                  (item) => item.keyword === skill,
                )?.suggestion;

                if (isNewSkill && suggestion) {
                  return (
                    <SuggestionHighlight
                      key={index}
                      suggestion={suggestion}
                      section="skills"
                      fieldPath="soft"
                    >
                      <Chip
                        label={skill}
                        size="small"
                        color="success"
                        variant="filled"
                      />
                    </SuggestionHighlight>
                  );
                }

                return (
                  <Chip
                    key={index}
                    label={skill}
                    size="small"
                    variant="outlined"
                  />
                );
              })}
            </Box>
          </Box>
        )}
      </Box>
    );
  };

  return (
    <SimpleFormSection
      data={data}
      renderForm={renderForm}
      renderDisplay={renderDisplay}
      onUpdate={onUpdate}
      onSave={onSave}
      isEditing={isEditing}
      onEdit={onEdit}
      onClose={onClose}
      title="Skills"
      sectionId="skills"
      requiredFields={[]}
      autoSaveMessage="Skills updated"
      autoSaveMode={isInDiffMode}
    />
  );
};

export default SkillsSectionWithDiff;
