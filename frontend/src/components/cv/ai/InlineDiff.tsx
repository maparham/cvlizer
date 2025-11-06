/**
 * Inline Diff Component
 *
 * Renders GitHub-style inline diff visualization showing text changes.
 * Displays removed text with red strikethrough and added text with green highlight.
 *
 * Key responsibilities:
 * - Render diff parts with appropriate styling (removed/added/unchanged)
 * - Provide accessible text rendering
 * - Handle edge cases (empty content, no changes)
 *
 * Usage:
 * - Pass original and suggested text content
 * - Component automatically computes and renders the diff
 */

import React from "react";
import { Box, styled } from "@mui/material";
import { computeInlineDiff, DiffPart } from "../../../utils/textDiff";

interface InlineDiffProps {
  original: string;
  suggested: string;
  className?: string;
}

const DiffContainer = styled(Box)({
  display: "inline",
  lineHeight: 1.6,
});

const RemovedText = styled("span")({
  backgroundColor: "#ffebee",
  color: "#c62828",
  textDecoration: "line-through",
  padding: "2px 0",
  borderRadius: "2px",
});

const AddedText = styled("span")({
  backgroundColor: "#e8f5e9",
  color: "#2e7d32",
  padding: "2px 0",
  borderRadius: "2px",
});

const UnchangedText = styled("span")({
  // Normal text styling - no special formatting
});

/**
 * Renders inline diff visualization
 */
export const InlineDiff: React.FC<InlineDiffProps> = ({
  original,
  suggested,
  className,
}) => {
  const diffParts = React.useMemo(() => {
    return computeInlineDiff(original, suggested);
  }, [original, suggested]);

  return (
    <DiffContainer className={className}>
      {diffParts.map((part: DiffPart, index: number) => {
        if (part.removed) {
          return (
            <RemovedText key={`removed-${index}`}>{part.value}</RemovedText>
          );
        }
        if (part.added) {
          return <AddedText key={`added-${index}`}>{part.value}</AddedText>;
        }
        return (
          <UnchangedText key={`unchanged-${index}`}>{part.value}</UnchangedText>
        );
      })}
    </DiffContainer>
  );
};

export default InlineDiff;
