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
 * - Fix adjacent markdown elements for proper parsing
 *
 * Usage:
 * - Pass markdown_diff string from AI suggestion
 * - Component automatically renders markdown with diff styling
 */

import React, { useMemo } from "react";
import { Box } from "@mui/material";
import MarkdownRenderer from "../../common/MarkdownRenderer";

interface SemanticDiffProps {
  markdownDiff: string;
  className?: string;
}

/**
 * Pre-processes markdown diff to fix adjacent markdown elements.
 * react-markdown requires spaces between adjacent markdown elements to parse correctly.
 *
 * Fixes:
 * - ~~old~~**new** → ~~old~~ **new** (adjacent strikethrough and bold)
 * - **old**~~new~~ → **old** ~~new~~ (adjacent bold and strikethrough)
 * - **text****text** → **text** **text** (consecutive bold blocks)
 * - text~~strikethrough~~ → text ~~strikethrough~~ (text before strikethrough)
 * - ~~strikethrough~~text → ~~strikethrough~~ text (text after strikethrough)
 * - text**bold** → text **bold** (text before bold)
 * - **bold**text → **bold** text (text after bold)
 *
 * Uses parity checking to distinguish between opening and closing markers:
 * - Even count of markers before = opening marker → add space before
 * - Odd count of markers before = closing marker → add space after
 *
 * @param markdown - Raw markdown diff string
 * @returns Processed markdown with proper spacing for react-markdown parsing
 */
function normalizeMarkdownDiff(markdown: string): string {
  // Simple approach: just add spaces around markdown markers where needed
  let result = markdown;

  // Step 0: Convert literal \n to actual newlines (backend might send escaped newlines)
  result = result.replace(/\\n/g, '\n');

  // Step 1: ~~text~~**text** → ~~text~~ **text**
  result = result.replace(/~~(\*\*)/g, "~~ $1");

  // Step 2: **text**~~text~~ → **text** ~~text~~
  result = result.replace(/\*\*(~~)/g, "** $1");

  // Step 2.5: **text****text** → **text** **text** (consecutive bold blocks)
  result = result.replace(/\*\*\*\*/g, "** **");

  // Step 2.75: Handle ~~strikethrough~~ adjacent to text using parity checking
  result = result.replace(/([^\s])(~~)([^\s])/g, (_match, p1, p2, p3, offset, string) => {
    // Skip if already has space
    if (p1 === ' ') {
      return `${p1}${p2}${p3}`;
    }

    // Count ~~ before this position to determine if this is OPENING or CLOSING
    const before = string.substring(0, offset + p1.length);
    const tildeCount = (before.match(/~~/g) || []).length;

    // If even number of ~~ before, we're at OPENING ~~
    // If odd number, we're at CLOSING ~~
    if (tildeCount % 2 === 0) {
      // OPENING: add space before ~~
      return `${p1} ${p2}${p3}`;
    } else {
      // CLOSING: add space after ~~
      return `${p1}${p2} ${p3}`;
    }
  });

  // Step 3: char**char** → char **char**
  // Match: any non-space char + ** + any non-space char
  // Use parity to determine if ** is OPENING or CLOSING
  result = result.replace(/([^\s])\*\*([^\s])/g, (_match, p1, p2, offset, string) => {
    // Skip if already has space before ** (from previous replacements)
    if (p1 === ' ') {
      return `${p1}**${p2}`;
    }

    // Check if this ** is OPENING or CLOSING by counting ** before this position
    const before = string.substring(0, offset + p1.length);
    const asteriskCount = (before.match(/\*\*/g) || []).length;

    // If even number of ** before this one, we're at OPENING **
    // If odd number, we're at CLOSING **
    if (asteriskCount % 2 === 0) {
      // OPENING: add space before **
      return `${p1} **${p2}`;
    } else {
      // CLOSING: add space after **
      return `${p1}** ${p2}`;
    }
  });

  return result;
}

/**
 * Renders markdown diff visualization from AI-generated markdown string
 */
export const SemanticDiff: React.FC<SemanticDiffProps> = ({
  markdownDiff,
  className,
}) => {
  // Pre-process the markdown to fix adjacent elements
  const normalizedMarkdown = useMemo(
    () => normalizeMarkdownDiff(markdownDiff),
    [markdownDiff]
  );

  if (!markdownDiff || markdownDiff.trim() === "") {
    return null;
  }

  return (
    <Box className={className} sx={{ lineHeight: 1.6 }}>
      <MarkdownRenderer content={normalizedMarkdown} variant="body2" diffMode={true} />
    </Box>
  );
};

export default SemanticDiff;
