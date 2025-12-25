/**
 * Suggestion Utility Functions
 *
 * Shared utility functions used across CV AI suggestion components.
 * Provides consistent behavior for color coding, field labeling, and scoring.
 */

/**
 * Get color for importance level
 * @param importance - 'highly_recommended' | 'standard'
 * @returns Material-UI color variant
 */
export const getImportanceColor = (importance: string): 'error' | 'warning' => {
  if (importance === 'highly_recommended') return 'error';
  return 'warning';
};

/**
 * Get human-readable label for field name
 * @param fieldName - Field name (e.g., 'company', 'position', 'start_date')
 * @returns Formatted label (e.g., 'Company', 'Position', 'Start Date')
 */
export const getFieldLabel = (fieldName: string): string => {
  const labels: Record<string, string> = {
    company: 'Company',
    position: 'Position',
    institution: 'Institution',
    degree: 'Degree',
    location: 'Location',
    description: 'Description',
    start_date: 'Start Date',
    end_date: 'End Date',
  };
  return labels[fieldName] || fieldName.charAt(0).toUpperCase() + fieldName.slice(1).replace(/_/g, ' ');
};

/**
 * Get color for quality score
 * @param score - Quality score (0-100)
 * @param thresholds - Optional custom thresholds [warning, error]. Default: [30, 0]
 * @returns Material-UI color variant
 */
export const getScoreColor = (
  score: number,
  thresholds: { warning?: number } = {}
): 'error' | 'warning' => {
  const { warning = 30 } = thresholds;
  if (score >= warning) return 'warning';
  return 'error';
};

/**
 * Get color for content score (with success option)
 * @param score - Content score (0-100)
 * @param thresholds - Optional custom thresholds [success, warning, error]. Default: [80, 60, 0]
 * @returns Material-UI color variant
 */
export const getContentScoreColor = (
  score: number,
  thresholds: { success?: number; warning?: number } = {}
): 'success' | 'warning' | 'error' => {
  const { success = 80, warning = 60 } = thresholds;
  if (score >= success) return 'success';
  if (score >= warning) return 'warning';
  return 'error';
};
