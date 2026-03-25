/**
 * Inline Diff Controls Component
 *
 * This component provides controls for the inline diff system, replacing the old
 * ATS optimization display. It shows a summary of suggestions and provides
 * actions to generate, manage, and apply AI suggestions.
 *
 * Key responsibilities:
 * - Display suggestion summary and statistics
 * - Provide generate suggestions button
 * - Show quick actions for managing suggestions
 * - Integrate with the floating suggestions panel
 * - Replace the old ATS optimization component
 *
 * Usage:
 * - Used in the AI Tools tab of the sidebar
 * - Provides a clean interface for the inline diff system
 * - Maintains compatibility with existing CV data flow
 */

import React from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import LinearProgress from "@mui/material/LinearProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import AutoFixHigh from "@mui/icons-material/AutoFixHigh";
import CheckCircle from "@mui/icons-material/CheckCircle";
import Cancel from "@mui/icons-material/Cancel";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import { useInlineDiffContext } from "../../../contexts/InlineDiffContext";
import { useActiveJobDescription } from "../../../stores/ai";
import { useCVEditor } from "../../../contexts/CVEditorContext";

interface InlineDiffControlsProps {
  cvId: string;
  onContentUpdate?: (content: string, sectionType: string) => void;
}

const InlineDiffControls: React.FC<InlineDiffControlsProps> = ({
  cvId,
  onContentUpdate,
}) => {
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const {
    isInDiffMode,
    suggestions,
    isPanelOpen,
    generateSuggestions,
    applyAllSuggestions,
    togglePanel,
    setHighlightMode,
    highlightMode,
    getPendingSuggestionsCount,
    getApprovedSuggestionsCount,
    commitChanges,
    exitDiffMode,
  } = useInlineDiffContext();

  const activeJobDescription = useActiveJobDescription(cvId);
  const { cvData } = useCVEditor();

  const pendingCount = getPendingSuggestionsCount();
  const approvedCount = getApprovedSuggestionsCount();
  const totalCount = suggestions.length;
  const progress =
    totalCount > 0
      ? ((approvedCount +
          suggestions.filter((s) => s.status === "rejected").length) /
          totalCount) *
        100
      : 0;

  // Debug logging
  React.useEffect(() => {
    // Debug logging removed for cleanup
  }, [isInDiffMode, suggestions, isPanelOpen, highlightMode]);

  const handleGenerateSuggestions = async () => {
    if (!activeJobDescription) {
      setError(
        "Please select a job description first to generate targeted suggestions",
      );
      return;
    }

    try {
      setIsGenerating(true);
      setError(null);
      await generateSuggestions(cvId, activeJobDescription.id);

      // Apply suggestions to create temp state
      // Note: applyAllSuggestions from context only takes cvData, cvId is retrieved from state
      if (cvData) {
        applyAllSuggestions(cvData);
      } else {
        console.warn("No CV data available to apply suggestions");
      }
    } catch (err) {
      console.error("Error generating suggestions:", err);
      setError(
        err instanceof Error ? err.message : "Failed to generate suggestions",
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCommitChanges = (event?: React.MouseEvent) => {
    // Safety check: Only commit if there are actually approved suggestions
    if (approvedCount === 0) {
      console.warn(
        "InlineDiffControls - Prevented commit with 0 approved suggestions",
      );
      return;
    }

    // Only allow explicit user clicks
    if (event && (!event.isTrusted || event.type !== "click")) {
      console.warn(
        "InlineDiffControls - Prevented commit from non-click event",
      );
      return;
    }

    const finalData = commitChanges();
    if (finalData && onContentUpdate) {
      // Trigger content update for the CV
      onContentUpdate(JSON.stringify(finalData), "cv_data");
    }
  };

  const handleExitDiffMode = () => {
    exitDiffMode();
  };

  const canGenerateSuggestions = !!(
    cvId &&
    activeJobDescription &&
    !isGenerating
  );

  if (isInDiffMode) {
    return (
      <Card
        sx={{
          bgcolor: "primary.50",
          border: "1px solid",
          borderColor: "primary.200",
        }}
      >
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2, color: "primary.main" }}>
            AI Suggestions Active
          </Typography>

          {/* Progress */}
          <Box sx={{ mb: 2 }}>
            <Box
              sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}
            >
              <Typography variant="body2" color="text.secondary">
                Progress
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {Math.round(progress)}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={progress}
              sx={{
                height: 8,
                borderRadius: 4,
                bgcolor: "grey.200",
                "& .MuiLinearProgress-bar": {
                  bgcolor: "success.main",
                },
              }}
            />
          </Box>

          {/* Stats */}
          <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
            <Chip
              label={`${totalCount} Total`}
              size="small"
              variant="outlined"
            />
            <Chip
              label={`${pendingCount} Pending`}
              size="small"
              color="warning"
              variant="filled"
            />
            <Chip
              label={`${approvedCount} Approved`}
              size="small"
              color="success"
              variant="filled"
            />
          </Stack>

          {/* Highlight Mode */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ mb: 1 }}>
              Show:
            </Typography>
            <Stack direction="row" spacing={1}>
              <Button
                size="small"
                variant={highlightMode === "all" ? "contained" : "outlined"}
                onClick={() => setHighlightMode("all")}
              >
                All
              </Button>
              <Button
                size="small"
                variant={highlightMode === "pending" ? "contained" : "outlined"}
                onClick={() => setHighlightMode("pending")}
              >
                Pending
              </Button>
              <Button
                size="small"
                variant={
                  highlightMode === "approved" ? "contained" : "outlined"
                }
                onClick={() => setHighlightMode("approved")}
              >
                Approved
              </Button>
            </Stack>
          </Box>

          {/* Actions */}
          <Stack spacing={1}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={isPanelOpen ? <VisibilityOff /> : <Visibility />}
              onClick={() => togglePanel()}
            >
              {isPanelOpen ? "Hide" : "Show"} Suggestions Panel
            </Button>

            {approvedCount > 0 && (
              <Button
                fullWidth
                variant="contained"
                color="success"
                startIcon={<CheckCircle />}
                onClick={handleCommitChanges}
              >
                Apply Changes ({approvedCount})
              </Button>
            )}

            <Button
              fullWidth
              variant="outlined"
              color="error"
              startIcon={<Cancel />}
              onClick={handleExitDiffMode}
            >
              Cancel & Exit
            </Button>
          </Stack>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 2 }}>
          AI Suggestions
        </Typography>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Generate AI-powered suggestions to optimize your CV for specific job
          descriptions. Suggestions will appear directly in your CV sections for
          easy review and approval.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {!activeJobDescription && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Please add a job description first to generate targeted suggestions.
          </Alert>
        )}

        <Button
          fullWidth
          variant="contained"
          startIcon={
            isGenerating ? <CircularProgress size={20} /> : <AutoFixHigh />
          }
          onClick={handleGenerateSuggestions}
          disabled={!canGenerateSuggestions}
          sx={{ mb: 2 }}
        >
          {isGenerating
            ? "Generating Suggestions..."
            : "Generate AI Suggestions"}
        </Button>

        <Typography variant="caption" color="text.secondary">
          Suggestions will appear as highlighted overlays in your CV sections.
          You can accept or reject each suggestion individually.
        </Typography>
      </CardContent>
    </Card>
  );
};

export default InlineDiffControls;
