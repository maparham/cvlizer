/**
 * Unified Quality Suggestion Component
 *
 * Combines quality suggestions and writing corrections into a single unified card.
 * Displays both types of suggestions together when present for the same item.
 */

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Chip,
  Alert,
  List,
  ListItem,
  Divider,
} from '@mui/material';
import { LowQualityItem, WritingCorrection } from '../../../types/ai';
import { SemanticDiff } from './SemanticDiff';
import { SuggestionActionButtons } from './SuggestionActionButtons';
import { ViewModeToggle } from './ViewModeToggle';
import { SuggestionPaper } from './SuggestionPaper';
import { ContentDisplayBox } from './ContentDisplayBox';
import { OriginalSuggestedDisplay } from './OriginalSuggestedDisplay';
import { getScoreColor, getImportanceColor, getFieldLabel } from './utils/suggestionUtils';

interface UnifiedQualitySuggestionProps {
  itemId: string;
  section: 'work_experience' | 'education';
  qualitySuggestion?: LowQualityItem;
  writingCorrections?: WritingCorrection[];
  onApplyQuality?: (suggested: string) => void;
  onDismissQuality?: () => void;
  onApplyWritingCorrection?: (correction: WritingCorrection) => void;
  onDismissWritingCorrection?: (correction: WritingCorrection) => void;
  onApplyAll?: (itemId: string, qualitySuggested?: string, writingCorrections?: WritingCorrection[]) => void;
}

export const UnifiedQualitySuggestion: React.FC<UnifiedQualitySuggestionProps> = ({
  itemId,
  section: _section,
  qualitySuggestion,
  writingCorrections = [],
  onApplyQuality,
  onDismissQuality,
  onApplyWritingCorrection,
  onDismissWritingCorrection,
  onApplyAll,
}) => {
  const [viewMode, setViewMode] = useState<'diff' | 'raw'>('diff');

  const hasQualitySuggestion = !!qualitySuggestion;
  // Writing corrections are now shown inline next to fields, so don't include them in render check
  // const hasWritingCorrections = writingCorrections.length > 0;
  // const hasAnySuggestions = hasQualitySuggestion || hasWritingCorrections;

  // Only render if there's a quality suggestion (writing corrections are shown inline)
  if (!hasQualitySuggestion) {
    return null;
  }

  const handleViewModeChange = (_event: React.MouseEvent<HTMLElement>, newMode: 'diff' | 'raw' | null) => {
    if (newMode !== null) {
      setViewMode(newMode);
    }
  };

  /**
   * Handle Apply All - applies both quality suggestion and all writing corrections
   * Uses atomic apply if available, otherwise falls back to sequential applies
   */
  const handleApplyAll = () => {
    // If onApplyAll is provided, use atomic apply (preferred)
    if (onApplyAll) {
      onApplyAll(
        itemId,
        qualitySuggestion?.suggested,
        writingCorrections.length > 0 ? writingCorrections : undefined
      );
      return;
    }

    // Fallback to sequential applies (may cause conflicts if both update description)
    // Apply quality suggestion first (if present)
    if (qualitySuggestion && onApplyQuality) {
      onApplyQuality(qualitySuggestion.suggested);
    }

    // Apply all writing corrections (if present)
    if (writingCorrections.length > 0 && onApplyWritingCorrection) {
      writingCorrections.forEach((correction) => {
        onApplyWritingCorrection(correction);
      });
    }
  };

  /**
   * Handle Dismiss All - dismisses both quality suggestion and all writing corrections
   */
  const handleDismissAll = async () => {
    // Dismiss quality suggestion (if present)
    if (qualitySuggestion && onDismissQuality) {
      onDismissQuality();
    }

    // Dismiss all writing corrections (if present)
    if (writingCorrections.length > 0 && onDismissWritingCorrection) {
      writingCorrections.forEach((correction) => {
        onDismissWritingCorrection(correction);
      });
    }
  };

  return (
    <SuggestionPaper>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            Quality Suggestions
          </Typography>
          {qualitySuggestion && (
            <Chip
              label={`Quality Score: ${qualitySuggestion.quality_score}/100`}
              size="small"
              color={getScoreColor(qualitySuggestion.quality_score)}
            />
          )}
          {/* Writing corrections chip removed - they're now shown inline next to fields */}
        </Box>
        {hasQualitySuggestion && (
          <ViewModeToggle
            value={viewMode}
            onChange={handleViewModeChange}
          />
        )}
      </Box>

      {/* Quality Suggestion Section */}
      {hasQualitySuggestion && qualitySuggestion && (
        <>
          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, mb: 1, display: 'block' }}>
              Quality Suggestion:
            </Typography>
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">{qualitySuggestion.reasoning}</Typography>
            </Alert>

            <ContentDisplayBox>
              {viewMode === 'diff' ? (
                <SemanticDiff htmlDiff={qualitySuggestion.html_diff || ''} />
              ) : (
                <OriginalSuggestedDisplay
                  original={qualitySuggestion.original}
                  suggested={qualitySuggestion.suggested}
                />
              )}
            </ContentDisplayBox>

            {/* Coaching Questions (if present) */}
            {qualitySuggestion.coaching_questions && qualitySuggestion.coaching_questions.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                  Consider these questions to further improve:
                </Typography>
                {qualitySuggestion.coaching_questions.map((q, idx) => (
                  <Typography key={idx} variant="body2" sx={{ mb: 0.5, pl: 2 }}>
                    • {q.question}
                  </Typography>
                ))}
              </Box>
            )}
          </Box>
          {/* Divider removed - writing corrections are now shown inline */}
        </>
      )}

      {/* Writing Corrections Section */}
      {writingCorrections.length > 0 && (
        <Box>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, mb: 1, display: 'block' }}>
            Writing Corrections:
          </Typography>
          {writingCorrections.map((correction, correctionIndex) => {
            // Description is now handled through field_corrections with field_name="description"
            // Legacy html_diff at WritingCorrection level is deprecated but kept for backward compatibility
            const hasFieldCorrections = correction.field_corrections && correction.field_corrections.length > 0;

            return (
              <Box
                key={`${correction.item_id}-${correctionIndex}`}
                sx={{
                  mb: correctionIndex < writingCorrections.length - 1 ? 3 : 2,
                  p: 2,
                  backgroundColor: 'background.default',
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              >
                {/* Correction Header */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Chip
                    label={correction.importance === 'highly_recommended' ? 'Highly Recommended' : 'Standard'}
                    size="small"
                    color={getImportanceColor(correction.importance)}
                  />
                </Box>

                {/* Reasoning */}
                <Alert severity="info" sx={{ mb: 2 }}>
                  <Typography variant="body2">{correction.reasoning}</Typography>
                </Alert>

                {/* Field Corrections (All fields including description) */}
                {hasFieldCorrections && (
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, fontWeight: 600 }}>
                      Field Corrections:
                    </Typography>
                    <List dense sx={{ pl: 0 }}>
                      {correction.field_corrections?.map((fieldCorrection, fieldIndex) => (
                        <ListItem
                          key={fieldIndex}
                          sx={{
                            flexDirection: 'column',
                            alignItems: 'flex-start',
                            py: 1,
                            borderBottom: fieldIndex < (correction.field_corrections?.length || 0) - 1 ? '1px solid' : 'none',
                            borderColor: 'divider',
                          }}
                        >
                          <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                            {getFieldLabel(fieldCorrection.field_name)}
                          </Typography>
                          <Box sx={{ width: '100%' }}>
                            <SemanticDiff htmlDiff={fieldCorrection.html_diff} />
                          </Box>
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                )}

                {/* Divider between corrections */}
                {correctionIndex < writingCorrections.length - 1 && <Divider sx={{ mt: 2 }} />}
              </Box>
            );
          })}
        </Box>
      )}

      {/* Unified Actions */}
      <Box sx={{ mt: 2 }}>
        <SuggestionActionButtons
          onApply={handleApplyAll}
          onDismiss={handleDismissAll}
          variant="all"
        />
      </Box>
    </SuggestionPaper>
  );
};
