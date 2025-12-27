/**
 * Quality Suggestion Content Component
 *
 * Displays the main content of a quality suggestion including:
 * - Diff or raw view of original vs suggested text
 * - Coaching questions (if available)
 */

import React from 'react';
import { Box, Typography } from '@mui/material';
import { CoachingQuestion } from '../../../types/ai';
import { SemanticDiff } from './SemanticDiff';
import { ContentDisplayBox } from './ContentDisplayBox';
import { OriginalSuggestedDisplay } from './OriginalSuggestedDisplay';

interface QualitySuggestionContentProps {
  original: string;
  suggested: string;
  htmlDiff: string;
  viewMode: 'diff' | 'raw';
  coachingQuestions?: CoachingQuestion[];
}

/**
 * QualitySuggestionContent - Content section for quality suggestions
 *
 * Displays the diff or raw view of the suggestion and optional coaching questions.
 */
export const QualitySuggestionContent: React.FC<QualitySuggestionContentProps> = ({
  original,
  suggested,
  htmlDiff,
  viewMode,
  coachingQuestions,
}) => {
  return (
    <Box sx={{ mb: 2 }}>
      <ContentDisplayBox>
        {viewMode === 'diff' && htmlDiff && htmlDiff.trim() !== '' ? (
          <SemanticDiff htmlDiff={htmlDiff} />
        ) : (
          <OriginalSuggestedDisplay
            original={original}
            suggested={suggested}
          />
        )}
      </ContentDisplayBox>

      {/* Coaching Questions (if present) */}
      {coachingQuestions && coachingQuestions.length > 0 && (
        <Box sx={{ mb: 1.5, mt: 1.5 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 400, mb: 1, display: 'block' }}>
            Consider these questions to further improve:
          </Typography>
          {coachingQuestions.map((q, idx) => (
            <Typography key={idx} variant="body2" sx={{ mb: 0.5, pl: 2 }}>
              • {q.question}
            </Typography>
          ))}
        </Box>
      )}
    </Box>
  );
};
