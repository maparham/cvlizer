/**
 * Quality Item Suggestion Component
 *
 * Displays quality-based suggestions for work experience and education items.
 * Shows quality score, suggested improvements, and markdown diff view.
 * Similar to ItemDescriptionSuggestion but focused on quality, not job fit.
 */

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Chip,
  Alert,
} from '@mui/material';
import { LowQualityItem } from '../../../types/ai';
import { useCVQualityStore } from '../../../stores/cvQualityStore';
import { SemanticDiff } from './SemanticDiff';
import { SuggestionActionButtons } from './SuggestionActionButtons';
import { ViewModeToggle } from './ViewModeToggle';
import { SuggestionPaper } from './SuggestionPaper';
import { ContentDisplayBox } from './ContentDisplayBox';
import { OriginalSuggestedDisplay } from './OriginalSuggestedDisplay';
import { getScoreColor } from './utils/suggestionUtils';

interface QualityItemSuggestionProps {
  item: LowQualityItem;
  onApply: (suggested: string) => void;
}

export const QualityItemSuggestion: React.FC<QualityItemSuggestionProps> = ({
  item,
  onApply,
}) => {
  const [viewMode, setViewMode] = useState<'diff' | 'raw'>('diff');
  const { dismissWorkExperienceSuggestion, dismissEducationSuggestion } = useCVQualityStore();

  const handleApply = () => {
    onApply(item.suggested);
  };

  const handleDismiss = async () => {
    if (item.section === 'work_experience') {
      await dismissWorkExperienceSuggestion(item.item_id);
    } else if (item.section === 'education') {
      await dismissEducationSuggestion(item.item_id);
    }
  };

  const handleViewModeChange = (_event: React.MouseEvent<HTMLElement>, newMode: 'diff' | 'raw' | null) => {
    if (newMode !== null) {
      setViewMode(newMode);
    }
  };

  return (
    <SuggestionPaper>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            Quality Suggestion
          </Typography>
          <Chip
            label={`Quality Score: ${item.quality_score}/100`}
            size="small"
            color={getScoreColor(item.quality_score)}
          />
        </Box>
        <ViewModeToggle
          value={viewMode}
          onChange={handleViewModeChange}
        />
      </Box>

      {/* Reasoning */}
      <Alert severity="info" sx={{ mb: 2 }}>
        <Typography variant="body2">{item.reasoning}</Typography>
      </Alert>

      {/* Content Display */}
      <ContentDisplayBox>
        {viewMode === 'diff' ? (
          <SemanticDiff htmlDiff={item.html_diff || ''} />
        ) : (
          <OriginalSuggestedDisplay
            original={item.original}
            suggested={item.suggested}
          />
        )}
      </ContentDisplayBox>

      {/* Coaching Questions (if present) */}
      {item.coaching_questions && item.coaching_questions.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
            Consider these questions to further improve:
          </Typography>
          {item.coaching_questions.map((q, idx) => (
            <Typography key={idx} variant="body2" sx={{ mb: 0.5, pl: 2 }}>
              • {q.question}
            </Typography>
          ))}
        </Box>
      )}

      {/* Actions */}
      <SuggestionActionButtons
        onApply={handleApply}
        onDismiss={handleDismiss}
        variant="standard"
      />
    </SuggestionPaper>
  );
};
