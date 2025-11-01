/**
 * Item Description Suggestion Component
 *
 * Displays an AI-generated suggestion for improving a work experience or education item description.
 * Shows original vs suggested description with reasoning, and provides apply/discard actions.
 */

import React from "react";
import {
  Box,
  Typography,
  Button,
  IconButton,
  Tooltip,
} from "@mui/material";
import {
  Add as AddIcon,
  Close as CloseIcon,
  Info as InfoIcon,
} from "@mui/icons-material";
import { ItemDescriptionSuggestion as ItemDescriptionSuggestionType } from "../../../types/ai";
import MarkdownRenderer from "../../common/MarkdownRenderer";

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
      <Box display="flex" alignItems="center" mb={1}>
        <Typography
          variant="subtitle2"
          sx={{ fontWeight: "bold", color: "#1976d2" }}
        >
          AI Suggestion
        </Typography>
        <Tooltip title="AI-generated improvement based on job description">
          <InfoIcon sx={{ ml: 1, fontSize: 16, color: "#1976d2" }} />
        </Tooltip>
        <IconButton
          size="small"
          onClick={onDiscard}
          sx={{ ml: "auto", color: "#666" }}
          disabled={isLoading}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* Suggested Description */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="body2" sx={{ fontWeight: "bold", mb: 0.5 }}>
          Suggested Description:
        </Typography>
        <Box
          sx={{
            p: 1.5,
            backgroundColor: "white",
            border: "1px solid #ddd",
            borderRadius: 1,
            lineHeight: 1.6,
          }}
        >
          <MarkdownRenderer
            content={suggestion.suggested}
            variant="body2"
          />
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
