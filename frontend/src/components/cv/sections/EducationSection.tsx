import React, { useCallback } from "react";
import {
  Box,
  TextField,
  Button,
  Typography,
  IconButton,
} from "@mui/material";
import { Add as AddIcon, Delete as DeleteIcon } from "@mui/icons-material";
import { SectionProps } from "../../../types";
import IndividualItemSection from "../core/IndividualItemSection";
import { FormField } from "../core/formUtils";
import { ValidatedFormField, ValidatedDateField, ValidatedDisplay, useItemValidation, type ItemValidationState } from "../core/validatedFields";
import LocationAutocomplete from "../ui/LocationAutocomplete";
import DegreeAutocomplete from "../ui/DegreeAutocomplete";
import FieldOfStudyAutocomplete from "../ui/FieldOfStudyAutocomplete";
import AcademicDegreeAutocomplete from "../ui/AcademicDegreeAutocomplete";
import { generateSectionId } from "../../../utils/idGenerator";
import MarkdownRenderer from "../../common/MarkdownRenderer";
import ItemDescriptionSuggestion from "../ai/ItemDescriptionSuggestion";
import { CoachingQuestionsPanel } from "../ai/CoachingQuestionsPanel";
import { useAISuggestionsStore } from "../../../stores/aiSuggestionsStore";
import { useCVQualityStore, useValidatedQualityAnalysis } from "../../../stores/cvQualityStore";
import { useNotifications } from "../../../packages/notifications";
import { useFieldValidation } from "../../../hooks/useFieldValidation";
import { LowQualityItem, WritingCorrection, FieldCorrection } from "../../../types/ai";
import { UnifiedQualitySuggestion } from "../ai/UnifiedQualitySuggestion";
import { InlineFieldCorrection } from "../ai/InlineFieldCorrection";
import { useFieldCorrections } from "./hooks/useFieldCorrections";
import { useSectionSuggestions } from "./hooks/useSectionSuggestions";
import { useSectionHandlers } from "./hooks/useSectionHandlers";
import { useFormHandlers } from "./hooks/useFormHandlers";
import { ScoreChip } from "./common/ScoreChip";
import { DiscardAllDialog } from "./common/DiscardAllDialog";

interface Education {
  id: string;
  institution: string;
  degree: string;
  field_of_study: string;
  academic_title?: string;
  location: string;
  start_date: string;
  end_date: string;
  gpa?: string;
  description?: string;
  achievements: string[];
  honors: string[];
}

// Separate component for education form to allow using hooks
const EducationForm: React.FC<{
  edu: Education;
  index: number;
  updateEducation: (field: keyof Education, value: any) => void;
  onSave?: () => void;
  qualitySuggestion?: LowQualityItem;
  writingCorrections?: WritingCorrection[];
  onApplyQualitySuggestion?: (suggested: string) => void;
  onDismissQualitySuggestion?: () => void;
  onApplyWritingCorrection?: (correction: WritingCorrection) => void;
  onDismissWritingCorrection?: (correction: WritingCorrection) => void;
  onApplySingleFieldCorrection?: (fieldCorrection: FieldCorrection, parentCorrection: WritingCorrection) => void;
  onApplyAll?: (itemId: string, qualitySuggested?: string, writingCorrections?: WritingCorrection[]) => void;
}> = ({
  edu,
  index,
  updateEducation,
  onSave,
  qualitySuggestion,
  writingCorrections,
  onApplyQualitySuggestion,
  onDismissQualitySuggestion,
  onApplyWritingCorrection,
  onDismissWritingCorrection,
  onApplySingleFieldCorrection,
  onApplyAll,
}) => {
  // Get validation errors for degree (used by DegreeAutocomplete)
  const degreeValidation = useFieldValidation('education', index, 'degree');

  // Extract field-specific corrections using unified hook
  const { fieldCorrectionProps, descriptionCorrection } = useFieldCorrections(
    edu.id,
    writingCorrections || [],
    [
      { fieldName: 'institution' },
      { fieldName: 'degree' },
      { fieldName: 'location' },
      { fieldName: 'start_date' },
      { fieldName: 'end_date' },
    ],
    onApplySingleFieldCorrection!,
    onDismissWritingCorrection!
  );

  const addHonor = () => {
    const currentHonors = edu.honors || [];
    const newHonors = [...currentHonors, ""];
    updateEducation("honors", newHonors);
  };

  const updateHonor = (honorIndex: number, value: string) => {
    const currentHonors = edu.honors || [];
    const newHonors = [...currentHonors];
    newHonors[honorIndex] = value;
    updateEducation("honors", newHonors);
  };

  const removeHonor = (honorIndex: number) => {
    const currentHonors = edu.honors || [];
    const newHonors = currentHonors.filter((_, i) => i !== honorIndex);
    updateEducation("honors", newHonors);
  };

  const addAchievement = () => {
    const currentAchievements = edu.achievements || [];
    const newAchievements = [...currentAchievements, ""];
    updateEducation("achievements", newAchievements);
  };

  const updateAchievement = (achievementIndex: number, value: string) => {
    const currentAchievements = edu.achievements || [];
    const newAchievements = [...currentAchievements];
    newAchievements[achievementIndex] = value;
    updateEducation("achievements", newAchievements);
  };

  const removeAchievement = (achievementIndex: number) => {
    const currentAchievements = edu.achievements || [];
    const newAchievements = currentAchievements.filter(
      (_, i) => i !== achievementIndex,
    );
    updateEducation("achievements", newAchievements);
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <DegreeAutocomplete
        value={edu.degree || ""}
        onChange={(value) => updateEducation("degree", value)}
        onSave={onSave}
        placeholder="e.g., Bachelor of Science"
        label="Degree"
        error={degreeValidation.hasError}
        helperText={degreeValidation.errorMessage}
        {...fieldCorrectionProps.degree}
      />
      <ValidatedFormField
        section="education"
        field="institution"
        index={index}
        config={{
          name: "institution",
          label: "Institution",
          placeholder: "e.g., University of California",
          required: true,
        }}
        value={edu.institution}
        onChange={(value) => updateEducation("institution", value)}
        onSave={onSave}
        {...fieldCorrectionProps.institution}
      />
      <FieldOfStudyAutocomplete
        value={edu.field_of_study || ""}
        onChange={(value) => updateEducation("field_of_study", value)}
        onSave={onSave}
        placeholder="e.g., Computer Science"
        label="Field of Study"
      />
      <AcademicDegreeAutocomplete
        value={edu.academic_title || ""}
        onChange={(value) => updateEducation("academic_title", value)}
        onSave={onSave}
        placeholder="e.g., Dr., Prof."
        label="Academic Degree"
      />
      <LocationAutocomplete
        value={edu.location || ""}
        onChange={(value) => updateEducation("location", value)}
        onSave={onSave}
        placeholder="e.g., Boston, MA"
        {...fieldCorrectionProps.location}
      />
      <Box sx={{ display: "flex", gap: 2 }}>
        <ValidatedDateField
          section="education"
          field="start_date"
          index={index}
          config={{
            name: "start_date",
            label: "Start Date",
            required: true,
          }}
          value={edu.start_date}
          onChange={(value) => updateEducation("start_date", value)}
          onSave={onSave}
          sx={{ flex: 1 }}
          {...fieldCorrectionProps.start_date}
        />
        <ValidatedDateField
          section="education"
          field="end_date"
          index={index}
          config={{
            name: "end_date",
            label: "End Date",
            minDate: edu.start_date || undefined, // End date must be after start date
          }}
          value={edu.end_date}
          onChange={(value) => updateEducation("end_date", value)}
          onSave={onSave}
          sx={{ flex: 1 }}
          {...fieldCorrectionProps.end_date}
        />
      </Box>
      <FormField
        config={{
          name: "gpa",
          label: "GPA",
          placeholder: "e.g., 3.8/4.0",
        }}
        value={edu.gpa || ""}
        onChange={(value) => updateEducation("gpa", value)}
        onSave={onSave}
      />
      <FormField
        config={{
          name: "description",
          label: "Description",
          placeholder:
            "Describe your education, coursework, thesis, or relevant projects...",
          multiline: true,
          rows: 3,
          useMarkdownEditor: true,
        }}
        value={edu.description || ""}
        onChange={(value) => updateEducation("description", value)}
        onSave={onSave}
        htmlDiffCorrection={descriptionCorrection}
        onApplyCorrection={onApplyWritingCorrection}
        onDismissCorrection={() => descriptionCorrection && onDismissWritingCorrection?.(descriptionCorrection.correction)}
      />

      <Box>
        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: "bold" }}>
          Achievements
        </Typography>
        {(edu.achievements || []).map(
          (achievement: string, achievementIndex: number) => (
            <Box
              key={achievementIndex}
              sx={{
                display: "flex",
                gap: 1,
                mb: 1,
                "&:hover .item-action-button": {
                  opacity: 1,
                },
              }}
            >
              <TextField
                fullWidth
                size="small"
                value={achievement}
                onChange={(e) =>
                  updateAchievement(achievementIndex, e.target.value)
                }
                placeholder="Enter academic achievement"
              />
              <IconButton
                size="small"
                onClick={() => removeAchievement(achievementIndex)}
                className="item-action-button"
                sx={{
                  color: "text.secondary",
                  opacity: 0.3,
                  transition: "all 0.2s ease",
                  "&:hover": {
                    color: "error.main",
                    bgcolor: "rgba(255, 235, 238, 0.5)",
                    opacity: 1,
                  },
                }}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>
          ),
        )}
        <Button size="small" startIcon={<AddIcon />} onClick={addAchievement}>
          Add Achievement
        </Button>
      </Box>

      <Box>
        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: "bold" }}>
          Honors & Awards
        </Typography>
        {(edu.honors || []).map((honor: string, honorIndex: number) => (
          <Box
            key={honorIndex}
            sx={{
              display: "flex",
              gap: 1,
              mb: 1,
              "&:hover .item-action-button": {
                opacity: 1,
              },
            }}
          >
            <TextField
              fullWidth
              size="small"
              value={honor}
              onChange={(e) => updateHonor(honorIndex, e.target.value)}
              placeholder="Enter honor or award"
            />
            <IconButton
              size="small"
              onClick={() => removeHonor(honorIndex)}
              className="item-action-button"
              sx={{
                color: "text.secondary",
                opacity: 0.3,
                transition: "all 0.2s ease",
                "&:hover": {
                  color: "error.main",
                  bgcolor: "rgba(255, 235, 238, 0.5)",
                  opacity: 1,
                },
              }}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Box>
        ))}
        <Button size="small" startIcon={<AddIcon />} onClick={addHonor}>
          Add Honor/Award
        </Button>
      </Box>

      {/* Quality Suggestions (writing corrections now shown inline) */}
      {qualitySuggestion && (
        <UnifiedQualitySuggestion
          itemId={edu.id}
          section="education"
          qualitySuggestion={qualitySuggestion}
          writingCorrections={[]}
          onApplyAll={onApplyAll}
          onApplyQuality={onApplyQualitySuggestion}
          onDismissQuality={onDismissQualitySuggestion}
          onApplyWritingCorrection={onApplyWritingCorrection}
          onDismissWritingCorrection={onDismissWritingCorrection}
        />
      )}
    </Box>
  );
};

// Separate component for education display (no hooks - validation passed as props)
const EducationDisplay: React.FC<{
  edu: Education;
  index: number;
  validation: ItemValidationState;
  suggestionsByItemId: Map<string, any>;
  qualitySuggestionsByItemId: Map<string, LowQualityItem>;
  coachingByItemId: Map<string, any>;
  writingCorrectionsByItemId: Map<string, WritingCorrection[]>;
  handleApplySuggestion: (itemId: string, suggestedDescription: string) => void;
  handleDiscardSuggestion: (itemId: string) => void;
  handleApplyQualitySuggestion: (itemId: string, suggestedDescription: string) => void;
  handleDismissQualitySuggestion: (itemId: string) => void;
  handleApplyWritingCorrection: (correction: WritingCorrection) => void;
  handleDismissWritingCorrection: (correction: WritingCorrection) => void;
  handleApplyAll: (itemId: string, qualitySuggested?: string, writingCorrections?: WritingCorrection[]) => void;
}> = ({
  edu,
  index: _index,
  validation,
  suggestionsByItemId,
  qualitySuggestionsByItemId,
  coachingByItemId,
  writingCorrectionsByItemId,
  handleApplySuggestion,
  handleDiscardSuggestion,
  handleApplyQualitySuggestion,
  handleDismissQualitySuggestion,
  handleApplyWritingCorrection,
  handleDismissWritingCorrection,
  handleApplyAll,
}) => {
  const suggestion = suggestionsByItemId.get(edu.id);
  const qualitySuggestion = qualitySuggestionsByItemId.get(edu.id);
  const coachingItem = coachingByItemId.get(edu.id);
  const writingCorrections = writingCorrectionsByItemId.get(edu.id) || [];

  // Extract field-specific corrections using unified hook
  const { fieldCorrectionProps, descriptionCorrection } = useFieldCorrections(
    edu.id,
    writingCorrections,
    [
      { fieldName: 'institution' },
      { fieldName: 'degree' },
      { fieldName: 'location' },
      { fieldName: 'start_date' },
      { fieldName: 'end_date' },
    ],
    (_, parent) => handleApplyWritingCorrection(parent),
    handleDismissWritingCorrection
  );

  return (
    <>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          mb: 0.5,
          pr: 10,
        }}
      >
        <Box sx={{ flex: 1, display: "flex", alignItems: "center", gap: 1 }}>
          <ValidatedDisplay
            validation={validation.degree}
            variant="subtitle1"
            normalColor="#333"
          >
            {edu.degree || "Degree"}
            {edu.field_of_study && ` in ${edu.field_of_study}`}
            {edu.academic_title && ` (${edu.academic_title})`}
          </ValidatedDisplay>
          {/* Display score for all items */}
          {suggestion && (
            <ScoreChip score={suggestion.current_content_score} />
          )}
        </Box>
        <Box sx={{ flexShrink: 0, ml: 2, minWidth: 120 }}>
          <ValidatedDisplay
            validation={{
              hasError: validation.start_date.hasError || validation.end_date.hasError,
              errorMessage: validation.end_date.errorMessage || validation.start_date.errorMessage,
            }}
            variant="body2"
            normalColor="#666"
            iconSize="0.875rem"
            align="flex-end"
          >
            {edu.start_date || "Start date required"} -{" "}
            {!edu.end_date ? "PRESENT" : edu.end_date}
          </ValidatedDisplay>
        </Box>
      </Box>
      {fieldCorrectionProps.degree.correctionImportance !== undefined && fieldCorrectionProps.degree.fieldCorrection && (
        <Box sx={{ mb: 1 }}>
          <InlineFieldCorrection
            fieldCorrection={fieldCorrectionProps.degree.fieldCorrection}
            importance={fieldCorrectionProps.degree.correctionImportance!}
            reasoning={fieldCorrectionProps.degree.correctionReasoning}
            onApply={() => fieldCorrectionProps.degree.onApplyCorrection(fieldCorrectionProps.degree.fieldCorrection!)}
            onDismiss={fieldCorrectionProps.degree.onDismissCorrection}
          />
        </Box>
      )}
      {(fieldCorrectionProps.start_date.correctionImportance !== undefined || fieldCorrectionProps.end_date.correctionImportance !== undefined) && (
        <Box sx={{ mb: 1 }}>
          {fieldCorrectionProps.start_date.correctionImportance !== undefined && fieldCorrectionProps.start_date.fieldCorrection && (
            <InlineFieldCorrection
              fieldCorrection={fieldCorrectionProps.start_date.fieldCorrection}
              importance={fieldCorrectionProps.start_date.correctionImportance!}
              reasoning={fieldCorrectionProps.start_date.correctionReasoning}
              onApply={() => fieldCorrectionProps.start_date.onApplyCorrection(fieldCorrectionProps.start_date.fieldCorrection!)}
              onDismiss={fieldCorrectionProps.start_date.onDismissCorrection}
            />
          )}
          {fieldCorrectionProps.end_date.correctionImportance !== undefined && fieldCorrectionProps.end_date.fieldCorrection && (
            <InlineFieldCorrection
              fieldCorrection={fieldCorrectionProps.end_date.fieldCorrection}
              importance={fieldCorrectionProps.end_date.correctionImportance!}
              reasoning={fieldCorrectionProps.end_date.correctionReasoning}
              onApply={() => fieldCorrectionProps.end_date.onApplyCorrection(fieldCorrectionProps.end_date.fieldCorrection!)}
              onDismiss={fieldCorrectionProps.end_date.onDismissCorrection}
            />
          )}
        </Box>
      )}
      <Box sx={{ mb: 1 }}>
        <ValidatedDisplay
          validation={validation.institution}
          variant="subtitle1"
          normalColor="#1976d2"
          iconSize="0.875rem"
          sx={{ mb: 0 }}
        >
          {edu.institution || "Institution"}
          {edu.location && ` • ${edu.location}`}
        </ValidatedDisplay>
        {(fieldCorrectionProps.institution.correctionImportance !== undefined || fieldCorrectionProps.location.correctionImportance !== undefined) && (
          <Box sx={{ mt: 1 }}>
            {fieldCorrectionProps.institution.correctionImportance !== undefined && fieldCorrectionProps.institution.fieldCorrection && (
              <InlineFieldCorrection
                fieldCorrection={fieldCorrectionProps.institution.fieldCorrection}
                importance={fieldCorrectionProps.institution.correctionImportance!}
                reasoning={fieldCorrectionProps.institution.correctionReasoning}
                onApply={() => fieldCorrectionProps.institution.onApplyCorrection(fieldCorrectionProps.institution.fieldCorrection!)}
                onDismiss={fieldCorrectionProps.institution.onDismissCorrection}
              />
            )}
            {fieldCorrectionProps.location.correctionImportance !== undefined && fieldCorrectionProps.location.fieldCorrection && (
              <InlineFieldCorrection
                fieldCorrection={fieldCorrectionProps.location.fieldCorrection}
                importance={fieldCorrectionProps.location.correctionImportance!}
                reasoning={fieldCorrectionProps.location.correctionReasoning}
                onApply={() => fieldCorrectionProps.location.onApplyCorrection(fieldCorrectionProps.location.fieldCorrection!)}
                onDismiss={fieldCorrectionProps.location.onDismissCorrection}
              />
            )}
          </Box>
        )}
      </Box>
      {edu.gpa && (
        <Typography variant="body2" sx={{ color: "#666", mb: 1 }}>
          GPA: {edu.gpa}
        </Typography>
      )}
      {edu.description && (
        <Box sx={{ mb: 1 }}>
          <MarkdownRenderer content={edu.description} variant="body1" />
          {descriptionCorrection && descriptionCorrection.correction.importance && (
            <InlineFieldCorrection
              htmlDiffCorrection={descriptionCorrection}
              importance={descriptionCorrection.correction.importance}
              reasoning={descriptionCorrection.correction.reasoning}
              onApply={() => handleApplyWritingCorrection(descriptionCorrection.correction)}
              onDismiss={() => handleDismissWritingCorrection(descriptionCorrection.correction)}
            />
          )}
        </Box>
      )}
      {edu.achievements && edu.achievements.length > 0 && (
        <Box sx={{ mb: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: "bold", mb: 0.5 }}>
            Achievements:
          </Typography>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {edu.achievements.map((achievement, idx) => (
              <li key={idx}>
                <MarkdownRenderer content={achievement} variant="body2" />
              </li>
            ))}
          </ul>
        </Box>
      )}
      {edu.honors && edu.honors.length > 0 && (
        <Box sx={{ mb: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: "bold", mb: 0.5 }}>
            Honors & Awards:
          </Typography>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {edu.honors.map((honor, idx) => (
              <li key={idx}>
                <MarkdownRenderer content={honor} variant="body2" />
              </li>
            ))}
          </ul>
        </Box>
      )}
      {/* AI Suggestion - only show full suggestion UI if suggested text exists */}
      {suggestion && suggestion.suggested && (
        <ItemDescriptionSuggestion
          suggestion={suggestion}
          onApply={() => handleApplySuggestion(edu.id, suggestion.suggested!)}
          onDiscard={() => handleDiscardSuggestion(edu.id)}
        />
      )}

      {/* Unified Quality Suggestion (combines quality suggestion and writing corrections) */}
      {(qualitySuggestion || writingCorrections.length > 0) && (
        <UnifiedQualitySuggestion
          itemId={edu.id}
          section="education"
          qualitySuggestion={qualitySuggestion}
          writingCorrections={[]}
          onApplyAll={handleApplyAll}
          onApplyQuality={qualitySuggestion ? (suggested) => handleApplyQualitySuggestion(edu.id, suggested) : undefined}
          onDismissQuality={qualitySuggestion ? () => handleDismissQualitySuggestion(edu.id) : undefined}
          onApplyWritingCorrection={handleApplyWritingCorrection}
          onDismissWritingCorrection={handleDismissWritingCorrection}
        />
      )}

      {/* Coaching Questions */}
      {coachingItem && (
        <CoachingQuestionsPanel coachingItem={coachingItem} />
      )}
    </>
  );
};

const EducationSection: React.FC<SectionProps & { sectionType?: string }> = ({
  data,
  onUpdate,
  onSave,
  isEditing,
  onEdit,
  onClose,
  onUnsavedChanges,
  registerIndividualItemEditing,
  unregisterIndividualItemEditing,
  requestIndividualItemCancel,
  title = "Education",
  onTitleSave,
  cvId,
  sectionType,
}) => {
  // Get quality analysis from store (independent of jobs)
  const qualityAnalysis = useValidatedQualityAnalysis(cvId || "");

  const { dismissAllEducationSuggestions } = useAISuggestionsStore();
  const { dismissWritingCorrection } = useCVQualityStore();
  const { showSuccess } = useNotifications();

  // Use section suggestions hook
  const {
    suggestionsByItemId,
    qualitySuggestionsByItemId,
    coachingByItemId,
    writingCorrectionsByItemId,
    visibleSuggestions,
  } = useSectionSuggestions(cvId || "", 'education', qualityAnalysis);

  // Use section handlers hook
  const {
    handleApplySuggestion,
    handleDiscardSuggestion,
    handleApplyQualitySuggestion,
    handleDismissQualitySuggestion,
    handleApplyWritingCorrection,
    handleApplyAll,
  } = useSectionHandlers<Education>(
    'education',
    cvId,
    data as Education[],
    onUpdate,
    onSave
  );

  const createNewEducation = (): Education => ({
    id: generateSectionId("education"),
    institution: "",
    degree: "",
    field_of_study: "",
    academic_title: "",
    location: "",
    start_date: "",
    end_date: "",
    gpa: "",
    description: "",
    achievements: [],
    honors: [],
  });

  const renderEducationForm = (
    edu: Education,
    index: number,
    updateEducation: (field: keyof Education, value: any) => void,
    onSave?: () => void,
  ) => {
    // Look up quality suggestions for this item
    const qualitySuggestion = qualitySuggestionsByItemId.get(edu.id);
    const writingCorrections = writingCorrectionsByItemId.get(edu.id) || [];

    // Use form handlers hook
    const {
      handleApplyQualitySuggestionForm,
      handleDismissQualitySuggestionForm,
      handleApplyWritingCorrectionForm,
      handleDismissWritingCorrectionForm,
      handleApplyAllForm,
      handleApplySingleFieldCorrectionForm,
    } = useFormHandlers<Education>(
      'education',
      edu.id,
      updateEducation,
      onSave,
      handleApplyWritingCorrection
    );

    return (
      <EducationForm
        edu={edu}
        index={index}
        updateEducation={updateEducation}
        onSave={onSave}
        qualitySuggestion={qualitySuggestion}
        writingCorrections={writingCorrections}
        onApplyQualitySuggestion={handleApplyQualitySuggestionForm}
        onDismissQualitySuggestion={handleDismissQualitySuggestionForm}
        onApplyWritingCorrection={handleApplyWritingCorrectionForm}
        onDismissWritingCorrection={handleDismissWritingCorrectionForm}
        onApplySingleFieldCorrection={handleApplySingleFieldCorrectionForm}
        onApplyAll={handleApplyAllForm}
      />
    );
  };

  // Handle discarding all suggestions
  const handleDiscardAll = useCallback(async () => {
    await dismissAllEducationSuggestions();
    showSuccess("All suggestions discarded");
  }, [dismissAllEducationSuggestions, showSuccess]);

  const renderEducationDisplay = useCallback(
    (edu: Education, index: number) => {
      // Get all validation states at once using useItemValidation hook
      const EducationDisplayWrapper: React.FC<{ edu: Education; index: number }> = ({ edu, index }) => {
        const validation = useItemValidation('education', index, ['degree', 'institution', 'start_date', 'end_date']);
        return (
          <EducationDisplay
            edu={edu}
            index={index}
            validation={validation}
            suggestionsByItemId={suggestionsByItemId}
            qualitySuggestionsByItemId={qualitySuggestionsByItemId}
            coachingByItemId={coachingByItemId}
            writingCorrectionsByItemId={writingCorrectionsByItemId}
            handleApplySuggestion={handleApplySuggestion}
            handleDiscardSuggestion={handleDiscardSuggestion}
            handleApplyQualitySuggestion={handleApplyQualitySuggestion}
            handleDismissQualitySuggestion={handleDismissQualitySuggestion}
            handleApplyWritingCorrection={handleApplyWritingCorrection}
            handleDismissWritingCorrection={async (correction: WritingCorrection) => {
              await dismissWritingCorrection(correction.item_id, correction.section);
              showSuccess("Writing correction dismissed");
            }}
            handleApplyAll={handleApplyAll}
          />
        );
      };

      return <EducationDisplayWrapper edu={edu} index={index} />;
    },
    [
      suggestionsByItemId,
      qualitySuggestionsByItemId,
      coachingByItemId,
      writingCorrectionsByItemId,
      handleApplySuggestion,
      handleDiscardSuggestion,
      handleApplyQualitySuggestion,
      handleDismissQualitySuggestion,
      handleApplyWritingCorrection,
      handleApplyAll,
      dismissWritingCorrection,
      showSuccess,
    ]
  );

  return (
    <>
      <IndividualItemSection
        sectionType={sectionType || 'education'}
        data={data as Education[]}
        onUpdate={onUpdate}
        onSave={onSave}
        isEditing={isEditing}
        onEdit={onEdit}
        onClose={onClose}
        onUnsavedChanges={onUnsavedChanges}
        registerIndividualItemEditing={registerIndividualItemEditing as any}
        unregisterIndividualItemEditing={unregisterIndividualItemEditing as any}
        requestIndividualItemCancel={requestIndividualItemCancel as any}
        title={title}
        onTitleSave={onTitleSave}
        emptyMessage="Click the + button to add your first education entry"
        createNewItem={createNewEducation}
        requiredFields={["degree", "institution", "start_date"]}
        renderItemForm={renderEducationForm}
        renderItemDisplay={renderEducationDisplay}
        autoSaveMessage="Education"
      sortOptions={[
        { field: "start_date", label: "Start Date" },
        { field: "end_date", label: "End Date" },
      ]}
      cvId={cvId}
      getItemTitle={(item) => {
        if (item.institution && item.degree) {
          return `${item.institution} - ${item.degree}`;
        }
        return item.institution || item.degree || "";
      }}
    />

      {/* Discard All Suggestions Dialog */}
      <DiscardAllDialog
        visibleCount={visibleSuggestions.length}
        isEditing={isEditing}
        onDiscardAll={handleDiscardAll}
      />
    </>
  );
};

// Memoize to prevent unnecessary re-renders of education items
export default React.memo(EducationSection, (prevProps, nextProps) => {
  return (
    prevProps.data === nextProps.data &&
    prevProps.isEditing === nextProps.isEditing
  );
});
