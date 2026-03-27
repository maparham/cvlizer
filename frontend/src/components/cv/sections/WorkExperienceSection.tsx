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
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { SectionProps } from "../../../types";
import IndividualItemSection from "../core/IndividualItemSection";
import { FormField } from "../core/formUtils";
import { ValidatedFormField, ValidatedDateField, ValidatedDisplay, useItemValidation, type ItemValidationState } from "../core/validatedFields";
import LocationAutocomplete from "../ui/LocationAutocomplete";
import JobPositionAutocomplete from "../ui/JobPositionAutocomplete";
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
import { useItemDescriptionDraftHistory } from "./hooks/useItemDescriptionDraftHistory";
import { useSectionSuggestions } from "./hooks/useSectionSuggestions";
import { useSectionHandlers } from "./hooks/useSectionHandlers";
import { useFormHandlers } from "./hooks/useFormHandlers";
import { createTrackedFieldUpdater } from "./hooks/createTrackedFieldUpdater";
import { buildQualitySuggestionId } from "../../../utils/qualitySuggestionIds";
import { ScoreChip } from "./common/ScoreChip";
import { DiscardAllDialog } from "./common/DiscardAllDialog";

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
  qualitySuggestion?: LowQualityItem;
  writingCorrections?: WritingCorrection[];
  onApplyQualitySuggestion?: (suggested: string) => void;
  onDismissQualitySuggestion?: () => void;
  onApplyWritingCorrection?: (correction: WritingCorrection) => void;
  onDismissWritingCorrection?: (correction: WritingCorrection) => void;
  onApplySingleFieldCorrection?: (fieldCorrection: FieldCorrection, parentCorrection: WritingCorrection) => void;
  onApplyAll?: (itemId: string, qualitySuggested?: string, writingCorrections?: WritingCorrection[]) => void;
}> = ({
  exp,
  index,
  updateExperience,
  onSave,
  qualitySuggestion,
  writingCorrections = [],
  onApplyQualitySuggestion,
  onDismissQualitySuggestion,
  onApplyWritingCorrection,
  onDismissWritingCorrection,
  onApplySingleFieldCorrection,
  onApplyAll,
}) => {
  // Get validation errors for position (used by JobPositionAutocomplete)
  const positionValidation = useFieldValidation('work_experience', index, 'position');

  // Extract field corrections using unified hook
  const { fieldCorrectionProps, descriptionCorrection } = useFieldCorrections(
    exp.id,
    writingCorrections,
    [
      { fieldName: 'company' },
      { fieldName: 'position' },
      { fieldName: 'location' },
      { fieldName: 'start_date' },
      { fieldName: 'end_date' },
      { fieldName: 'achievements' },
    ],
    onApplySingleFieldCorrection!,
    onDismissWritingCorrection!
  );

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <JobPositionAutocomplete
        value={exp.position || ""}
        onChange={(value) => updateExperience("position", value)}
        onSave={onSave}
        error={positionValidation.hasError}
        helperText={positionValidation.errorMessage}
        placeholder="e.g., Software Engineer"
        {...fieldCorrectionProps.position}
      />
      <ValidatedFormField
        section="work_experience"
        field="company"
        index={index}
        config={{
          name: "company",
          label: "Company",
          placeholder: "e.g., Tech Company Inc.",
          required: true,
        }}
        value={exp.company}
        onChange={(value) => updateExperience("company", value)}
        onSave={onSave}
        {...fieldCorrectionProps.company}
      />
      <LocationAutocomplete
        value={exp.location || ""}
        onChange={(value) => updateExperience("location", value)}
        onSave={onSave}
        placeholder="e.g., San Francisco, CA"
        {...fieldCorrectionProps.location}
      />
      <Box sx={{ display: "flex", gap: 2 }}>
        <ValidatedDateField
          section="work_experience"
          field="start_date"
          index={index}
          config={{
            name: "start_date",
            label: "Start Date",
            required: true,
          }}
          value={exp.start_date}
          onChange={(value) => updateExperience("start_date", value)}
          onSave={onSave}
          sx={{ flex: 1 }}
          {...fieldCorrectionProps.start_date}
        />
        <ValidatedDateField
          section="work_experience"
          field="end_date"
          index={index}
          config={{
            name: "end_date",
            label: "End Date",
            minDate: exp.start_date || undefined, // End date must be after start date
          }}
          value={exp.end_date}
          onChange={(value) => updateExperience("end_date", value)}
          onSave={onSave}
          sx={{ flex: 1 }}
          {...fieldCorrectionProps.end_date}
        />
      </Box>
      <FormField
        config={{
          name: "description",
          label: "Description",
          placeholder: "Describe your role and achievements...",
          multiline: true,
          rows: 3,
          useMarkdownEditor: true,
        }}
        value={exp.description}
        onChange={(value) => updateExperience("description", value)}
        onSave={onSave}
        htmlDiffCorrection={descriptionCorrection}
        onApplyCorrection={onApplyWritingCorrection}
        onDismissCorrection={() => descriptionCorrection && onDismissWritingCorrection?.(descriptionCorrection.correction)}
      />

      {/* Quality Suggestions (writing corrections now shown inline) */}
      {qualitySuggestion && (
        <UnifiedQualitySuggestion
          itemId={exp.id}
          section="work_experience"
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

// Separate component for work experience display (no hooks - validation passed as props)
const WorkExperienceDisplay: React.FC<{
  exp: WorkExperience;
  index: number;
  validation: ItemValidationState;
  suggestionsByItemId: Map<string, any>;
  qualitySuggestionsByItemId: Map<string, LowQualityItem>;
  coachingByItemId: Map<string, any>;
  writingCorrectionsByItemId: Map<string, WritingCorrection[]>;
  handleApplySuggestion: (itemId: string, suggestedDescription: string) => void | Promise<void>;
  handleDiscardSuggestion: (itemId: string) => void;
  handleApplyQualitySuggestion: (itemId: string, suggestedDescription: string) => void | Promise<void>;
  handleDismissQualitySuggestion: (itemId: string) => void;
  handleApplyWritingCorrection: (correction: WritingCorrection, draftIndex: number) => void | Promise<void>;
  handleDismissWritingCorrection: (correction: WritingCorrection) => void;
  handleApplyAll: (itemId: string, qualitySuggested?: string, writingCorrections?: WritingCorrection[]) => void | Promise<void>;
  cvId?: string;
}> = ({
  exp,
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
  cvId,
}) => {
  const suggestion = suggestionsByItemId.get(exp.id);
  const qualitySuggestion = qualitySuggestionsByItemId.get(exp.id);
  const coachingItem = coachingByItemId.get(exp.id);
  const writingCorrections = writingCorrectionsByItemId.get(exp.id) || [];

  // Extract field-specific corrections using unified hook
  const { fieldCorrectionProps, descriptionCorrection: rawDescriptionCorrection } = useFieldCorrections(
    exp.id,
    writingCorrections,
    [
      { fieldName: 'company' },
      { fieldName: 'position' },
      { fieldName: 'location' },
      { fieldName: 'start_date' },
      { fieldName: 'end_date' },
      { fieldName: 'achievements' },
    ],
    (_, parent) => handleApplyWritingCorrection(parent, 0),
    handleDismissWritingCorrection
  );

  const draftHistory = useItemDescriptionDraftHistory({
    cvId,
    itemId: exp.id,
    section: "work_experience",
    descriptionCorrection: rawDescriptionCorrection,
    formFieldName: "description",
  });
  const descriptionCorrection = draftHistory.descriptionCorrection;

  return (
    <>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 0.5, pr: 10 }}>
        <Box sx={{ flex: 1, display: "flex", alignItems: "center", gap: 1 }}>
          <ValidatedDisplay
            validation={validation.position}
            variant="subtitle1"
            normalColor="#333"
          >
            {exp.position || "Position Title"}
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
            {exp.start_date} - {exp.current || !exp.end_date ? "PRESENT" : exp.end_date}
          </ValidatedDisplay>
        </Box>
      </Box>
      {fieldCorrectionProps.position.correctionImportance !== undefined && fieldCorrectionProps.position.fieldCorrection && (
        <Box sx={{ mb: 1 }}>
          <InlineFieldCorrection
            fieldCorrection={fieldCorrectionProps.position.fieldCorrection}
            importance={fieldCorrectionProps.position.correctionImportance!}
            reasoning={fieldCorrectionProps.position.correctionReasoning}
            onApply={() => fieldCorrectionProps.position.onApplyCorrection(fieldCorrectionProps.position.fieldCorrection!)}
            onDismiss={fieldCorrectionProps.position.onDismissCorrection}
            suggestionCardId={buildQualitySuggestionId("work_experience", exp.id, `work_experience[${exp.id}].position`)}
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
              suggestionCardId={buildQualitySuggestionId("work_experience", exp.id, `work_experience[${exp.id}].start_date`)}
            />
          )}
          {fieldCorrectionProps.end_date.correctionImportance !== undefined && fieldCorrectionProps.end_date.fieldCorrection && (
            <InlineFieldCorrection
              fieldCorrection={fieldCorrectionProps.end_date.fieldCorrection}
              importance={fieldCorrectionProps.end_date.correctionImportance!}
              reasoning={fieldCorrectionProps.end_date.correctionReasoning}
              onApply={() => fieldCorrectionProps.end_date.onApplyCorrection(fieldCorrectionProps.end_date.fieldCorrection!)}
              onDismiss={fieldCorrectionProps.end_date.onDismissCorrection}
              suggestionCardId={buildQualitySuggestionId("work_experience", exp.id, `work_experience[${exp.id}].end_date`)}
            />
          )}
        </Box>
      )}
      <Box sx={{ mb: 1 }}>
        <ValidatedDisplay
          validation={validation.company}
          variant="subtitle1"
          normalColor="#1976d2"
          iconSize="0.875rem"
          sx={{ mb: 0 }}
        >
          {exp.company || "Company Name"}
          {exp.location && ` • ${exp.location}`}
        </ValidatedDisplay>
        {(fieldCorrectionProps.company.correctionImportance !== undefined || fieldCorrectionProps.location.correctionImportance !== undefined) && (
          <Box sx={{ mt: 1 }}>
            {fieldCorrectionProps.company.correctionImportance !== undefined && fieldCorrectionProps.company.fieldCorrection && (
              <InlineFieldCorrection
                fieldCorrection={fieldCorrectionProps.company.fieldCorrection}
                importance={fieldCorrectionProps.company.correctionImportance!}
                reasoning={fieldCorrectionProps.company.correctionReasoning}
                onApply={() => fieldCorrectionProps.company.onApplyCorrection(fieldCorrectionProps.company.fieldCorrection!)}
                onDismiss={fieldCorrectionProps.company.onDismissCorrection}
                suggestionCardId={buildQualitySuggestionId("work_experience", exp.id, `work_experience[${exp.id}].company`)}
              />
            )}
            {fieldCorrectionProps.location.correctionImportance !== undefined && fieldCorrectionProps.location.fieldCorrection && (
              <InlineFieldCorrection
                fieldCorrection={fieldCorrectionProps.location.fieldCorrection}
                importance={fieldCorrectionProps.location.correctionImportance!}
                reasoning={fieldCorrectionProps.location.correctionReasoning}
                onApply={() => fieldCorrectionProps.location.onApplyCorrection(fieldCorrectionProps.location.fieldCorrection!)}
                onDismiss={fieldCorrectionProps.location.onDismissCorrection}
                suggestionCardId={buildQualitySuggestionId("work_experience", exp.id, `work_experience[${exp.id}].location`)}
              />
            )}
          </Box>
        )}
      </Box>
      {exp.description ? (
        <Box sx={{ mb: 1 }}>
          <MarkdownRenderer content={exp.description} variant="body1" />
          {descriptionCorrection && descriptionCorrection.correction.importance && (
            <InlineFieldCorrection
              htmlDiffCorrection={descriptionCorrection}
              importance={descriptionCorrection.correction.importance}
              reasoning={(() => {
                const descFieldCorrection = descriptionCorrection.correction.field_corrections?.find(
                  fc => fc.field_name === 'description'
                );
                return descFieldCorrection?.reasoning;
              })()}
              onApply={() => handleApplyWritingCorrection(descriptionCorrection.correction, (draftHistory.draftIndex ?? 1) - 1)}
              onDismiss={() => handleDismissWritingCorrection(descriptionCorrection.correction)}
              onRetry={draftHistory.onRetry}
              onBack={draftHistory.onBack}
              canGoBack={draftHistory.canGoBack}
              onForward={draftHistory.onForward}
              canGoForward={draftHistory.canGoForward}
              draftIndex={draftHistory.draftIndex}
              draftTotal={draftHistory.draftTotal}
              isRetrying={draftHistory.isRetrying}
              suggestionCardId={buildQualitySuggestionId("work_experience", exp.id, `work_experience[${exp.id}].description`)}
            />
          )}
        </Box>
      ) : null}
      {exp.achievements && exp.achievements.length > 0 && (
        <Box sx={{ mb: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: "bold", mb: 0.5 }}>
            Achievements:
          </Typography>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {exp.achievements.map((achievement, idx) => (
              <li key={idx}>
                <MarkdownRenderer content={achievement} variant="body2" />
              </li>
            ))}
          </ul>
        </Box>
      )}
      {fieldCorrectionProps.achievements?.correctionImportance !== undefined && fieldCorrectionProps.achievements?.fieldCorrection && (
        <Box sx={{ mb: 1 }}>
          <InlineFieldCorrection
            fieldCorrection={fieldCorrectionProps.achievements.fieldCorrection}
            importance={fieldCorrectionProps.achievements.correctionImportance!}
            reasoning={fieldCorrectionProps.achievements.correctionReasoning}
            onApply={() => fieldCorrectionProps.achievements!.onApplyCorrection(fieldCorrectionProps.achievements!.fieldCorrection!)}
            onDismiss={fieldCorrectionProps.achievements.onDismissCorrection}
            suggestionCardId={buildQualitySuggestionId("work_experience", exp.id, `work_experience[${exp.id}].achievements`)}
          />
        </Box>
      )}
      {!exp.description && (!exp.achievements || exp.achievements.length === 0) && (
        <Typography variant="body1" sx={{ lineHeight: 1.6, color: "text.secondary" }}>
          Job description...
        </Typography>
      )}
      {/* AI Suggestion - only show full suggestion UI if suggested text exists */}
      {suggestion && suggestion.suggested && (
        <ItemDescriptionSuggestion
          suggestion={suggestion}
          onApply={() => handleApplySuggestion(exp.id, suggestion.suggested!)}
          onDiscard={() => handleDiscardSuggestion(exp.id)}
        />
      )}

      {/* Unified Quality Suggestion (combines quality suggestion and writing corrections) */}
      {(qualitySuggestion || writingCorrections.length > 0) && (
        <UnifiedQualitySuggestion
          itemId={exp.id}
          section="work_experience"
          qualitySuggestion={qualitySuggestion}
          writingCorrections={[]}
          onApplyAll={handleApplyAll}
          onApplyQuality={qualitySuggestion ? (suggested) => handleApplyQualitySuggestion(exp.id, suggested) : undefined}
          onDismissQuality={qualitySuggestion ? () => handleDismissQualitySuggestion(exp.id) : undefined}
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

const WorkExperienceSection: React.FC<SectionProps & { sectionType?: string }> = ({
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
  sectionType,
  sectionId,
  onHide,
  onDelete,
  readOnly,
}) => {
  // Get quality analysis from store (independent of jobs)
  const qualityAnalysis = useValidatedQualityAnalysis(cvId || "");

  const { dismissAllWorkExperienceSuggestions } = useAISuggestionsStore();
  const { dismissWritingCorrection } = useCVQualityStore();
  const { showSuccess } = useNotifications();

  // Use section suggestions hook (pass item ids so index-based API item_id "0","1","2" maps to actual ids)
  const sectionItemIds = useMemo(
    () => (data as WorkExperience[]).map((d) => d.id),
    [data]
  );
  const {
    suggestionsByItemId,
    qualitySuggestionsByItemId,
    coachingByItemId,
    writingCorrectionsByItemId,
    visibleSuggestions,
  } = useSectionSuggestions(cvId || "", 'work_experience', qualityAnalysis, sectionItemIds);

  // Use section handlers hook
  const {
    handleApplySuggestion,
    handleDiscardSuggestion,
    handleApplyQualitySuggestion,
    handleDismissQualitySuggestion,
    handleApplyWritingCorrection,
    handleApplyAll,
  } = useSectionHandlers<WorkExperience>(
    'work_experience',
    cvId,
    data as WorkExperience[],
    onUpdate,
    onSave
  );

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
    const wrappedUpdateExperience = createTrackedFieldUpdater(cvId, `work_experience:${exp.id}`, updateExperience, ['description']);
    // Look up quality suggestions for this item
    const qualitySuggestion = qualitySuggestionsByItemId.get(exp.id);
    const writingCorrections = writingCorrectionsByItemId.get(exp.id) || [];

    // Use form handlers hook
    const {
      handleApplyQualitySuggestionForm,
      handleDismissQualitySuggestionForm,
      handleApplyWritingCorrectionForm,
      handleDismissWritingCorrectionForm,
      handleApplyAllForm,
      handleApplySingleFieldCorrectionForm,
    } = useFormHandlers<WorkExperience>(
      'work_experience',
      exp.id,
      updateExperience,
      onSave
    );

    return (
      <WorkExperienceForm
        exp={exp}
        index={index}
        updateExperience={wrappedUpdateExperience}
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
    await dismissAllWorkExperienceSuggestions();
    showSuccess("All suggestions discarded");
  }, [dismissAllWorkExperienceSuggestions, showSuccess]);

  const renderExperienceDisplay = useCallback(
    (exp: WorkExperience, index: number) => {
      // Get all validation states at once using useItemValidation hook
      const WorkExperienceDisplayWrapper: React.FC<{ exp: WorkExperience; index: number }> = ({ exp, index }) => {
        const validation = useItemValidation('work_experience', index, ['position', 'company', 'start_date', 'end_date']);
        return (
          <WorkExperienceDisplay
            exp={exp}
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
              await dismissWritingCorrection(correction.item_id, correction.field_path);
              showSuccess("Writing correction dismissed");
            }}
            handleApplyAll={handleApplyAll}
            cvId={cvId}
          />
        );
      };

      return <WorkExperienceDisplayWrapper exp={exp} index={index} />;
    },
    [
      cvId,
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
        sectionType={sectionType || 'work_experience'}
        sectionId={sectionId}
        onHide={onHide}
        onDelete={onDelete}
        readOnly={readOnly}
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
      getItemTitle={(item) => {
        if (item.position && item.company) {
          return `${item.position} at ${item.company}`;
        }
        return item.position || item.company || "";
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

// Memoize to prevent unnecessary re-renders of work experience items
export default React.memo(WorkExperienceSection, (prevProps, nextProps) => {
  return (
    prevProps.data === nextProps.data &&
    prevProps.isEditing === nextProps.isEditing
  );
});
