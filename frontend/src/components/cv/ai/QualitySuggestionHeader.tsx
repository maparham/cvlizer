/**
 * Quality Suggestion Header Component
 *
 * Displays the header section of a quality suggestion including:
 * - Quality score icon (if available)
 * - AI Suggestion label
 * - Expandable reasoning and key changes links
 * - View mode toggle
 */

import React from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import AssessmentIcon from '@mui/icons-material/Assessment';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { ViewModeToggle } from './ViewModeToggle';

interface QualitySuggestionHeaderProps {
  qualityScore?: number;
  reasoning?: string;
  keyChanges?: string[];
  viewMode: 'diff' | 'raw';
  onViewModeChange: (event: React.MouseEvent<HTMLElement>, mode: 'diff' | 'raw' | null) => void;
  showReasoning: boolean;
  onToggleReasoning: () => void;
  showKeyChanges: boolean;
  onToggleKeyChanges: () => void;
}

/**
 * QualitySuggestionHeader - Header section for quality suggestions
 *
 * Displays quality score icon, label, expandable reasoning/key changes links,
 * and view mode toggle.
 */
export const QualitySuggestionHeader: React.FC<QualitySuggestionHeaderProps> = ({
  qualityScore,
  reasoning,
  keyChanges,
  viewMode,
  onViewModeChange,
  showReasoning,
  onToggleReasoning,
  showKeyChanges,
  onToggleKeyChanges,
}) => {
  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {qualityScore !== undefined && (
            <Tooltip
              title={`Quality Score: ${qualityScore}/100`}
              arrow
            >
              <AssessmentIcon fontSize="small" sx={{ color: 'text.secondary', cursor: 'help' }} aria-label="Quality score" />
            </Tooltip>
          )}
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 400 }}>
            AI Suggestion:
          </Typography>
          {reasoning && (
            <Link
              component="button"
              variant="caption"
              onClick={onToggleReasoning}
              sx={{
                display: 'flex',
                alignItems: 'center',
                textDecoration: 'none',
                color: 'text.secondary',
                cursor: 'pointer',
                ml: 0.5,
                fontSize: '0.75rem',
                '&:hover': {
                  textDecoration: 'underline',
                },
              }}
            >
              {showReasoning ? (
                <>
                  <ExpandLessIcon sx={{ fontSize: '0.875rem', mr: 0.25 }} />
                  Hide reasoning
                </>
              ) : (
                <>
                  <ExpandMoreIcon sx={{ fontSize: '0.875rem', mr: 0.25 }} />
                  Show reasoning
                </>
              )}
            </Link>
          )}
          {keyChanges && keyChanges.length > 0 && (
            <Link
              component="button"
              variant="caption"
              onClick={onToggleKeyChanges}
              sx={{
                display: 'flex',
                alignItems: 'center',
                textDecoration: 'none',
                color: 'text.secondary',
                cursor: 'pointer',
                ml: 0.5,
                fontSize: '0.75rem',
                '&:hover': {
                  textDecoration: 'underline',
                },
              }}
            >
              {showKeyChanges ? (
                <>
                  <ExpandLessIcon sx={{ fontSize: '0.875rem', mr: 0.25 }} />
                  Hide key changes
                </>
              ) : (
                <>
                  <ExpandMoreIcon sx={{ fontSize: '0.875rem', mr: 0.25 }} />
                  Show key changes
                </>
              )}
            </Link>
          )}
        </Box>
        <ViewModeToggle
          value={viewMode}
          onChange={onViewModeChange}
        />
      </Box>

      {showReasoning && reasoning && (
        <Box sx={{ mb: 1.5 }}>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              fontSize: '0.875rem',
              lineHeight: 1.5,
              fontStyle: 'italic',
            }}
          >
            {reasoning}
          </Typography>
        </Box>
      )}

      {showKeyChanges && keyChanges && keyChanges.length > 0 && (
        <Box sx={{ mb: 1.5 }}>
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2" component="div">
              {keyChanges.map((change: string, index: number) => (
                <Box key={index} sx={{ mb: index < keyChanges.length - 1 ? 0.5 : 0 }}>
                  • {change}
                </Box>
              ))}
            </Typography>
          </Alert>
        </Box>
      )}
    </>
  );
};
