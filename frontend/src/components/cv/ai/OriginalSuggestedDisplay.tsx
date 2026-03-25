/**
 * Original Suggested Display Component
 *
 * Reusable component for displaying original vs suggested content side-by-side.
 * Used in AI suggestion components to show before/after comparisons.
 */

import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

interface OriginalSuggestedDisplayProps {
  original: string;
  suggested: string;
  originalLabel?: string;
  suggestedLabel?: string;
  renderOriginal?: (content: string) => React.ReactNode;
  renderSuggested?: (content: string) => React.ReactNode;
}

/**
 * OriginalSuggestedDisplay - Shows original and suggested content side-by-side
 *
 * Displays two sections:
 * - Original content with label
 * - Suggested content with label
 *
 * @param original - Original content text
 * @param suggested - Suggested content text
 * @param originalLabel - Label for original section (default: "Original:")
 * @param suggestedLabel - Label for suggested section (default: "Suggested:")
 * @param renderOriginal - Optional custom renderer for original content
 * @param renderSuggested - Optional custom renderer for suggested content
 */
export const OriginalSuggestedDisplay: React.FC<OriginalSuggestedDisplayProps> = ({
  original,
  suggested,
  originalLabel = 'Original:',
  suggestedLabel = 'Suggested:',
  renderOriginal,
  renderSuggested,
}) => {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
        {originalLabel}
      </Typography>
      {renderOriginal ? (
        renderOriginal(original)
      ) : (
        <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
          {original}
        </Typography>
      )}
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
        {suggestedLabel}
      </Typography>
      {renderSuggested ? (
        renderSuggested(suggested)
      ) : (
        <Typography variant="body2" sx={{ fontWeight: 500 }}>
          {suggested}
        </Typography>
      )}
    </Box>
  );
};
