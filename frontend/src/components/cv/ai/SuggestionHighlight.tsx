/**
 * Suggestion Highlight Component
 *
 * This component provides visual highlighting for AI suggestions within the CV editor.
 * It wraps content that has suggested changes and applies appropriate styling based on
 * the suggestion type and status.
 *
 * Key responsibilities:
 * - Apply color coding for different suggestion types (addition, modification, removal)
 * - Show visual indicators for suggestion status (pending, approved, rejected)
 * - Handle hover states and interaction feedback
 * - Provide accessibility features for screen readers
 * - Support different highlight modes (all, pending, approved)
 *
 * Usage:
 * - Wrap content that has suggestions with this component
 * - Pass the relevant suggestion data for styling
 * - Component automatically handles highlighting based on diff context
 */

import React, { ReactNode, useState } from "react";
import { Box, Tooltip, Chip, styled } from "@mui/material";
import {
  CheckCircle,
  Cancel,
  Pending,
  Add,
  Edit,
  Delete,
} from "@mui/icons-material";
import { useInlineDiffContext } from "../../../contexts/InlineDiffContext";
import { AISuggestion } from "../../../types/ai";
import { SemanticDiff } from "./SemanticDiff";
import { originalAndSuggestedToHtmlDiff } from "../../../utils/textDiff";

interface SuggestionHighlightProps {
  children: ReactNode;
  suggestion?: AISuggestion;
  section: string;
  fieldPath?: string;
  isNewContent?: boolean;
  className?: string;
}

const HighlightWrapper = styled(Box)<{
  changeType: "addition" | "modification" | "removal";
  status: "pending" | "approved" | "rejected";
  isHovered: boolean;
}>(({ theme, changeType, status, isHovered }) => {
  const getBackgroundColor = () => {
    if (status === "rejected") return "transparent";

    switch (changeType) {
      case "addition":
        return status === "approved"
          ? theme.palette.success.light
          : theme.palette.success.main;
      case "modification":
        return status === "approved"
          ? theme.palette.warning.light
          : theme.palette.warning.main;
      case "removal":
        return status === "approved"
          ? theme.palette.error.light
          : theme.palette.error.main;
      default:
        return "transparent";
    }
  };

  const getBorderColor = () => {
    if (status === "rejected") return theme.palette.grey[400];

    switch (changeType) {
      case "addition":
        return theme.palette.success.dark;
      case "modification":
        return theme.palette.warning.dark;
      case "removal":
        return theme.palette.error.dark;
      default:
        return "transparent";
    }
  };

  return {
    position: "relative",
    backgroundColor: getBackgroundColor(),
    border: `2px solid ${getBorderColor()}`,
    borderRadius: theme.shape.borderRadius,
    padding: theme.spacing(0.5),
    margin: theme.spacing(0.25),
    transition: theme.transitions.create(
      ["background-color", "border-color", "box-shadow"],
      {
        duration: theme.transitions.duration.short,
      },
    ),
    cursor: "pointer",
    opacity: status === "rejected" ? 0.5 : 1,
    textDecoration: changeType === "removal" ? "line-through" : "none",

    "&:hover": {
      boxShadow: theme.shadows[2],
      transform: "translateY(-1px)",
    },

    ...(isHovered && {
      boxShadow: theme.shadows[4],
      transform: "translateY(-2px)",
    }),
  };
});

const StatusIndicator = styled(Box)(({ theme }) => ({
  position: "absolute",
  top: -8,
  right: -8,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: 20,
  height: 20,
  borderRadius: "50%",
  backgroundColor: theme.palette.background.paper,
  border: `2px solid ${theme.palette.divider}`,
  zIndex: 1,
}));

const getStatusIcon = (
  status: "pending" | "approved" | "rejected",
  size = "small" as const,
) => {
  switch (status) {
    case "approved":
      return <CheckCircle color="success" fontSize={size} />;
    case "rejected":
      return <Cancel color="error" fontSize={size} />;
    case "pending":
    default:
      return <Pending color="warning" fontSize={size} />;
  }
};

const getChangeTypeIcon = (
  changeType: "addition" | "modification" | "removal",
  size = "small" as const,
) => {
  switch (changeType) {
    case "addition":
      return <Add color="success" fontSize={size} />;
    case "modification":
      return <Edit color="warning" fontSize={size} />;
    case "removal":
      return <Delete color="error" fontSize={size} />;
    default:
      return null;
  }
};

export const SuggestionHighlight: React.FC<SuggestionHighlightProps> = ({
  children,
  suggestion,
  section: _section,
  fieldPath: _fieldPath,
  isNewContent: _isNewContent = false,
  className,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const {
    isInDiffMode,
    highlightMode,
    getSuggestionsBySection: _getSuggestionsBySection,
    acceptSuggestion,
    rejectSuggestion: _rejectSuggestion,
  } = useInlineDiffContext();

  // If not in diff mode or no suggestion, render children normally
  if (!isInDiffMode || !suggestion) {
    return <>{children}</>;
  }

  // Check if this suggestion should be highlighted based on current mode
  const shouldHighlight = () => {
    switch (highlightMode) {
      case "pending":
        return suggestion.status === "pending";
      case "approved":
        return suggestion.status === "approved";
      case "all":
      default:
        return true;
    }
  };

  if (!shouldHighlight()) {
    return <>{children}</>;
  }

  const handleClick = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    if (suggestion.status === "pending") {
      // Show context menu or quick actions
      // For now, just accept the suggestion on click
      acceptSuggestion(suggestion.id);
    }
  };

  const getTooltipContent = () => {
    return (
      <Box>
        <Box sx={{ mb: 1, fontWeight: "bold" }}>{suggestion.description}</Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
          {getChangeTypeIcon(suggestion.changeType)}
          <Chip
            label={suggestion.changeType}
            size="small"
            color={
              suggestion.changeType === "addition"
                ? "success"
                : suggestion.changeType === "modification"
                  ? "warning"
                  : "error"
            }
          />
        </Box>
        <Box sx={{ fontSize: "0.875rem", color: "text.secondary" }}>
          Section: {suggestion.section}
          {suggestion.fieldPath && ` • Field: ${suggestion.fieldPath}`}
        </Box>
        {suggestion.status === "pending" && (
          <Box sx={{ mt: 1, fontSize: "0.75rem", fontStyle: "italic" }}>
            Click to approve, right-click for options
          </Box>
        )}
      </Box>
    );
  };

  // Determine content to render
  const renderContent = () => {
    // For modifications with text content, show semantic diff
    if (
      suggestion.changeType === "modification" &&
      suggestion.type === "enhance_content" &&
      typeof suggestion.originalValue === "string" &&
      typeof suggestion.suggestedValue === "string" &&
      suggestion.originalValue.trim() &&
      suggestion.suggestedValue.trim()
    ) {
      const htmlDiff = originalAndSuggestedToHtmlDiff(
        suggestion.originalValue,
        suggestion.suggestedValue,
      );
      return <SemanticDiff htmlDiff={htmlDiff} />;
    }
    // For other cases (additions, removals, or non-text modifications), use children
    return <>{children}</>;
  };

  return (
    <Tooltip title={getTooltipContent()} placement="top" arrow enterDelay={300}>
      <HighlightWrapper
        changeType={suggestion.changeType}
        status={suggestion.status}
        isHovered={isHovered}
        className={className}
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        role="button"
        tabIndex={0}
        aria-label={`AI suggestion: ${suggestion.description}`}
        aria-describedby={`suggestion-${suggestion.id}`}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            handleClick(e as React.MouseEvent);
          }
        }}
      >
        <StatusIndicator>
          {getStatusIcon(suggestion.status, "small")}
        </StatusIndicator>
        {renderContent()}
      </HighlightWrapper>
    </Tooltip>
  );
};

// Helper component for highlighting individual keywords or text segments
interface HighlightedTextProps {
  text: string;
  suggestions: AISuggestion[];
  section: string;
  fieldPath?: string;
}

export const HighlightedText: React.FC<HighlightedTextProps> = ({
  text,
  suggestions,
  section,
  fieldPath,
}) => {
  const { isInDiffMode } = useInlineDiffContext();

  if (!isInDiffMode || suggestions.length === 0) {
    return <>{text}</>;
  }

  // For now, highlight the entire text if there are suggestions
  // In a more advanced implementation, we could highlight specific parts
  const relevantSuggestion = suggestions.find(
    (s) => s.section === section && (s.fieldPath === fieldPath || !s.fieldPath),
  );

  if (!relevantSuggestion) {
    return <>{text}</>;
  }

  return (
    <SuggestionHighlight
      suggestion={relevantSuggestion}
      section={section}
      fieldPath={fieldPath}
    >
      {text}
    </SuggestionHighlight>
  );
};

export default SuggestionHighlight;
