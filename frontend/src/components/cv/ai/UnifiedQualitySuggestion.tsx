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
import { LowQualityItem, WritingCorrection, ProfessionalSummaryQualitySuggestion } from '../../../types/ai';
import { SemanticDiff } from './SemanticDiff';
import { SuggestionActionButtons } from './SuggestionActionButtons';
import { SuggestionPaper } from './SuggestionPaper';
import { getImportanceColor, getFieldLabel } from './utils/suggestionUtils';
import { QualitySuggestionHeader } from './QualitySuggestionHeader';
import { QualitySuggestionContent } from './QualitySuggestionContent';
import { normalizeQualitySuggestion } from './utils/qualitySuggestionNormalizer';

interface UnifiedQualitySuggestionProps {
  itemId: string;
  section: 'work_experience' | 'education' | 'professional_summary';
  qualitySuggestion?: LowQualityItem | ProfessionalSummaryQualitySuggestion;
  writingCorrections?: WritingCorrection[];
  onApplyQuality?: (suggested: string) => void | Promise<void>;
  onDismissQuality?: () => void | Promise<void>;
  onApplyWritingCorrection?: (correction: WritingCorrection) => void | Promise<void>;
  onDismissWritingCorrection?: (correction: WritingCorrection) => void | Promise<void>;
  onApplyAll?: (itemId: string, qualitySuggested?: string, writingCorrections?: WritingCorrection[]) => void | Promise<void>;
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
  const [showReasoning, setShowReasoning] = useState<boolean>(false);
  const [showKeyChanges, setShowKeyChanges] = useState<boolean>(false);

  const hasQualitySuggestion = !!qualitySuggestion;
  // Writing corrections are now shown inline next to fields, so don't include them in render check
  // const hasWritingCorrections = writingCorrections.length > 0;
  // const hasAnySuggestions = hasQualitySuggestion || hasWritingCorrections;

  // Only render if there's a quality suggestion (writing corrections are shown inline)
  if (!hasQualitySuggestion || !qualitySuggestion) {
    return null;
  }

  // Normalize quality suggestion data for consistent rendering
  const normalized = normalizeQualitySuggestion(qualitySuggestion);

  const handleViewModeChange = (_event: React.MouseEvent<HTMLElement>, newMode: 'diff' | 'raw' | null) => {
    if (newMode !== null) {
      setViewMode(newMode);
    }
  };

  /**
   * Handle Apply All - applies both quality suggestion and all writing corrections
   * Uses atomic apply if available, otherwise falls back to sequential applies
   * Properly awaits all apply operations to handle errors and prevent race conditions
   */
  const handleApplyAll = async () => {
    // If onApplyAll is provided, use atomic apply (preferred)
    if (onApplyAll) {
      await onApplyAll(
        itemId,
        normalized.suggested,
        writingCorrections.length > 0 ? writingCorrections : undefined
      );
      return;
    }

    // Fallback to sequential applies (may cause conflicts if both update description)
    // Apply quality suggestion first (if present)
    if (onApplyQuality) {
      await onApplyQuality(normalized.suggested);
    }

    // Apply all writing corrections (if present)
    // Note: Writing corrections are applied in parallel using Promise.all for performance.
    // If multiple corrections target the same field, this may cause race conditions (last-write-wins).
    // However, the backend typically handles field-level corrections independently, minimizing conflicts.
    // For professional_summary section, there's typically only one description correction at a time.
    if (writingCorrections.length > 0 && onApplyWritingCorrection) {
      await Promise.all(
        writingCorrections.map((correction) =>
          onApplyWritingCorrection(correction)
        )
      );
    }
  };

  /**
   * Handle Dismiss All - dismisses both quality suggestion and all writing corrections
   * Properly awaits all dismissal operations to handle errors and prevent race conditions
   */
  const handleDismissAll = async () => {
    // Dismiss quality suggestion (if present)
    if (onDismissQuality) {
      await onDismissQuality();
    }

    // Dismiss all writing corrections (if present)
    // Dismissals are safe to run in parallel as they're independent operations
    if (writingCorrections.length > 0 && onDismissWritingCorrection) {
      await Promise.all(
        writingCorrections.map((correction) =>
          onDismissWritingCorrection(correction)
        )
      );
    }
  };

  return (
    <SuggestionPaper>
      {/* Quality Suggestion Header and Content */}
      <QualitySuggestionHeader
        qualityScore={normalized.qualityScore}
        reasoning={normalized.reasoning}
        keyChanges={normalized.keyChanges}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        showReasoning={showReasoning}
        onToggleReasoning={() => setShowReasoning(!showReasoning)}
        showKeyChanges={showKeyChanges}
        onToggleKeyChanges={() => setShowKeyChanges(!showKeyChanges)}
      />

      <QualitySuggestionContent
        original={normalized.original}
        suggested={normalized.suggested}
        htmlDiff={normalized.htmlDiff}
        viewMode={viewMode}
        coachingQuestions={normalized.coachingQuestions}
      />

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
