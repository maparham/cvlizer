/**
 * Semantic Diff Component
 *
 * Renders AI-generated HTML diff showing text changes.
 * Displays removed text with <del> tags and added text with <ins> tags.
 *
 * Key responsibilities:
 * - Render HTML diff string with safe HTML parsing
 * - Handle edge cases (empty diff, missing data)
 * - Style diff elements for visual clarity
 *
 * Usage:
 * - Pass html_diff string from AI suggestion
 * - Component automatically renders HTML with diff styling
 */

import React, { useMemo } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import DOMPurify from 'dompurify';

interface SemanticDiffProps {
  htmlDiff: string;
  className?: string;
}

/**
 * Processes HTML diff string to convert newlines to <br> tags for proper rendering.
 *
 * @param htmlDiff - Raw HTML diff string from AI
 * @returns Processed HTML ready for rendering
 */
function processHtmlDiff(htmlDiff: string): string {
  if (!htmlDiff) return "";

  // Convert newlines to <br> tags for HTML rendering
  return htmlDiff.replace(/\n/g, '<br>');
}

/**
 * Renders HTML diff visualization from AI-generated HTML string
 */
export const SemanticDiff: React.FC<SemanticDiffProps> = ({
  htmlDiff,
  className,
}) => {
  // Process and sanitize HTML
  const sanitizedHtml = useMemo(() => {
    if (!htmlDiff || htmlDiff.trim() === "") return "";

    const processed = processHtmlDiff(htmlDiff);

    // Sanitize HTML to prevent XSS, allowing only del and ins tags
    return DOMPurify.sanitize(processed, {
      ALLOWED_TAGS: ['del', 'ins', 'br'],
      ALLOWED_ATTR: [],
    });
  }, [htmlDiff]);

  if (!sanitizedHtml) {
    return null;
  }

  return (
    <Box
      className={className}
      sx={{
        lineHeight: 1.6,
        '& del': {
          backgroundColor: '#ffebee',
          color: '#c62828',
          textDecoration: 'line-through',
          padding: '2px 4px',
          borderRadius: '2px',
        },
        '& ins': {
          backgroundColor: '#e8f5e9',
          color: '#2e7d32',
          fontWeight: 500,
          textDecoration: 'none',
          padding: '2px 4px',
          borderRadius: '2px',
        },
      }}
    >
      <Typography
        component="div"
        variant="body2"
        dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
      />
    </Box>
  );
};

export default SemanticDiff;
