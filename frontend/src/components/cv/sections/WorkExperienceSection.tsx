/**
 * Work Experience Section Component
 *
 * This module manages the work experience section of a CV including:
 * - Multiple work experience entries with individual editing
 * - Job position and location autocomplete functionality
 * - Date range management with current job handling
 * - Achievements and technologies tracking
 * - Add, edit, delete, and reorder functionality
 * - AI-generated description improvement suggestions
 */
import React, { useCallback, useMemo } from "react";
import { Box, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions, DialogContentText } from "@mui/material";
import { SectionProps } from "../../../types";
import IndividualItemSection from "../core/IndividualItemSection";
import { FormField, DateFieldComponent, ValidatedFieldDisplay } from "../core/formUtils";
import LocationAutocomplete from "../ui/LocationAutocomplete";
import JobPositionAutocomplete from "../ui/JobPositionAutocomplete";
import { generateSectionId } from "../../../utils/idGenerator";
import MarkdownRenderer from "../../common/MarkdownRenderer";
import ItemDescriptionSuggestion from "../ai/ItemDescriptionSuggestion";
import { useAISuggestionsStore, useValidatedSuggestions } from "../../../stores/aiSuggestionsStore";
import { useNotifications } from "../../../packages/notifications";
import { useFieldValidation } from "../../../hooks/useFieldValidation";

interface WorkExperience {
  id: string;
  company: string;
  position: string;
  location: string;
  start_date: string;
  end_date: string;
  current: boolean;
  description: string;
  achievements: string[];
  technologies: string[];
}

// Separate component for work experience form to allow using hooks
const WorkExperienceForm: React.FC<{
  exp: WorkExperience;
  index: number;
  updateExperience: (field: keyof WorkExperience, value: any) => void;
  onSave?: () => void;
}> = ({ exp, index, updateExperience, onSave }) => {
  // Get validation errors for this work experience item
  const positionValidation = useFieldValidation('work_experience', index, 'position');
  const companyValidation = useFieldValidation('work_experience', index, 'company');
  const startDateValidation = useFieldValidation('work_experience', index, 'start_date');

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <JobPositionAutocomplete
        value={exp.position || ""}
        onChange={(value) => updateExperience("position", value)}
        onSave={onSave}
        error={positionValidation.hasError}
        helperText={positionValidation.errorMessage}
        placeholder="e.g., Software Engineer"
      />
      <FormField
        config={{
          name: "company",
          label: "Company",
          placeholder: "e.g., Tech Company Inc.",
          required: true,
        }}
        value={exp.company}
        onChange={(value) => updateExperience("company", value)}
        onSave={onSave}
        error={companyValidation.hasError}
        helperText={companyValidation.errorMessage}
      />
      <LocationAutocomplete
        value={exp.location || ""}
        onChange={(value) => updateExperience("location", value)}
        onSave={onSave}
        placeholder="e.g., San Francisco, CA"
      />
      <Box sx={{ display: "flex", gap: 2 }}>
        <DateFieldComponent
          config={{
            name: "start_date",
            label: "Start Date",
            required: true,
          }}
          value={exp.start_date}
          onChange={(value) => updateExperience("start_date", value)}
          onSave={onSave}
          sx={{ flex: 1 }}
          error={startDateValidation.hasError}
          helperText={startDateValidation.errorMessage}
        />
        <DateFieldComponent
          config={{
            name: "end_date",
            label: "End Date",
            minDate: exp.start_date || undefined, // End date must be after start date
          }}
          value={exp.end_date}
          onChange={(value) => updateExperience("end_date", value)}
          onSave={onSave}
          sx={{ flex: 1 }}
        />
      </Box>
      <FormField
        config={{
          name: "description",
          label: "Description",
          placeholder: "Describe your role and achievements...",
          multiline: true,
          rows: 3,
        }}
        value={exp.description}
        onChange={(value) => updateExperience("description", value)}
        onSave={onSave}
      />
    </Box>
  );
};

// Separate component for work experience display to allow using hooks
const WorkExperienceDisplay: React.FC<{
  exp: WorkExperience;
  index: number;
  suggestionsByItemId: Map<string, any>;
  handleApplySuggestion: (itemId: string, suggestedDescription: string) => void;
  handleDiscardSuggestion: (itemId: string) => void;
}> = ({ exp, index, suggestionsByItemId, handleApplySuggestion, handleDiscardSuggestion }) => {
  const suggestion = suggestionsByItemId.get(exp.id);

  // Get validation errors for this work experience item
  const positionValidation = useFieldValidation('work_experience', index, 'position');
  const companyValidation = useFieldValidation('work_experience', index, 'company');
  const startDateValidation = useFieldValidation('work_experience', index, 'start_date');

  return (
    <>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 0.5, pr: 10 }}>
        <Box sx={{ flex: 1 }}>
          <ValidatedFieldDisplay
            validation={positionValidation}
            variant="subtitle1"
            normalColor="#333"
          >
            {exp.position || "Position Title"}
          </ValidatedFieldDisplay>
        </Box>
        <Box sx={{ flexShrink: 0, ml: 2, minWidth: 120 }}>
          <ValidatedFieldDisplay
            validation={startDateValidation}
            variant="body2"
            normalColor="#666"
            iconSize="0.875rem"
            align="flex-end"
          >
            {exp.start_date} - {exp.current ? "PRESENT" : exp.end_date || "PRESENT"}
          </ValidatedFieldDisplay>
        </Box>
      </Box>
      <Box sx={{ mb: 1 }}>
        <ValidatedFieldDisplay
          validation={companyValidation}
          variant="subtitle1"
          normalColor="#1976d2"
          iconSize="0.875rem"
          sx={{ mb: 0 }}
        >
          {exp.company || "Company Name"}
          {exp.location && ` • ${exp.location}`}
        </ValidatedFieldDisplay>
      </Box>
      {exp.description ? (
        <Box sx={{ mb: 1 }}>
          <MarkdownRenderer content={exp.description} variant="body1" />
        </Box>
      ) : (
        <Typography variant="body1" sx={{ lineHeight: 1.6, color: "text.secondary" }}>
          Job description...
        </Typography>
      )}
      {/* AI Suggestion */}
      {suggestion && (
        <ItemDescriptionSuggestion
          suggestion={suggestion}
          onApply={() => handleApplySuggestion(exp.id, suggestion.suggested)}
          onDiscard={() => handleDiscardSuggestion(exp.id)}
        />
      )}
    </>
  );
};

const WorkExperienceSection: React.FC<SectionProps> = ({
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
  title = "Work Experience",
  onTitleSave,
  cvId,
}) => {
  // Get AI suggestions from store
  const allSuggestions = useValidatedSuggestions(cvId || "");
  const {
    dismissWorkExperienceSuggestion,
    dismissAllWorkExperienceSuggestions,
  } = useAISuggestionsStore();
  const { showSuccess } = useNotifications();
  const [discardAllDialogOpen, setDiscardAllDialogOpen] = React.useState(false);

  // Get work experience suggestions
  const workExperienceSuggestions = useMemo(() => {
    return allSuggestions?.work_experience || [];
  }, [allSuggestions]);

  // Map suggestions by item ID for quick lookup
  const suggestionsByItemId = useMemo(() => {
    const map = new Map();
    workExperienceSuggestions.forEach((suggestion) => {
      map.set(suggestion.id, suggestion);
    });
    return map;
  }, [workExperienceSuggestions]);

  const hasSuggestions = workExperienceSuggestions.length > 0;

  const createNewExperience = (): WorkExperience => ({
    id: generateSectionId("work_experience"),
    company: "",
    position: "",
    location: "",
    start_date: "",
    end_date: "",
    current: false,
    description: "",
    achievements: [],
    technologies: [],
  });

  const renderExperienceForm = (
    exp: WorkExperience,
    index: number,
    updateExperience: (field: keyof WorkExperience, value: any) => void,
    onSave?: () => void,
  ) => {
    return (
      <WorkExperienceForm
        exp={exp}
        index={index}
        updateExperience={updateExperience}
        onSave={onSave}
      />
    );
  };

  // Handle applying a suggestion
  const handleApplySuggestion = useCallback(
    (itemId: string, suggestedDescription: string) => {
      const items = (data as WorkExperience[]) || [];
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
      onSave?.(updatedItems, "Work experience description updated");

      // Dismiss the suggestion
      dismissWorkExperienceSuggestion(itemId);
      showSuccess("Suggestion applied successfully");
    },
    [data, onUpdate, onSave, dismissWorkExperienceSuggestion, showSuccess]
  );

  // Handle discarding a suggestion
  const handleDiscardSuggestion = useCallback(
    (itemId: string) => {
      dismissWorkExperienceSuggestion(itemId);
      showSuccess("Suggestion discarded");
    },
    [dismissWorkExperienceSuggestion, showSuccess]
  );

  // Handle discarding all suggestions
  const handleDiscardAll = useCallback(async () => {
    await dismissAllWorkExperienceSuggestions();
    setDiscardAllDialogOpen(false);
    showSuccess("All suggestions discarded");
  }, [dismissAllWorkExperienceSuggestions, showSuccess]);

  const renderExperienceDisplay = useCallback(
    (exp: WorkExperience, index: number) => {
      return (
        <WorkExperienceDisplay
          exp={exp}
          index={index}
          suggestionsByItemId={suggestionsByItemId}
          handleApplySuggestion={handleApplySuggestion}
          handleDiscardSuggestion={handleDiscardSuggestion}
        />
      );
    },
    [suggestionsByItemId, handleApplySuggestion, handleDiscardSuggestion]
  );

  return (
    <>
      <IndividualItemSection
        data={data as WorkExperience[]}
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
        emptyMessage="Click the + button to add your first work experience"
        createNewItem={createNewExperience}
        requiredFields={["position", "company", "start_date"]}
        renderItemForm={renderExperienceForm}
        renderItemDisplay={renderExperienceDisplay}
        autoSaveMessage="Work experience"
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
            Discard All Suggestions ({workExperienceSuggestions.length})
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
            Are you sure you want to discard all {workExperienceSuggestions.length} AI suggestions for this section?
            This action cannot be undone.
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

// Memoize to prevent unnecessary re-renders of work experience items
export default React.memo(WorkExperienceSection, (prevProps, nextProps) => {
  return (
    prevProps.data === nextProps.data &&
    prevProps.isEditing === nextProps.isEditing
  );
});
