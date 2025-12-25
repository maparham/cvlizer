/**
 * Correction Helpers Utility
 *
 * Pure utility functions for correction metadata and display.
 */

/**
 * Get color for content score based on score value
 * @param score - Quality score (0-100)
 * @returns Material-UI color variant
 */
export function getContentScoreColor(score: number): "success" | "warning" | "error" {
  if (score >= 80) return "success";
  if (score >= 60) return "warning";
  return "error";
}
