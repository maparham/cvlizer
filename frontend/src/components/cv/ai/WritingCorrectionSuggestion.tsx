/**
 * Writing Correction Suggestion Component
 *
 * Displays writing corrections from the quality analysis writing_corrections array.
 * Shows markdown_diff for description field corrections and field_corrections
 * for structured field corrections (company, position, institution, degree, etc.).
 */

import React from 'react';
import {
  Box,
  Typography,
  Chip,
  Alert,
  List,
  ListItem,
} from '@mui/material';
import { WritingCorrection } from '../../../types/ai';
import { SemanticDiff } from './SemanticDiff';
import { SuggestionActionButtons } from './SuggestionActionButtons';
import { SuggestionPaper } from './SuggestionPaper';
import { ContentDisplayBox } from './ContentDisplayBox';
import { getImportanceColor, getFieldLabel } from './utils/suggestionUtils';

interface WritingCorrectionSuggestionProps {
  correction: WritingCorrection;
  onApply: (correction: WritingCorrection) => void;
  onDismiss: () => void;
}

export const WritingCorrectionSuggestion: React.FC<WritingCorrectionSuggestionProps> = ({
  correction,
  onApply,
  onDismiss,
}) => {
  const handleApply = () => {
    onApply(correction);
  };

  // Description is now handled through field_corrections with field_name="description"
  // Legacy markdown_diff at WritingCorrection level is deprecated but kept for backward compatibility
  const hasFieldCorrections = correction.field_corrections && correction.field_corrections.length > 0;

  return (
    <SuggestionPaper>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            Writing Correction
          </Typography>
          <Chip
            label={correction.importance === 'highly_recommended' ? 'Highly Recommended' : 'Standard'}
            size="small"
            color={getImportanceColor(correction.importance)}
          />
        </Box>
      </Box>

      {/* Reasoning */}
      <Alert severity="info" sx={{ mb: 2 }}>
        <Typography variant="body2">{correction.reasoning}</Typography>
      </Alert>

      {/* Content Display */}
      {hasFieldCorrections && (
        <ContentDisplayBox>
          {/* Field Corrections (All fields including description) */}
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, fontWeight: 600 }}>
              Field Corrections:
            </Typography>
            <List dense sx={{ pl: 0 }}>
              {correction.field_corrections?.map((fieldCorrection, index) => (
                <ListItem
                  key={index}
                  sx={{
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    py: 1,
                    borderBottom: index < (correction.field_corrections?.length || 0) - 1 ? '1px solid' : 'none',
                    borderColor: 'divider',
                  }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                    {getFieldLabel(fieldCorrection.field_name)}
                  </Typography>
                  <Box sx={{ width: '100%' }}>
                    <SemanticDiff markdownDiff={fieldCorrection.markdown_diff} />
                  </Box>
                </ListItem>
              ))}
            </List>
          </Box>
        </ContentDisplayBox>
      )}

      {/* Actions */}
      <SuggestionActionButtons
        onApply={handleApply}
        onDismiss={onDismiss}
        variant="standard"
      />
    </SuggestionPaper>
  );
};
