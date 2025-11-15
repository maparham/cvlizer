/**
 * Semantic Diff Component
 *
 * Renders AI-generated markdown diff showing text changes.
 * Displays removed text with strikethrough (from markdown ~~strikethrough~~)
 * and added text with bold (from markdown **bold**).
 *
 * Key responsibilities:
 * - Render markdown diff string using MarkdownRenderer
 * - Handle edge cases (empty diff, missing data)
 * - Support Markdown rendering for lists and other block-level content
 *
 * Usage:
 * - Pass markdown_diff string from AI suggestion
 * - Component automatically renders markdown with diff styling
 */

import React from "react";
import { Box } from "@mui/material";
import MarkdownRenderer from "../../common/MarkdownRenderer";

interface SemanticDiffProps {
  markdownDiff: string;
  className?: string;
}

/**
 * Renders markdown diff visualization from AI-generated markdown string
 */
export const SemanticDiff: React.FC<SemanticDiffProps> = ({
  markdownDiff,
  className,
}) => {
  if (!markdownDiff || markdownDiff.trim() === "") {
    return null;
  }

  return (
    <Box className={className} sx={{ lineHeight: 1.6 }}>
      <MarkdownRenderer content={markdownDiff} variant="body2" diffMode={true} />
    </Box>
  );
};

export default SemanticDiff;
