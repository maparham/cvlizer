import React, { useCallback, useMemo } from "react";
import {
  Box,
  TextField,
  Button,
  Typography,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  Chip,
  Tooltip,
} from "@mui/material";
import { Add as AddIcon, Delete as DeleteIcon } from "@mui/icons-material";
import { SectionProps } from "../../../types";
import IndividualItemSection from "../core/IndividualItemSection";
import { FormField } from "../core/formUtils";
import { ValidatedFormField, ValidatedDateField, ValidatedDisplay, useItemValidation } from "../core/validatedFields";
import LocationAutocomplete from "../ui/LocationAutocomplete";
import DegreeAutocomplete from "../ui/DegreeAutocomplete";
import FieldOfStudyAutocomplete from "../ui/FieldOfStudyAutocomplete";
import AcademicDegreeAutocomplete from "../ui/AcademicDegreeAutocomplete";
import { generateSectionId } from "../../../utils/idGenerator";
import MarkdownRenderer from "../../common/MarkdownRenderer";
import ItemDescriptionSuggestion from "../ai/ItemDescriptionSuggestion";
import {
  useAISuggestionsStore,
  useValidatedSuggestions,
} from "../../../stores/aiSuggestionsStore";
import { useNotifications } from "../../../packages/notifications";
import { useFieldValidation } from "../../../hooks/useFieldValidation";

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
}> = ({ edu, index, updateEducation, onSave }) => {
  // Get validation errors for degree (used by DegreeAutocomplete)
  const degreeValidation = useFieldValidation('education', index, 'degree');

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
    </Box>
  );
};

// Separate component for education display (no hooks - validation passed as props)
const EducationDisplay: React.FC<{
  edu: Education;
  index: number;
  validation: {
    institution: { hasError: boolean; errorMessage?: string };
    degree: { hasError: boolean; errorMessage?: string };
    start_date: { hasError: boolean; errorMessage?: string };
    end_date: { hasError: boolean; errorMessage?: string };
  };
  suggestionsByItemId: Map<string, any>;
  handleApplySuggestion: (itemId: string, suggestedDescription: string) => void;
  handleDiscardSuggestion: (itemId: string) => void;
}> = ({ edu, index: _index, validation, suggestionsByItemId, handleApplySuggestion, handleDiscardSuggestion }) => {
  const suggestion = suggestionsByItemId.get(edu.id);

  // Helper function to get score color
  const getContentScoreColor = (score: number): "success" | "warning" | "error" => {
    if (score >= 80) return "success";
    if (score >= 60) return "warning";
    return "error";
  };

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
            <Tooltip
              title="Quality score (0-100) based on how well the story is told and confidence of presentation"
            >
              <Chip
                label={`${suggestion.current_content_score}/100`}
                color={getContentScoreColor(suggestion.current_content_score)}
                size="small"
                variant="filled"
              />
            </Tooltip>
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
      </Box>
      {edu.gpa && (
        <Typography variant="body2" sx={{ color: "#666", mb: 1 }}>
          GPA: {edu.gpa}
        </Typography>
      )}
      {edu.description && (
        <Box sx={{ mb: 1 }}>
          <MarkdownRenderer content={edu.description} variant="body1" />
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
  // Get AI suggestions from store
  const allSuggestions = useValidatedSuggestions(cvId || "");
  const { dismissEducationSuggestion, dismissAllEducationSuggestions } =
    useAISuggestionsStore();
  const { showSuccess } = useNotifications();
  const [discardAllDialogOpen, setDiscardAllDialogOpen] = React.useState(false);

  // Get education suggestions
  const educationSuggestions = useMemo(() => {
    return allSuggestions?.education || [];
  }, [allSuggestions]);

  // Filter to only visible suggestions (those with suggested text)
  const visibleSuggestions = useMemo(() => {
    return educationSuggestions.filter((s) => s.suggested);
  }, [educationSuggestions]);

  // Map suggestions by item ID for quick lookup
  const suggestionsByItemId = useMemo(() => {
    const map = new Map();
    educationSuggestions.forEach((suggestion) => {
      map.set(suggestion.id, suggestion);
    });
    return map;
  }, [educationSuggestions]);

  const hasSuggestions = visibleSuggestions.length > 0;

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
    return (
      <EducationForm
        edu={edu}
        index={index}
        updateEducation={updateEducation}
        onSave={onSave}
      />
    );
  };

  // Handle applying a suggestion
  const handleApplySuggestion = useCallback(
    (itemId: string, suggestedDescription: string) => {
      const items = (data as Education[]) || [];
      const itemIndex = items.findIndex((item) => item.id === itemId);

      if (itemIndex === -1) {
        console.error("Item not found for suggestion application:", itemId);
        return;
      }

      const updatedItems = [...items];
      updatedItems[itemIndex] = {
        ...updatedItems[itemIndex],
        description: suggestedDescription,
      };

      onUpdate(updatedItems);
      onSave?.(updatedItems, "Education description updated");

      // Dismiss the suggestion
      dismissEducationSuggestion(itemId);
      showSuccess("Suggestion applied successfully");
    },
    [data, onUpdate, onSave, dismissEducationSuggestion, showSuccess]
  );

  // Handle discarding a suggestion
  const handleDiscardSuggestion = useCallback(
    (itemId: string) => {
      dismissEducationSuggestion(itemId);
      showSuccess("Suggestion discarded");
    },
    [dismissEducationSuggestion, showSuccess]
  );

  // Handle discarding all suggestions
  const handleDiscardAll = useCallback(async () => {
    await dismissAllEducationSuggestions();
    setDiscardAllDialogOpen(false);
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
            handleApplySuggestion={handleApplySuggestion}
            handleDiscardSuggestion={handleDiscardSuggestion}
          />
        );
      };

      return <EducationDisplayWrapper edu={edu} index={index} />;
    },
    [suggestionsByItemId, handleApplySuggestion, handleDiscardSuggestion]
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

      {/* Discard All Suggestions Button - shown at bottom of section */}
      {hasSuggestions && !isEditing && (
        <Box sx={{ mt: 2, display: "flex", justifyContent: "flex-end" }}>
          <Button
            variant="outlined"
            size="small"
            onClick={() => setDiscardAllDialogOpen(true)}
            sx={{
              textTransform: "none",
              borderColor: "#f44336",
              color: "#f44336",
              "&:hover": {
                borderColor: "#d32f2f",
                backgroundColor: "#ffebee",
              },
            }}
          >
            Discard All Suggestions ({visibleSuggestions.length})
          </Button>
        </Box>
      )}

      {/* Discard All Confirmation Dialog */}
      <Dialog
        open={discardAllDialogOpen}
        onClose={() => setDiscardAllDialogOpen(false)}
      >
        <DialogTitle>Discard All Suggestions?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Discard all {visibleSuggestions.length} AI suggestions for this section?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDiscardAllDialogOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button onClick={handleDiscardAll} color="error" variant="contained">
            Discard All
          </Button>
        </DialogActions>
      </Dialog>
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
