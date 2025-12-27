/**
 * AI Summary Suggestion Card Component
 *
 * Displays AI-generated professional summary suggestions with:
 * - Header with title, tooltip, and dismiss button
 * - Diff view or side-by-side comparison
 * - Key changes displayed as chips
 * - Apply and Reject action buttons
 *
 * This component extracts duplicated code from ProfessionalSummarySection
 * to eliminate ~120 lines of duplication between edit and display modes.
 */

import React from "react";
import {
  Box,
  Button,
  Chip,
  Typography,
  Tooltip,
  IconButton,
  Divider,
} from "@mui/material";
import {
  Add as AddIcon,
  Close as CloseIcon,
  InfoOutlined as InfoIcon,
} from "@mui/icons-material";
import SemanticDiff from "./SemanticDiff";

interface AISummarySuggestionCardProps {
  suggestion: {
    html_diff?: string;
    original_text: string;
    suggested_text: string;
    key_changes?: string[];
  };
  onApply: (suggestedText: string) => void | Promise<void>;
  onDismiss: () => void | Promise<void>;
}

/**
 * AISummarySuggestionCard - Reusable card for AI summary suggestions
 *
 * Displays the AI-generated professional summary improvement with
 * visual diff and action buttons.
 */
export const AISummarySuggestionCard: React.FC<AISummarySuggestionCardProps> = ({
  suggestion,
  onApply,
  onDismiss,
}) => {
  const hasDiff = suggestion.html_diff && suggestion.html_diff.trim() !== "";

  const handleApply = async () => {
    await onApply(suggestion.suggested_text);
  };

  const handleDismiss = async () => {
    await onDismiss();
  };

  return (
    <Box
      sx={{
        mt: 2,
        p: { xs: 1.5, sm: 2 },
        backgroundColor: (theme) =>
          theme.palette.mode === 'dark'
            ? 'rgba(33, 150, 243, 0.08)'
            : 'rgba(33, 150, 243, 0.08)',
        border: '1px solid',
        borderColor: 'info.main',
        borderRadius: 1,
      }}
    >
      {/* Header */}
      <Box display="flex" alignItems="center" mb={1}>
        <Typography
          variant="subtitle2"
          sx={{ fontWeight: "bold", color: "info.main" }}
        >
          AI Suggested Professional Summary
        </Typography>
        <Tooltip title="AI-generated improvement based on job description">
          <InfoIcon sx={{ ml: 1, fontSize: 16, color: "info.main" }} />
        </Tooltip>
        <IconButton
          size="small"
          onClick={handleDismiss}
          sx={{ ml: "auto", color: "text.secondary" }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* Diff or Side-by-Side Comparison */}
      <Box sx={{ mb: 2, lineHeight: 1.6 }}>
        {hasDiff ? (
          <SemanticDiff htmlDiff={suggestion.html_diff || ''} />
        ) : (
          <Box>
            <Typography variant="caption" sx={{ fontWeight: "bold" }}>
              Original:
            </Typography>
            <Typography variant="body2" sx={{ mb: 1 }}>
              {suggestion.original_text}
            </Typography>
            <Divider sx={{ my: 1 }} />
            <Typography variant="caption" sx={{ fontWeight: "bold" }}>
              Suggested:
            </Typography>
            <Typography variant="body2">
              {suggestion.suggested_text}
            </Typography>
          </Box>
        )}
      </Box>

      {/* Key Changes */}
      {suggestion.key_changes && suggestion.key_changes.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Typography
            variant="caption"
            sx={{ fontWeight: "bold", color: "text.secondary" }}
          >
            Key improvements:
          </Typography>
          <Box sx={{ mt: 0.5 }}>
            {suggestion.key_changes.map((change, index) => (
              <Chip
                key={index}
                label={change}
                size="small"
                color="success"
                variant="outlined"
                sx={{
                  mr: { xs: 0.25, sm: 0.5 },
                  mb: { xs: 0.25, sm: 0.5 },
                  fontSize: { xs: "0.7rem", sm: "0.75rem" },
                }}
              />
            ))}
          </Box>
        </Box>
      )}

      {/* Action Buttons */}
      <Box sx={{ display: "flex", gap: 1 }}>
        <Button
          variant="contained"
          size="small"
          color="success"
          startIcon={<AddIcon />}
          onClick={handleApply}
          sx={{
            textTransform: "none",
          }}
        >
          Apply Suggestion
        </Button>
        <Button
          variant="outlined"
          size="small"
          color="error"
          onClick={handleDismiss}
          sx={{
            textTransform: "none",
          }}
        >
          Reject
        </Button>
      </Box>
    </Box>
  );
};
