/**
 * Inline Draft Section Component
 *
 * This component displays draft AI-generated sections directly within the CV editor content area.
 * It provides a seamless inline editing experience with visual distinction from regular sections.
 *
 * Key responsibilities:
 * - Display draft content inline within CV structure
 * - Provide approve and reject actions with immediate feedback
 * - Show visual distinction with draft styling
 * - Handle loading states and error feedback
 * - Integrate seamlessly with CV editor flow
 *
 * Usage:
 * - Rendered inline within CVContentArea alongside regular sections
 * - Shows drafts in appropriate locations based on section type
 * - Provides immediate approval/rejection without page refresh
 */

import React, { useState, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import {
  Box,
  Paper,
  Typography,
  Button,
  Chip,
  Stack,
  CircularProgress,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Fade,
  IconButton,
  Tooltip,
  Alert,
} from "@mui/material";
import {
  Check as CheckIcon,
  Close as CloseIcon,
  ExpandMore as ExpandMoreIcon,
  AutoAwesome as AutoAwesomeIcon,
  Schedule as ScheduleIcon,
  Psychology as PsychologyIcon,
  ContentCopy as ContentCopyIcon,
} from "@mui/icons-material";
import { useAIStore } from "../../../stores/ai";
import { useNotifications } from "../../../packages/notifications";
import { useCVEditor } from "../../../contexts/CVEditorContext";
import { useCVStore } from "../../../stores/cv";
import { DraftResponse } from "../../../types/ai";

interface InlineDraftSectionProps {
  cvId: string;
  draft: DraftResponse;
  onApproved?: () => void;
  onRejected?: () => void;
}

const InlineDraftSection: React.FC<InlineDraftSectionProps> = ({
  cvId,
  draft,
  onApproved,
  onRejected,
}) => {
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

  const { approveWhyGoodFitDraft, deleteWhyGoodFitDraft } = useAIStore();
  const { showSuccess, showError } = useNotifications();
  const { onUpdateCV } = useCVEditor();
  const { setCurrentCV } = useCVStore();

  const handleApprove = useCallback(async () => {
    setIsApproving(true);
    try {
      // Backend returns: { message: string, cv: CV }
      const result = await approveWhyGoodFitDraft(cvId, draft.id);

      // Update CV store with fresh data from backend
      // This ensures all subsequent saves include the why_good_fit section
      if (result.cv) {
        setCurrentCV(result.cv);

        // Update CV editor context with new parsed_data
        // This updates the local cvData state in the editor
        if (result.cv.parsed_data) {
          onUpdateCV(result.cv.parsed_data);
        }
      }

      showSuccess("Draft approved and added to CV successfully");

      // Notify parent component (triggers UI re-render)
      onApproved?.();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to approve draft";
      showError("Error", errorMessage);
    } finally {
      setIsApproving(false);
    }
  }, [
    cvId,
    draft.id,
    approveWhyGoodFitDraft,
    setCurrentCV,
    onUpdateCV,
    showSuccess,
    showError,
    onApproved,
  ]);

  const handleReject = useCallback(async () => {
    setIsRejecting(true);
    try {
      await deleteWhyGoodFitDraft(cvId);

      showSuccess("Draft discarded successfully");

      // Notify parent component after successful rejection
      onRejected?.();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to discard draft";
      showError("Error", errorMessage);
    } finally {
      setIsRejecting(false);
    }
  }, [cvId, deleteWhyGoodFitDraft, showSuccess, showError, onRejected]);

  const copyToClipboard = useCallback(
    (text: string) => {
      navigator.clipboard.writeText(text);
      showSuccess("Copied to clipboard");
    },
    [showSuccess],
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDuration = (milliseconds: number) => {
    if (milliseconds < 1000) {
      return `${milliseconds}ms`;
    }
    return `${(milliseconds / 1000).toFixed(1)}s`;
  };

  return (
    <Fade in={true} timeout={300}>
      <Box sx={{ mb: 3 }}>
        <Paper
          elevation={2}
          sx={{
            border: "2px solid",
            borderColor: "warning.main",
            backgroundColor: "warning.50",
            position: "relative",
            overflow: "hidden",
            "&::before": {
              content: '""',
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: "4px",
              background: "linear-gradient(90deg, #ff9800, #ffc107, #ff9800)",
              backgroundSize: "200% 100%",
              animation: "shimmer 2s infinite",
            },
            "@keyframes shimmer": {
              "0%": { backgroundPosition: "-200% 0" },
              "100%": { backgroundPosition: "200% 0" },
            },
          }}
        >
          <Box sx={{ p: 3 }}>
            {/* Header */}
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 2,
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Chip
                  icon={<AutoAwesomeIcon />}
                  label="AI Draft"
                  color="warning"
                  size="small"
                  sx={{ fontWeight: 600 }}
                />
                <Typography
                  variant="h6"
                  sx={{ fontWeight: 600, color: "warning.dark" }}
                >
                  {draft.draft_data?.title || "Why I'm a Good Fit"}
                </Typography>
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <Typography variant="caption" color="text.secondary">
                  Generated: {formatDate(draft.created_at)}
                </Typography>
                <Tooltip title="Copy to clipboard">
                  <IconButton
                    size="small"
                    onClick={() =>
                      copyToClipboard(
                        draft.draft_data?.fit_analysis ||
                          draft.draft_data?.content ||
                          "No content available",
                      )
                    }
                  >
                    <ContentCopyIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>

            {/* Main content */}
            <Box
              sx={{
                mb: 2,
                lineHeight: 1.6,
                color: "text.primary",
                "& h1, & h2, & h3, & h4, & h5, & h6": {
                  marginTop: 2,
                  marginBottom: 1,
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
                  marginBottom: 0.5,
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
                {draft.draft_data?.fit_analysis ||
                  draft.draft_data?.content ||
                  "No content available"}
              </ReactMarkdown>
            </Box>

            {/* Low Fit Warning */}
            {draft.draft_data?.low_fit_warning && (
              <Alert
                severity="warning"
                sx={{ mb: 2 }}
                icon={<AutoAwesomeIcon />}
              >
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                  Low Job Match Detected ({draft.draft_data.low_fit_warning.confidence_score}% confidence)
                </Typography>
                <Typography variant="body2">
                  {draft.draft_data.low_fit_warning.message}
                </Typography>
              </Alert>
            )}

            {/* Action buttons */}
            <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
              <Button
                variant="contained"
                color="success"
                startIcon={
                  isApproving ? <CircularProgress size={16} /> : <CheckIcon />
                }
                onClick={handleApprove}
                disabled={isApproving || isRejecting}
                sx={{ textTransform: "none", fontWeight: 600 }}
              >
                {isApproving ? "Approving..." : "Approve & Add to CV"}
              </Button>
              <Button
                variant="outlined"
                color="error"
                startIcon={
                  isRejecting ? <CircularProgress size={16} /> : <CloseIcon />
                }
                onClick={handleReject}
                disabled={isApproving || isRejecting}
                sx={{ textTransform: "none" }}
              >
                {isRejecting ? "Discarding..." : "Discard"}
              </Button>
            </Box>

            {/* Additional details in accordion */}
            <Accordion
              sx={{ boxShadow: "none", "&:before": { display: "none" } }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                sx={{
                  minHeight: "auto",
                  py: 1,
                  "& .MuiAccordionSummary-content": { margin: 0 },
                }}
              >
                <Typography variant="caption" color="text.secondary">
                  View Analysis Details
                </Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ pt: 0 }}>
                <Stack spacing={2}>
                  {/* Confidence Score */}
                  {draft.draft_data?.confidence_score !== undefined && (
                    <Box>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        display="block"
                      >
                        Confidence Score
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {draft.draft_data.confidence_score}%
                      </Typography>
                    </Box>
                  )}

                  {/* Key Matches */}
                  {draft.draft_data?.key_matches?.length > 0 && (
                    <Box>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        display="block"
                        gutterBottom
                      >
                        Key Matches
                      </Typography>
                      <Stack
                        direction="row"
                        spacing={1}
                        flexWrap="wrap"
                        useFlexGap
                      >
                        {draft.draft_data.key_matches.map(
                          (match: string, index: number) => (
                            <Chip
                              key={index}
                              label={match}
                              size="small"
                              variant="outlined"
                              color="success"
                            />
                          ),
                        )}
                      </Stack>
                    </Box>
                  )}

                  {/* Missing Skills */}
                  {draft.draft_data?.missing_skills?.length > 0 && (
                    <Box>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        display="block"
                        gutterBottom
                      >
                        Missing Skills
                      </Typography>
                      <Stack
                        direction="row"
                        spacing={1}
                        flexWrap="wrap"
                        useFlexGap
                      >
                        {draft.draft_data.missing_skills.map(
                          (skill: string, index: number) => (
                            <Chip
                              key={index}
                              label={skill}
                              size="small"
                              variant="outlined"
                              color="error"
                            />
                          ),
                        )}
                      </Stack>
                    </Box>
                  )}

                  {/* Generation Metadata */}
                  <Divider />
                  <Box sx={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                    <Box
                      sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                    >
                      <PsychologyIcon fontSize="small" color="action" />
                      <Typography variant="caption" color="text.secondary">
                        {draft.ai_model}
                      </Typography>
                    </Box>
                    <Box
                      sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                    >
                      <ScheduleIcon fontSize="small" color="action" />
                      <Typography variant="caption" color="text.secondary">
                        {formatDuration(draft.generation_time)}
                      </Typography>
                    </Box>
                    {draft.tokens_used > 0 && (
                      <Typography variant="caption" color="text.secondary">
                        {draft.tokens_used} tokens
                      </Typography>
                    )}
                  </Box>
                </Stack>
              </AccordionDetails>
            </Accordion>
          </Box>
        </Paper>
      </Box>
    </Fade>
  );
};

export default InlineDraftSection;
