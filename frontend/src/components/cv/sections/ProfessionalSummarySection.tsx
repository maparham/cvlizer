import React from "react";
import ReactMarkdown from "react-markdown";
import { Box } from "@mui/material";
import { SectionProps } from "../../../types";
import SimpleFormSection from "../core/SimpleFormSection";
import { FormField } from "../core/formUtils";
import {
  useAISuggestionsStore,
  useValidatedSuggestions,
} from "../../../stores/aiSuggestionsStore";
import { useCVQualityStore, useValidatedQualityAnalysis } from "../../../stores/cvQualityStore";
import { useNotifications } from "../../../packages/notifications";
import { FieldCorrection } from "../../../types/ai";
import { useSingleSectionWritingCorrections } from "./hooks/useSingleSectionWritingCorrections";
import { UnifiedQualitySuggestion } from "../ai/UnifiedQualitySuggestion";
import { AISummarySuggestionCard } from "../ai/AISummarySuggestionCard";
import { DescriptionCorrectionBlock } from "../ai/DescriptionCorrectionBlock";

interface ProfessionalSummarySectionProps extends SectionProps {
  cvId?: string;
}


const ProfessionalSummarySection: React.FC<ProfessionalSummarySectionProps> = ({
  data,
  onUpdate,
  onSave,
  isEditing,
  onEdit,
  onClose,
  onUnsavedChanges,
  cvId,
  title = "Professional Summary",
  onTitleSave,
}) => {

  // Get unified AI suggestions store with CV validation (job-based)
  const { dismissSummarySuggestion } = useAISuggestionsStore();

  // Use CV-validated selector to prevent cross-CV contamination
  const allSuggestions = useValidatedSuggestions(cvId || "");

  // Get quality analysis from store (independent of jobs)
  const qualityAnalysis = useValidatedQualityAnalysis(cvId || "");
  const {
    dismissProfessionalSummarySuggestion: dismissQualitySummarySuggestion,
  } = useCVQualityStore();

  // Get notifications for user feedback
  const { showSuccess, showError } = useNotifications();

  const {
    descriptionCorrection,
    handleApplyFieldCorrection,
    handleDismissWritingCorrection,
    createWritingCorrectionHandler,
  } = useSingleSectionWritingCorrections({
    cvId,
    sectionKeys: ["professional_summary"],
    getValueFromCV: (c) =>
      (c.parsed_data?.professional_summary as { content?: string } | undefined)
        ?.content ?? "",
    formFieldName: "content",
  });

  // Extract professional summary suggestion from unified store (job-based)
  const summarySuggestion = allSuggestions?.professional_summary;
  const hasSummarySuggestion =
    summarySuggestion && summarySuggestion.suggested_text;

  // Extract quality suggestion (independent of jobs)
  const qualitySummarySuggestion = qualityAnalysis?.professional_summary;
  const hasQualitySuggestion =
    qualitySummarySuggestion && qualitySummarySuggestion.suggested_text;

  /**
   * Helper to safely extract keywords from data based on mode
   */
  const extractKeywords = React.useCallback((
    mode: 'edit' | 'display',
    editData?: any
  ): string[] => {
    if (mode === 'edit') {
      return editData?.keywords || [];
    }

    // Display mode - safely check if data has keywords property
    if (data && typeof data === 'object' && 'keywords' in data) {
      const typedData = data as { keywords?: string[] };
      return typedData.keywords || [];
    }

    return [];
  }, [data]);

  /**
   * Shared handler for applying AI summary suggestions
   * Works for both edit and display modes
   */
  const handleApplySummarySuggestion = React.useCallback(async (
    suggestedText: string,
    mode: 'edit' | 'display',
    editData?: any,
    updateData?: (field: string, value: any) => void
  ) => {
    // Validate that suggested text is non-empty
    if (!suggestedText || !suggestedText.trim()) {
      showError("Cannot apply empty suggestion");
      return;
    }

    const keywords = extractKeywords(mode, editData);

    if (mode === 'edit' && updateData) {
      // Edit mode: update form state and save
      updateData("content", suggestedText);
      const updatedEditData = {
        ...editData,
        content: suggestedText,
      };
      await onSave?.(updatedEditData);
    } else {
      // Display mode: update via onUpdate and save
      const updatedData = {
        content: suggestedText,
        keywords,
      };
      onUpdate(updatedData);
      await onSave?.(updatedData);
    }

    await dismissSummarySuggestion();
    showSuccess("Professional summary updated with AI suggestion");
  }, [extractKeywords, onSave, onUpdate, dismissSummarySuggestion, showSuccess, showError]);

  /**
   * Shared handler for applying quality suggestions
   * Works for both edit and display modes
   */
  const handleApplyQualitySuggestion = React.useCallback(async (
    suggested: string,
    mode: 'edit' | 'display',
    editData?: any,
    updateData?: (field: string, value: any) => void
  ) => {
    // Validate that suggested is non-empty
    if (!suggested || !suggested.trim()) {
      showError("Cannot apply empty suggestion");
      return;
    }

    const keywords = extractKeywords(mode, editData);
    const updatedData = {
      content: suggested,
      keywords,
    };

    if (mode === 'edit' && updateData) {
      updateData("content", suggested);
      onSave?.({ ...editData, content: suggested });
    } else {
      onUpdate(updatedData);
      onSave?.(updatedData);
    }

    await dismissQualitySummarySuggestion();
    showSuccess("Professional summary updated with quality suggestion");
  }, [extractKeywords, onSave, onUpdate, dismissQualitySummarySuggestion, showSuccess, showError]);

  const renderForm = (
    editData: any,
    updateData: (field: string, value: any) => void,
  ) => {
    // Create edit mode handler using factory pattern
    const handleApplyWritingCorrectionInEdit = createWritingCorrectionHandler(
      'edit',
      editData,
      updateData,
      onSave
    );

    const contentValue =
      (typeof editData === "string" ? editData : editData.content) || "";
    const hasError =
      !contentValue?.trim() || contentValue?.trim().length < 10;
    const helperText = !contentValue?.trim()
      ? "Professional summary is required"
      : contentValue?.trim().length < 10
        ? "Professional summary must be at least 10 characters long"
        : "Markdown formatting is supported";

    return (
      <Box>
        <FormField
          config={{
            name: "content",
            label: "Professional Summary",
            placeholder: "Your professional summary goes here... (Markdown supported)",
            required: true,
            multiline: true,
            rows: 4,
            minLength: 10,
            useMarkdownEditor: true,
          }}
          value={contentValue}
          onChange={(value) => updateData("content", value)}
          error={hasError}
          helperText={helperText}
          htmlDiffCorrection={descriptionCorrection}
          onApplyCorrection={async (correction) => {
            // Call the factory-generated handler with proper signature
            // The first param (fieldCorrection) is ignored, we use parentCorrection
            await handleApplyWritingCorrectionInEdit({} as FieldCorrection, correction);
          }}
          onDismissCorrection={() => descriptionCorrection && handleDismissWritingCorrection(descriptionCorrection.correction)}
          sx={{
            "& .MuiInputBase-input": {
              lineHeight: 1.6,
              textAlign: "justify",
            },
          }}
        />

        {/* AI Summary Suggestion - Only show if suggestion exists */}
        {hasSummarySuggestion && (
          <AISummarySuggestionCard
            suggestion={summarySuggestion}
            onApply={async (suggestedText) => {
              await handleApplySummarySuggestion(suggestedText, 'edit', editData, updateData);
            }}
            onDismiss={dismissSummarySuggestion}
          />
        )}

        {/* Quality Suggestion - independent of job */}
        {hasQualitySuggestion && qualitySummarySuggestion && (
          <UnifiedQualitySuggestion
            itemId="professional_summary"
            section="professional_summary"
            qualitySuggestion={qualitySummarySuggestion}
            onApplyQuality={async (suggested) => {
              await handleApplyQualitySuggestion(suggested, 'edit', editData, updateData);
            }}
            onDismissQuality={dismissQualitySummarySuggestion}
          />
        )}

        {/* Writing Corrections now shown inline above */}
      </Box>
    );
  };

  const renderDisplay = (data: any) => (
    <Box>
      <Box
        sx={{
          lineHeight: 1.6,
          textAlign: "justify",
          "& h1, & h2, & h3, & h4, & h5, & h6": {
            marginTop: 1,
            marginBottom: 0.5,
            fontWeight: 600,
          },
          "& p": {
            marginBottom: 1,
          },
          "& ul, & ol": {
            marginBottom: 1,
            paddingLeft: 2,
          },
          "& li": {
            marginBottom: 0.25,
          },
          "& strong": {
            fontWeight: 600,
          },
          "& em": {
            fontStyle: "italic",
          },
        }}
      >
        <ReactMarkdown>
          {(typeof data === "string" ? data : data.content) ||
            "Your professional summary goes here..."}
        </ReactMarkdown>
      </Box>

      {/* AI Summary Suggestion - Show in display mode too */}
      {hasSummarySuggestion && (
        <AISummarySuggestionCard
          suggestion={summarySuggestion}
          onApply={async (suggestedText) => {
            await handleApplySummarySuggestion(suggestedText, 'display');
          }}
          onDismiss={dismissSummarySuggestion}
        />
      )}

      {/* Quality Suggestion - independent of job - Show in display mode too */}
      {hasQualitySuggestion && qualitySummarySuggestion && (
        <UnifiedQualitySuggestion
          itemId="professional_summary"
          section="professional_summary"
          qualitySuggestion={qualitySummarySuggestion}
          onApplyQuality={async (suggested) => {
            await handleApplyQualitySuggestion(suggested, 'display');
          }}
          onDismissQuality={dismissQualitySummarySuggestion}
        />
      )}

      {/* Writing corrections - display mode (content/description field) */}
      <DescriptionCorrectionBlock
        descriptionCorrection={descriptionCorrection}
        handleApplyFieldCorrection={handleApplyFieldCorrection}
        handleDismissWritingCorrection={handleDismissWritingCorrection}
        fieldName="content"
      />
    </Box>
  );

  return (
    <SimpleFormSection
      data={data}
      onUpdate={onUpdate}
      onSave={onSave}
      isEditing={isEditing}
      onEdit={onEdit}
      onClose={onClose}
      onUnsavedChanges={onUnsavedChanges}
      title={title}
      onTitleSave={onTitleSave}
      sectionId="professional_summary"
      requiredFields={["content"]}
      renderForm={renderForm}
      renderDisplay={renderDisplay}
      autoSaveMessage="Professional summary auto-saved"
    />
  );
};

// Memoize component to prevent unnecessary re-renders
export default React.memo(
  ProfessionalSummarySection,
  (prevProps, nextProps) => {
    return (
      prevProps.data === nextProps.data &&
      prevProps.isEditing === nextProps.isEditing
    );
  },
);
