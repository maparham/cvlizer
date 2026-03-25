/**
 * Draft Section Component
 *
 * This component displays draft AI-generated sections with approve/discard functionality.
 * It shows draft content with a "Draft" badge and provides buttons to approve or discard.
 *
 * Key responsibilities:
 * - Display draft content with visual indicators
 * - Provide approve and discard actions
 * - Handle loading states and errors
 * - Show draft metadata (generation time, model, etc.)
 *
 * Usage:
 * - Used in CV editor to show pending AI-generated content
 * - Requires cvId and draft data as props
 * - Integrates with AI store for state management
 */

import React, { useState, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardActions from "@mui/material/CardActions";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import ScheduleIcon from "@mui/icons-material/Schedule";
import PsychologyIcon from "@mui/icons-material/Psychology";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { useAIStore } from "../../../stores/ai";
import { useNotifications } from "../../../packages/notifications";
import { DraftResponse } from "../../../types/ai";

interface DraftSectionProps {
  cvId: string;
  draft: DraftResponse;
  onApprove?: () => void;
  onDiscard?: () => void;
}

const DraftSection: React.FC<DraftSectionProps> = ({
  cvId,
  draft,
  onApprove,
  onDiscard,
}) => {
  const [isApproving, setIsApproving] = useState(false);
  const [isDiscarding, setIsDiscarding] = useState(false);

  const { approveWhyGoodFitDraft, deleteWhyGoodFitDraft } = useAIStore();
  const { showSuccess, showError } = useNotifications();

  const handleApprove = useCallback(async () => {
    setIsApproving(true);
    try {
      await approveWhyGoodFitDraft(cvId, draft.id);
      showSuccess("Draft approved and committed successfully");
      onApprove?.();
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
    showSuccess,
    showError,
    onApprove,
  ]);

  const handleDiscard = useCallback(async () => {
    setIsDiscarding(true);
    try {
      await deleteWhyGoodFitDraft(cvId);
      showSuccess("Draft discarded successfully");
      onDiscard?.();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to discard draft";
      showError("Error", errorMessage);
    } finally {
      setIsDiscarding(false);
    }
  }, [cvId, deleteWhyGoodFitDraft, showSuccess, showError, onDiscard]);

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
    <Card
      variant="outlined"
      sx={{
        border: 2,
        borderColor: "warning.main",
        backgroundColor: "warning.50",
        mb: 2,
      }}
    >
      <CardContent>
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
              label="Draft"
              color="warning"
              size="small"
              sx={{ fontWeight: 600 }}
            />
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
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

        {/* Additional details in accordion */}
        <Accordion sx={{ boxShadow: "none", "&:before": { display: "none" } }}>
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
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
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
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
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
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <PsychologyIcon fontSize="small" color="action" />
                  <Typography variant="caption" color="text.secondary">
                    {draft.ai_model}
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
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
      </CardContent>

      <CardActions sx={{ pt: 0, px: 2, pb: 2 }}>
        <Button
          variant="contained"
          color="success"
          startIcon={
            isApproving ? <CircularProgress size={16} /> : <CheckIcon />
          }
          onClick={handleApprove}
          disabled={isApproving || isDiscarding}
          sx={{ textTransform: "none" }}
        >
          {isApproving ? "Approving..." : "Approve"}
        </Button>
        <Button
          variant="outlined"
          color="error"
          startIcon={
            isDiscarding ? <CircularProgress size={16} /> : <CloseIcon />
          }
          onClick={handleDiscard}
          disabled={isApproving || isDiscarding}
          sx={{ textTransform: "none" }}
        >
          {isDiscarding ? "Discarding..." : "Discard"}
        </Button>
      </CardActions>
    </Card>
  );
};

export default DraftSection;
