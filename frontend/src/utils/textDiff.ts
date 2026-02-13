/**
 * Text Diff Utility
 *
 * Provides functions for computing text differences between original and suggested content.
 * Used to generate inline diff visualizations for AI suggestions.
 */

import { diffWords, Change } from "diff";

/**
 * Represents a single part of a diff with its change type
 */
export interface DiffPart {
  value: string;
  added?: boolean;
  removed?: boolean;
}

/**
 * Computes an inline diff between original and suggested text
 * Uses word-level diffing for better readability
 *
 * @param original - The original text content
 * @param suggested - The suggested text content
 * @returns Array of diff parts with added/removed flags
 */
export function computeInlineDiff(
  original: string,
  suggested: string,
): DiffPart[] {
  // Handle empty/null cases
  if (!original && !suggested) {
    return [];
  }
  if (!original) {
    return [{ value: suggested, added: true }];
  }
  if (!suggested) {
    return [{ value: original, removed: true }];
  }

  // Use word-level diffing for better readability
  const changes = diffWords(original, suggested, {
    ignoreWhitespace: false,
  });

  // Convert diff library's Change format to our DiffPart format
  return changes.map((change: Change) => ({
    value: change.value,
    added: change.added || false,
    removed: change.removed || false,
  }));
}

/**
 * Escape HTML special characters for use inside <del>/<ins> tags.
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Build an htmlDiff string from original and suggested text (for SemanticDiff).
 * Uses word-level diff; outputs <del> and <ins> tags.
 */
export function originalAndSuggestedToHtmlDiff(
  original: string,
  suggested: string,
): string {
  const parts = computeInlineDiff(original, suggested);
  return parts
    .map((part) => {
      const escaped = escapeHtml(part.value);
      if (part.removed) return `<del>${escaped}</del>`;
      if (part.added) return `<ins>${escaped}</ins>`;
      return escaped;
    })
    .join("");
}
