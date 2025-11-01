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
} from "@mui/material";
import { Add as AddIcon, Delete as DeleteIcon } from "@mui/icons-material";
import { SectionProps } from "../../../types";
import IndividualItemSection from "../core/IndividualItemSection";
import { FormField, DateFieldComponent } from "../core/formUtils";
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

interface Education {
  id: string;
  institution: string;
  degree: string;
  field_of_study: string;
  academic_degree?: string;
  location: string;
  start_date: string;
  end_date: string;
  gpa?: string;
  description?: string;
  achievements: string[];
  honors: string[];
}

const EducationSection: React.FC<SectionProps> = ({
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

  // Map suggestions by item ID for quick lookup
  const suggestionsByItemId = useMemo(() => {
    const map = new Map();
    educationSuggestions.forEach((suggestion) => {
      map.set(suggestion.id, suggestion);
    });
    return map;
  }, [educationSuggestions]);

  const hasSuggestions = educationSuggestions.length > 0;

  const createNewEducation = (): Education => ({
    id: generateSectionId("education"),
    institution: "",
    degree: "",
    field_of_study: "",
    academic_degree: "",
    location: "",
    start_date: "",
    end_date: "",
    gpa: "",
    description: "",
    achievements: [],
    honors: [],
  });

  // eslint-disable-next-line no-unused-vars
  const renderEducationForm = (
    edu: Education,
    _index: number,
    updateEducation: (_field: keyof Education, _value: any) => void,
    onSave?: () => void,
  ) => {
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
          error={!edu.degree?.trim()}
          helperText={!edu.degree?.trim() ? "Degree is required" : ""}
        />
        <FormField
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
          value={edu.academic_degree || ""}
          onChange={(value) => updateEducation("academic_degree", value)}
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
          <DateFieldComponent
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
          <DateFieldComponent
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
          value={edu.gpa}
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
          }}
          value={edu.description}
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

  // eslint-disable-next-line no-unused-vars
  const renderEducationDisplay = useCallback(
    (edu: Education, _index: number) => {
      const suggestion = suggestionsByItemId.get(edu.id);

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
            <Typography
              variant="subtitle1"
              sx={{ fontWeight: 600, color: "#333" }}
            >
              {edu.degree || "Degree"}
              {edu.field_of_study && ` in ${edu.field_of_study}`}
              {edu.academic_degree && ` (${edu.academic_degree})`}
            </Typography>
            <Typography
              variant="body2"
              sx={{ color: "#666", flexShrink: 0, ml: 2 }}
            >
              {edu.start_date || "Start date required"} -{" "}
              {edu.end_date || "PRESENT"}
            </Typography>
          </Box>
          <Typography variant="subtitle1" sx={{ color: "#1976d2", mb: 1 }}>
            {edu.institution || "Institution"}
            {edu.location && ` • ${edu.location}`}
          </Typography>
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
              <ul style={{ margin: 0, paddingLeft: "20px" }}>
                {edu.achievements.map(
                  (achievement: string, achievementIndex: number) => (
                    <li key={achievementIndex}>
                      <Typography variant="body2" sx={{ color: "#666" }}>
                        {achievement}
                      </Typography>
                    </li>
                  ),
                )}
              </ul>
            </Box>
          )}
          {edu.honors && edu.honors.length > 0 && (
            <Box sx={{ mt: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: "bold", mb: 0.5 }}>
                Honors & Awards:
              </Typography>
              <ul style={{ margin: 0, paddingLeft: "20px" }}>
                {edu.honors.map((honor: string, honorIndex: number) => (
                  <li key={honorIndex}>
                    <Typography variant="body2" sx={{ color: "#666" }}>
                      {honor}
                    </Typography>
                  </li>
                ))}
              </ul>
            </Box>
          )}
          {/* AI Suggestion */}
          {suggestion && (
            <ItemDescriptionSuggestion
              suggestion={suggestion}
              onApply={() =>
                handleApplySuggestion(edu.id, suggestion.suggested)
              }
              onDiscard={() => handleDiscardSuggestion(edu.id)}
            />
          )}
        </>
      );
    },
    [suggestionsByItemId, handleApplySuggestion, handleDiscardSuggestion]
  );

  return (
    <>
      <IndividualItemSection
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
            Discard All Suggestions ({educationSuggestions.length})
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
            Are you sure you want to discard all {educationSuggestions.length}{" "}
            AI suggestions for this section? This action cannot be undone.
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
