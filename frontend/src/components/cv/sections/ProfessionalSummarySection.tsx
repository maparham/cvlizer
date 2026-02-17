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
import { useEditedSinceAIStore } from "../../../stores/editedSinceAIStore";
import { useOverwriteConfirm, OVERWRITE_MSG } from "../../../contexts/OverwriteConfirmContext";
import { createTrackedFieldUpdater } from "./hooks/createTrackedFieldUpdater";
import { useNotifications } from "../../../packages/notifications";
import { FieldCorrection } from "../../../types/ai";
import { useSingleSectionWritingCorrections } from "./hooks/useSingleSectionWritingCorrections";
import { UnifiedQualitySuggestion } from "../ai/UnifiedQualitySuggestion";
import { CoachingQuestionsPanel } from "../ai/CoachingQuestionsPanel";
import { AISummarySuggestionCard } from "../ai/AISummarySuggestionCard";
import { DescriptionCorrectionBlock } from "../ai/DescriptionCorrectionBlock";
import { ContentCoachingItem } from "../../../types/ai";

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

  const { isEdited, clearEdited } = useEditedSinceAIStore();
  const { confirm: overwriteConfirm } = useOverwriteConfirm();
  const FIELD_KEY = "professional_summary";

  const {
    descriptionCorrection,
    handleApplyFieldCorrection,
    handleDismissWritingCorrection,
    createWritingCorrectionHandler,
    onRetry,
    onBack,
    canGoBack,
    onForward,
    canGoForward,
    isRetrying,
    draftIndex,
    draftTotal,
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

  // Derive professional summary suggestion from issues only (no top-level professional_summary from backend).
  const qualitySummaryIssue = React.useMemo(() => {
    const issues = qualityAnalysis?.issues ?? [];
    return issues.find(
      (i) =>
        i.item_type === "professional_summary" ||
        i.field_path === "professional_summary" ||
        (i.field_path ?? "").startsWith("professional_summary.")
    ) ?? null;
  }, [qualityAnalysis?.issues]);

  // When issue has html_diff we show only DescriptionCorrectionBlock. When issue has no html_diff and no coaching, show UnifiedQualitySuggestion. When no html_diff but has coaching, show only CoachingQuestionsPanel (reasoning in tooltip) to avoid empty correction card.
  const hasQualitySuggestion =
    qualitySummaryIssue != null &&
    !qualitySummaryIssue.html_diff &&
    !qualitySummaryIssue.coaching &&
    typeof qualitySummaryIssue.reasoning === "string" &&
    qualitySummaryIssue.reasoning.trim() !== "";
  const qualitySummarySuggestion = hasQualitySuggestion && qualitySummaryIssue
    ? {
        item_type: "low_score" as const,
        item_id: qualitySummaryIssue.item_id ?? "professional_summary",
        field_path: qualitySummaryIssue.field_path ?? "professional_summary",
        original: qualitySummaryIssue.original ?? "",
        suggested: qualitySummaryIssue.suggested ?? "",
        reasoning: qualitySummaryIssue.reasoning,
        quality_score: qualitySummaryIssue.quality_score ?? 0,
        coaching_questions: qualitySummaryIssue.coaching?.coaching_questions,
        html_diff: qualitySummaryIssue.html_diff ?? "",
      }
    : null;

  // When issue has coaching (and optionally no html_diff), show only coaching card with reasoning in tooltip.
  const summaryCoachingItem: ContentCoachingItem | null = React.useMemo(() => {
    if (!qualitySummaryIssue?.coaching) return null;
    const cat = qualitySummaryIssue.issue_category as ContentCoachingItem["issue_category"];
    return {
      item_id: "professional_summary",
      section: "professional_summary",
      issue_category: cat,
      coaching_questions: qualitySummaryIssue.coaching.coaching_questions,
      direct_prompts: qualitySummaryIssue.coaching.direct_prompts ?? [],
      reasoning: qualitySummaryIssue.reasoning ?? undefined,
    };
  }, [qualitySummaryIssue]);

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

    if (cvId && isEdited(cvId, FIELD_KEY)) {
      const ok = await overwriteConfirm(OVERWRITE_MSG);
      if (!ok) return;
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
    if (cvId) clearEdited(cvId, FIELD_KEY);
    showSuccess("Professional summary updated with AI suggestion");
  }, [cvId, extractKeywords, onSave, onUpdate, dismissSummarySuggestion, showSuccess, showError, isEdited, clearEdited]);

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

    if (cvId && isEdited(cvId, FIELD_KEY)) {
      const ok = await overwriteConfirm(OVERWRITE_MSG);
      if (!ok) return;
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
    if (cvId) clearEdited(cvId, FIELD_KEY);
    showSuccess("Professional summary updated with quality suggestion");
  }, [cvId, extractKeywords, onSave, onUpdate, dismissQualitySummarySuggestion, showSuccess, showError, isEdited, clearEdited]);

  const renderForm = (
    editData: any,
    updateData: (field: string, value: any) => void,
  ) => {
    const wrappedUpdateData = createTrackedFieldUpdater(cvId, FIELD_KEY, updateData, ["content"]);
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
          onChange={(value) => wrappedUpdateData("content", value)}
          error={hasError}
          helperText={helperText}
          htmlDiffCorrection={descriptionCorrection}
          onApplyCorrection={async (correction) => {
            if (cvId && isEdited(cvId, FIELD_KEY)) {
              const ok = await overwriteConfirm(OVERWRITE_MSG);
              if (!ok) return;
            }
            // Call the factory-generated handler with proper signature
            // The first param (fieldCorrection) is ignored, we use parentCorrection
            await handleApplyWritingCorrectionInEdit({} as FieldCorrection, correction);
            if (cvId) clearEdited(cvId, FIELD_KEY);
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

        {/* Quality Suggestion - only when no html_diff and no coaching (avoids empty card) */}
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

        {/* Coaching card when issue has coaching (reasoning in tooltip); no empty correction card */}
        {summaryCoachingItem && (
          <CoachingQuestionsPanel coachingItem={summaryCoachingItem} />
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

      {/* Quality Suggestion - only when no html_diff and no coaching */}
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

      {/* Writing corrections first, then coaching - same order as work_experience/education */}
      <DescriptionCorrectionBlock
        descriptionCorrection={descriptionCorrection}
        handleApplyFieldCorrection={async (fieldCorrection, parentCorrection) => {
          if (cvId && isEdited(cvId, FIELD_KEY)) {
            const ok = await overwriteConfirm(OVERWRITE_MSG);
            if (!ok) return;
          }
          await handleApplyFieldCorrection(fieldCorrection, parentCorrection);
          if (cvId) clearEdited(cvId, FIELD_KEY);
        }}
        handleDismissWritingCorrection={handleDismissWritingCorrection}
        fieldName="content"
        onRetry={onRetry}
        onBack={onBack}
        canGoBack={canGoBack}
        onForward={onForward}
        canGoForward={canGoForward}
        draftIndex={draftIndex}
        draftTotal={draftTotal}
        isRetrying={isRetrying}
      />

      {/* Coaching card when issue has coaching (reasoning in tooltip) */}
      {summaryCoachingItem && (
        <CoachingQuestionsPanel coachingItem={summaryCoachingItem} />
      )}
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
