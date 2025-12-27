/**
 * Item Description Suggestion Component
 *
 * Displays an AI-generated suggestion for improving a work experience or education item description.
 * Shows original vs suggested description with reasoning, and provides apply/discard actions.
 */

import React, { useState } from "react";
import {
  Box,
  Typography,
  Button,
  IconButton,
  Tooltip,
  Chip,
  Divider,
} from "@mui/material";
import {
  Add as AddIcon,
  Close as CloseIcon,
  Info as InfoIcon,
} from "@mui/icons-material";
import { ItemDescriptionSuggestion as ItemDescriptionSuggestionType } from "../../../types/ai";
import MarkdownRenderer from "../../common/MarkdownRenderer";
import SemanticDiff from "./SemanticDiff";
import { ViewModeToggle } from "./ViewModeToggle";
import { OriginalSuggestedDisplay } from "./OriginalSuggestedDisplay";
import { getContentScoreColor } from "./utils/suggestionUtils";

interface ItemDescriptionSuggestionProps {
  suggestion: ItemDescriptionSuggestionType;
  onApply: () => void;
  onDiscard: () => void;
  isLoading?: boolean;
}

const ItemDescriptionSuggestion: React.FC<ItemDescriptionSuggestionProps> = ({
  suggestion,
  onApply,
  onDiscard,
  isLoading = false,
}) => {
  const [viewMode, setViewMode] = useState<"diff" | "raw">("diff");

  const handleViewModeChange = (
    _event: React.MouseEvent<HTMLElement>,
    newViewMode: "diff" | "raw" | null,
  ) => {
    if (newViewMode !== null) {
      setViewMode(newViewMode);
    }
  };

  return (
    <Box
      sx={{
        mt: 2,
        p: { xs: 1.5, sm: 2 },
        backgroundColor: "#E3F2FD",
        border: "1px solid #BBDEFB",
        borderRadius: 1,
      }}
    >
      <Box display="flex" alignItems="center" mb={1} flexWrap="wrap" gap={1}>
        <Typography
          variant="subtitle2"
          sx={{ fontWeight: "bold", color: "#1976d2" }}
        >
          AI Suggestion
        </Typography>
        <Tooltip title="This content needs more relevance to the job description. See suggestions below.">
          <InfoIcon sx={{ ml: 1, fontSize: 16, color: "#1976d2" }} />
        </Tooltip>
        {/* Content Quality Score */}
        <Tooltip
          title="Quality score (0-100) based on how well the story is told and confidence of presentation"
        >
          <Chip
            label={`Score: ${suggestion.current_content_score}/100`}
            color={getContentScoreColor(suggestion.current_content_score)}
            size="small"
            variant="filled"
            sx={{ ml: 1 }}
          />
        </Tooltip>
        <ViewModeToggle
          value={viewMode}
          onChange={handleViewModeChange}
          variant="compare"
          sx={{ ml: "auto" }}
        />
        <IconButton
          size="small"
          onClick={onDiscard}
          sx={{ color: "#666" }}
          disabled={isLoading}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* Suggested Description */}
      <Box sx={{ mb: 2 }}>
        <Box
          sx={{
            p: 1.5,
            backgroundColor: "white",
            border: "1px solid #ddd",
            borderRadius: 1,
            lineHeight: 1.6,
          }}
        >
          {viewMode === "diff" ? (
            suggestion.html_diff && suggestion.html_diff.trim() !== "" ? (
              <SemanticDiff htmlDiff={suggestion.html_diff} />
            ) : (
              // No diff available - show side-by-side comparison
              <OriginalSuggestedDisplay
                original={suggestion.original || ""}
                suggested={suggestion.suggested || ""}
                originalLabel="Original:"
                suggestedLabel="Suggested:"
                renderOriginal={(content) => (
                  <>
                    <MarkdownRenderer content={content} variant="body2" />
                    <Divider sx={{ my: 1 }} />
                  </>
                )}
                renderSuggested={(content) => (
                  <MarkdownRenderer content={content} variant="body2" />
                )}
              />
            )
          ) : (
            <MarkdownRenderer content={suggestion.suggested || ""} variant="body2" />
          )}
        </Box>
      </Box>

      {/* Reasoning */}
      <Box sx={{ mb: 2 }}>
        <Typography
          variant="caption"
          sx={{ fontWeight: "bold", color: "#666", display: "block", mb: 0.5 }}
        >
          Why this helps:
        </Typography>
        <Typography variant="body2" sx={{ color: "#666", lineHeight: 1.6 }}>
          {suggestion.reasoning}
        </Typography>
      </Box>

      {/* Action Buttons */}
      <Box sx={{ display: "flex", gap: 1 }}>
        <Button
          variant="contained"
          size="small"
          startIcon={<AddIcon />}
          onClick={onApply}
          disabled={isLoading}
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
          onClick={onDiscard}
          disabled={isLoading}
          startIcon={<CloseIcon />}
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
          Discard
        </Button>
      </Box>
    </Box>
  );
};

export default ItemDescriptionSuggestion;
