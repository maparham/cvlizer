import React from "react";
import ReactMarkdown from "react-markdown";
import {
  Typography,
  Box,
  Button,
  Chip,
  Tooltip,
  IconButton,
  Divider,
  Paper,
  Alert,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import {
  Add as AddIcon,
  Close as CloseIcon,
  InfoOutlined as InfoIcon,
} from "@mui/icons-material";
import VisibilityIcon from '@mui/icons-material/Visibility';
import CodeIcon from '@mui/icons-material/Code';
import { SectionProps } from "../../../types";
import SimpleFormSection from "../core/SimpleFormSection";
import { FormField } from "../core/formUtils";
import {
  useAISuggestionsStore,
  useValidatedSuggestions,
} from "../../../stores/aiSuggestionsStore";
import { useCVQualityStore, useValidatedQualityAnalysis } from "../../../stores/cvQualityStore";
import { useNotifications } from "../../../packages/notifications";
import SemanticDiff from "../ai/SemanticDiff";
import { WritingCorrection } from "../../../types/ai";
import { useFieldCorrections } from "./hooks/useFieldCorrections";
import { aiService } from "../../../services/ai";
import { useCVStore } from "../../../stores/cv";
import { SuggestionActionButtons } from "../ai/SuggestionActionButtons";

interface ProfessionalSummarySectionProps extends SectionProps {
  cvId?: string;
}

// Component for rendering quality suggestion with consistent styling
const ProfessionalSummaryQualitySuggestion: React.FC<{
  qualitySummarySuggestion: any;
  onApply: () => void;
  onDismiss: () => void;
}> = ({ qualitySummarySuggestion, onApply, onDismiss }) => {
  const [viewMode, setViewMode] = React.useState<'diff' | 'raw'>('diff');
  const hasMarkdownDiff = qualitySummarySuggestion.markdown_diff && qualitySummarySuggestion.markdown_diff.trim() !== '';

  return (
    <Paper
      elevation={2}
      sx={{
        p: 2,
        my: 2,
        border: '2px solid',
        borderColor: 'info.main',
        backgroundColor: (theme) =>
          theme.palette.mode === 'dark'
            ? 'rgba(33, 150, 243, 0.05)'
            : 'rgba(33, 150, 243, 0.02)',
      }}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
          Quality Suggestions
        </Typography>
        {hasMarkdownDiff && (
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(_, newMode) => newMode && setViewMode(newMode)}
            size="small"
          >
            <ToggleButton value="diff" aria-label="diff view">
              <CodeIcon fontSize="small" />
            </ToggleButton>
            <ToggleButton value="raw" aria-label="raw view">
              <VisibilityIcon fontSize="small" />
            </ToggleButton>
          </ToggleButtonGroup>
        )}
      </Box>

      {/* Quality Suggestion Section */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, mb: 1, display: 'block' }}>
          Quality Suggestion:
        </Typography>
        {qualitySummarySuggestion.reasoning && (
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2">{qualitySummarySuggestion.reasoning}</Typography>
          </Alert>
        )}

        <Box
          sx={{
            p: 2,
            backgroundColor: 'background.default',
            borderRadius: 1,
            border: '1px solid',
            borderColor: 'divider',
            mb: 2,
          }}
        >
          {hasMarkdownDiff && viewMode === 'diff' ? (
            <SemanticDiff markdownDiff={qualitySummarySuggestion.markdown_diff || ''} />
          ) : (
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                Original:
              </Typography>
              <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
                {qualitySummarySuggestion.original_text}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                Suggested:
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {qualitySummarySuggestion.suggested_text}
              </Typography>
            </Box>
          )}
        </Box>
      </Box>

      {/* Actions */}
      <Box sx={{ mt: 2 }}>
        <SuggestionActionButtons
          onApply={onApply}
          onDismiss={onDismiss}
          variant="standard"
        />
      </Box>
    </Paper>
  );
};

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
    dismissWritingCorrection,
    currentAnalysisId,
  } = useCVQualityStore();

  // Get CV store for updating CV after applying corrections
  const { setCurrentCV, updateCVInList } = useCVStore();

  // Get writing corrections for professional_summary section
  const writingCorrections = React.useMemo(() => {
    return qualityAnalysis?.writing_corrections?.filter(
      (correction) => correction.section === 'professional_summary'
    ) || [];
  }, [qualityAnalysis?.writing_corrections]);

  // Get notifications for user feedback
  const { showSuccess, showError } = useNotifications();

  // Extract professional summary suggestion from unified store (job-based)
  const summarySuggestion = allSuggestions?.professional_summary;
  const hasSummarySuggestion =
    summarySuggestion && summarySuggestion.suggested_text;

  // Extract quality suggestion (independent of jobs)
  const qualitySummarySuggestion = qualityAnalysis?.professional_summary;
  const hasQualitySuggestion =
    qualitySummarySuggestion && qualitySummarySuggestion.suggested_text;

  // Move useFieldCorrections to top level to fix Rules of Hooks violation
  const itemId = writingCorrections.length > 0 ? writingCorrections[0].item_id : 'professional_summary';

  const handleApplyWritingCorrection = React.useCallback(async (correction: WritingCorrection) => {
    if (!cvId || !currentAnalysisId) {
      showError("Cannot apply correction: CV ID or analysis ID missing");
      return;
    }

    try {
      // Apply correction via backend
      const updatedCV = await aiService.applyWritingCorrection(
        cvId,
        currentAnalysisId,
        correction.item_id
      );

      // Update CV store
      setCurrentCV(updatedCV);
      updateCVInList(updatedCV);

      // Dismiss the correction from the analysis
      await dismissWritingCorrection(correction.item_id, correction.section);
      showSuccess("Writing correction applied successfully");
    } catch (error: any) {
      const errorMessage = error?.response?.data?.detail || error?.message || "Failed to apply writing correction";
      showError(errorMessage);
    }
  }, [cvId, currentAnalysisId, setCurrentCV, updateCVInList, dismissWritingCorrection, showError, showSuccess]);

  const handleDismissWritingCorrection = React.useCallback(async (correction: WritingCorrection) => {
    await dismissWritingCorrection(correction.item_id, correction.section);
    showSuccess("Writing correction dismissed");
  }, [dismissWritingCorrection, showSuccess]);

  const { descriptionCorrection } = useFieldCorrections(
    itemId,
    writingCorrections,
    [{ fieldName: 'description' }],  // Only description field for professional_summary
    handleApplyWritingCorrection,
    handleDismissWritingCorrection
  );

  const renderForm = (
    editData: any,
    updateData: (field: string, value: any) => void,
  ) => {
    const handleApplySummarySuggestion = async () => {
      if (summarySuggestion?.suggested_text) {
        updateData("content", summarySuggestion.suggested_text);
        // Update the editData with the new content for saving
        const updatedEditData = {
          ...editData,
          content: summarySuggestion.suggested_text,
        };
        onSave?.(updatedEditData);
        await dismissSummarySuggestion();
        showSuccess("Professional summary updated with AI suggestion");
      }
    };

    const handleApplyQualitySuggestion = async () => {
      if (qualitySummarySuggestion?.suggested_text) {
        updateData("content", qualitySummarySuggestion.suggested_text);
        // Update the editData with the new content for saving
        const updatedEditData = {
          ...editData,
          content: qualitySummarySuggestion.suggested_text,
        };
        onSave?.(updatedEditData);
        await dismissQualitySummarySuggestion();
        showSuccess("Professional summary updated with quality suggestion");
      }
    };

    const handleApplyWritingCorrectionWrapper = async (correction: WritingCorrection) => {
      if (!cvId || !currentAnalysisId) {
        showError("Cannot apply correction: CV ID or analysis ID missing");
        return;
      }

      try {
        // Apply correction via backend
        const updatedCV = await aiService.applyWritingCorrection(
          cvId,
          currentAnalysisId,
          correction.item_id
        );

        // Update CV store
        setCurrentCV(updatedCV);
        updateCVInList(updatedCV);

        // Update local form data with new content
        const contentValue = (typeof editData === "string" ? editData : editData.content) || "";
        const newContent = updatedCV.parsed_data?.professional_summary?.content || contentValue;
        updateData("content", newContent);
        const updatedEditData = {
          ...editData,
          content: newContent,
        };
        onSave?.(updatedEditData);

        // Dismiss the correction from the analysis
        await dismissWritingCorrection(correction.item_id, correction.section);
        showSuccess("Writing correction applied successfully");
      } catch (error: any) {
        const errorMessage = error?.response?.data?.detail || error?.message || "Failed to apply writing correction";
        showError(errorMessage);
      }
    };

    const handleDismissWritingCorrectionWrapper = async (correction: WritingCorrection) => {
      await dismissWritingCorrection(correction.item_id, correction.section);
      showSuccess("Writing correction dismissed");
    };

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
          markdownDiffCorrection={descriptionCorrection}
          onApplyCorrection={handleApplyWritingCorrectionWrapper}
          onDismissCorrection={() => descriptionCorrection && handleDismissWritingCorrectionWrapper(descriptionCorrection.correction)}
          sx={{
            "& .MuiInputBase-input": {
              lineHeight: 1.6,
              textAlign: "justify",
            },
          }}
        />

        {/* AI Summary Suggestion - Only show if suggestion exists */}
        {hasSummarySuggestion && (
          <Box
            sx={{
              mt: 2,
              p: { xs: 1.5, sm: 2 },
              backgroundColor: "#E3F2FD",
              border: "1px solid #BBDEFB",
              borderRadius: 1,
            }}
          >
            <Box display="flex" alignItems="center" mb={1}>
              <Typography
                variant="subtitle2"
                sx={{ fontWeight: "bold", color: "#1976d2" }}
              >
                AI Suggested Professional Summary
              </Typography>
              <Tooltip title="AI-generated improvement based on job description">
                <InfoIcon sx={{ ml: 1, fontSize: 16, color: "#1976d2" }} />
              </Tooltip>
              <IconButton
                size="small"
                onClick={dismissSummarySuggestion}
                sx={{ ml: "auto", color: "#666" }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>

            <Box sx={{ mb: 2, lineHeight: 1.6 }}>
              {summarySuggestion.markdown_diff &&
              summarySuggestion.markdown_diff.trim() !== "" ? (
                <SemanticDiff markdownDiff={summarySuggestion.markdown_diff} />
              ) : (
                // No diff available - show side-by-side comparison
                <Box>
                  <Typography variant="caption" sx={{ fontWeight: "bold" }}>
                    Original:
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    {summarySuggestion.original_text}
                  </Typography>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="caption" sx={{ fontWeight: "bold" }}>
                    Suggested:
                  </Typography>
                  <Typography variant="body2">
                    {summarySuggestion.suggested_text}
                  </Typography>
                </Box>
              )}
            </Box>

            {summarySuggestion.key_changes &&
              summarySuggestion.key_changes.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography
                    variant="caption"
                    sx={{ fontWeight: "bold", color: "#666" }}
                  >
                    Key improvements:
                  </Typography>
                  <Box sx={{ mt: 0.5 }}>
                    {summarySuggestion.key_changes.map((change, index) => (
                      <Chip
                        key={index}
                        label={change}
                        size="small"
                        sx={{
                          mr: { xs: 0.25, sm: 0.5 },
                          mb: { xs: 0.25, sm: 0.5 },
                          backgroundColor: "#E8F5E8",
                          color: "#2E7D32",
                          fontSize: { xs: "0.7rem", sm: "0.75rem" },
                        }}
                      />
                    ))}
                  </Box>
                </Box>
              )}

            <Box sx={{ display: "flex", gap: 1 }}>
              <Button
                variant="contained"
                size="small"
                startIcon={<AddIcon />}
                onClick={handleApplySummarySuggestion}
                sx={{
                  textTransform: "none",
                  backgroundColor: "#4CAF50",
                  "&:hover": {
                    backgroundColor: "#45a049",
                  },
                }}
              >
                Apply Suggestion
              </Button>
              <Button
                variant="outlined"
                size="small"
                onClick={dismissSummarySuggestion}
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
                Reject
              </Button>
            </Box>
          </Box>
        )}

        {/* Quality Suggestion - independent of job */}
        {hasQualitySuggestion && (
          <ProfessionalSummaryQualitySuggestion
            qualitySummarySuggestion={qualitySummarySuggestion}
            onApply={handleApplyQualitySuggestion}
            onDismiss={dismissQualitySummarySuggestion}
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
        <Box
          sx={{
            mt: 2,
            p: { xs: 1.5, sm: 2 },
            backgroundColor: "#E3F2FD",
            border: "1px solid #BBDEFB",
            borderRadius: 1,
          }}
        >
          <Box display="flex" alignItems="center" mb={1}>
            <Typography
              variant="subtitle2"
              sx={{ fontWeight: "bold", color: "#1976d2" }}
            >
              AI Suggested Professional Summary
            </Typography>
            <Tooltip title="AI-generated improvement based on job description">
              <InfoIcon sx={{ ml: 1, fontSize: 16, color: "#1976d2" }} />
            </Tooltip>
            <IconButton
              size="small"
              onClick={dismissSummarySuggestion}
              sx={{ ml: "auto", color: "#666" }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>

          <Box sx={{ mb: 2, lineHeight: 1.6 }}>
            {summarySuggestion.markdown_diff &&
            summarySuggestion.markdown_diff.trim() !== "" ? (
              <SemanticDiff markdownDiff={summarySuggestion.markdown_diff} />
            ) : (
              // No diff available - show side-by-side comparison
              <Box>
                <Typography variant="caption" sx={{ fontWeight: "bold" }}>
                  Original:
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  {summarySuggestion.original_text}
                </Typography>
                <Divider sx={{ my: 1 }} />
                <Typography variant="caption" sx={{ fontWeight: "bold" }}>
                  Suggested:
                </Typography>
                <Typography variant="body2">
                  {summarySuggestion.suggested_text}
                </Typography>
              </Box>
            )}
          </Box>

          {summarySuggestion.key_changes &&
            summarySuggestion.key_changes.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Typography
                  variant="caption"
                  sx={{ fontWeight: "bold", color: "#666" }}
                >
                  Key improvements:
                </Typography>
                <Box sx={{ mt: 0.5 }}>
                  {summarySuggestion.key_changes.map((change, index) => (
                    <Chip
                      key={index}
                      label={change}
                      size="small"
                      sx={{
                        mr: { xs: 0.25, sm: 0.5 },
                        mb: { xs: 0.25, sm: 0.5 },
                        backgroundColor: "#E8F5E8",
                        color: "#2E7D32",
                        fontSize: { xs: "0.7rem", sm: "0.75rem" },
                      }}
                    />
                  ))}
                </Box>
              </Box>
            )}

          <Box sx={{ display: "flex", gap: 1 }}>
            <Button
              variant="contained"
              size="small"
              startIcon={<AddIcon />}
              onClick={async () => {
                // Apply the suggestion by updating the CV data
                // Fix the corrupted data structure by ensuring professional_summary is an object
                const updatedData = {
                  content: summarySuggestion.suggested_text,
                  keywords: data.keywords || [],
                };
                onUpdate(updatedData);
                onSave?.(updatedData);
                await dismissSummarySuggestion();
                showSuccess("Professional summary updated with AI suggestion");
              }}
              sx={{
                textTransform: "none",
                backgroundColor: "#4CAF50",
                "&:hover": {
                  backgroundColor: "#45a049",
                },
              }}
            >
              Apply Suggestion
            </Button>
            <Button
              variant="outlined"
              size="small"
              onClick={dismissSummarySuggestion}
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
              Reject
            </Button>
          </Box>
        </Box>
      )}

      {/* Quality Suggestion - independent of job - Show in display mode too */}
      {hasQualitySuggestion && (
        <ProfessionalSummaryQualitySuggestion
          qualitySummarySuggestion={qualitySummarySuggestion}
          onApply={async () => {
            // Apply the suggestion by updating the CV data
            const updatedData = {
              content: qualitySummarySuggestion.suggested_text,
              keywords: data.keywords || [],
            };
            onUpdate(updatedData);
            onSave?.(updatedData);
            await dismissQualitySummarySuggestion();
            showSuccess("Professional summary updated with quality suggestion");
          }}
          onDismiss={dismissQualitySummarySuggestion}
        />
      )}

      {/* Writing Corrections now shown inline in edit mode */}
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
