/**
 * Floating Suggestions Panel Component
 *
 * This component provides a floating panel interface for managing AI suggestions
 * in the CV editor. It displays all pending suggestions with options to accept
 * or reject each one, and provides overall control over the diff mode.
 *
 * Key responsibilities:
 * - Display list of all AI suggestions with clear descriptions
 * - Provide accept/reject buttons for each suggestion
 * - Show suggestion status and change type indicators
 * - Allow users to navigate to specific sections with suggestions
 * - Provide bulk actions for accepting/rejecting multiple suggestions
 * - Handle panel collapse/expand functionality
 *
 * Usage:
 * - Automatically appears when diff mode is activated
 * - Positions itself as a fixed overlay (bottom-right by default)
 * - Integrates with InlineDiffContext for state management
 * - Responsive design adapts to different screen sizes
 */

import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Button,
  List,
  ListItem,
  ListItemSecondaryAction,
  Divider,
  Chip,
  Collapse,
  LinearProgress,
  Tooltip,
  Badge,
  Stack,
} from '@mui/material';
import {
  Close,
  CheckCircle,
  Cancel,
  ExpandMore,
  ExpandLess,
  CheckCircleOutline,
  CancelOutlined,
  NavigateNext,
  Settings,
} from '@mui/icons-material';
import { useInlineDiffContext } from '../../../contexts/InlineDiffContext';
import { AISuggestion } from '../../../types/ai';
import { CVData } from '../../../types';

interface SuggestionItemProps {
  suggestion: AISuggestion;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  onNavigate?: (suggestion: AISuggestion) => void;
}

const SuggestionItem: React.FC<SuggestionItemProps> = ({
  suggestion,
  onAccept,
  onReject,
  onNavigate,
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'success';
      case 'rejected':
        return 'error';
      case 'pending':
      default:
        return 'warning';
    }
  };

  const getChangeTypeColor = (changeType: string) => {
    switch (changeType) {
      case 'addition':
        return 'success';
      case 'modification':
        return 'warning';
      case 'removal':
        return 'error';
      default:
        return 'default';
    }
  };

  const handleNavigate = () => {
    if (onNavigate) {
      onNavigate(suggestion);
    } else {
      // Default navigation behavior - scroll to section
      const sectionElement = document.querySelector(`[data-section="${suggestion.section}"]`);
      if (sectionElement) {
        sectionElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  return (
    <ListItem
      sx={{
        borderLeft: 4,
        borderLeftColor: `${getChangeTypeColor(suggestion.changeType)}.main`,
        mb: 1,
        bgcolor: 'background.paper',
        borderRadius: 1,
        '&:hover': {
          bgcolor: 'action.hover',
        },
      }}
    >
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
          <Typography variant="body2" fontWeight="medium" component="div">
            {suggestion.description}
          </Typography>
          <Chip
            label={suggestion.changeType}
            size="small"
            color={getChangeTypeColor(suggestion.changeType) as 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'}
            variant="outlined"
          />
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
          <Typography variant="caption" color="text.secondary" component="div">
            {suggestion.section}
            {suggestion.fieldPath && ` • ${suggestion.fieldPath}`}
          </Typography>
          <Chip
            label={suggestion.status}
            size="small"
            color={getStatusColor(suggestion.status) as 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'}
            variant="filled"
            sx={{ height: 18 }}
          />
        </Box>
      </Box>
      <ListItemSecondaryAction>
        <Stack direction="row" spacing={1} alignItems="center">
          <Tooltip title="Navigate to section">
            <IconButton size="small" onClick={handleNavigate}>
              <NavigateNext />
            </IconButton>
          </Tooltip>
          {suggestion.status === 'pending' && (
            <>
              <Tooltip title="Accept suggestion">
                <IconButton
                  size="small"
                  color="success"
                  onClick={() => onAccept(suggestion.id)}
                >
                  <CheckCircleOutline />
                </IconButton>
              </Tooltip>
              <Tooltip title="Reject suggestion">
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => onReject(suggestion.id)}
                >
                  <CancelOutlined />
                </IconButton>
              </Tooltip>
            </>
          )}
        </Stack>
      </ListItemSecondaryAction>
    </ListItem>
  );
};

interface FloatingSuggestionsPanelProps {
  onNavigateToSuggestion?: (suggestion: AISuggestion) => void;
  onContentUpdate?: (cvData: CVData) => void;
  onSave?: (cvData?: CVData, message?: string) => Promise<void>;
}

export const FloatingSuggestionsPanel: React.FC<FloatingSuggestionsPanelProps> = ({
  onNavigateToSuggestion,
  onContentUpdate,
  onSave,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const {
    isInDiffMode,
    suggestions,
    isPanelOpen,
    isApplyingAll,
    highlightMode,
    acceptSuggestion: acceptInlineSuggestion,
    rejectSuggestion: rejectInlineSuggestion,
    togglePanel,
    setHighlightMode,
    exitDiffMode,
    commitChanges,
    getPendingSuggestionsCount,
    getApprovedSuggestionsCount,
  } = useInlineDiffContext();

  // Don't render if not in diff mode or panel is closed
  if (!isInDiffMode || !isPanelOpen) {
    return null;
  }

  const pendingCount = getPendingSuggestionsCount();
  const approvedCount = getApprovedSuggestionsCount();

  const isButtonDisabled = approvedCount === 0 || isApplyingAll;
  const totalCount = suggestions.length;
  const progress = totalCount > 0 ? ((approvedCount + suggestions.filter(s => s.status === 'rejected').length) / totalCount) * 100 : 0;

  const handleAcceptAll = () => {
    suggestions
      .filter(s => s.status === 'pending')
      .forEach(s => acceptInlineSuggestion(s.id));
  };

  const handleRejectAll = () => {
    suggestions
      .filter(s => s.status === 'pending')
      .forEach(s => rejectInlineSuggestion(s.id));
  };

  const handleCommitChanges = async (event: React.MouseEvent) => {
    // Safety check: Only commit if there are actually approved suggestions
    if (approvedCount === 0) {
      console.warn('FloatingSuggestionsPanel - Prevented commit with 0 approved suggestions');
      return;
    }

    // Only allow explicit user clicks
    if (!event?.isTrusted || event?.type !== 'click') {
      console.warn('FloatingSuggestionsPanel - Prevented commit from non-click event');
      return;
    }

    // Add confirmation dialog to prevent accidental commits
    const confirmed = window.confirm(
      `Are you sure you want to apply ${approvedCount} approved suggestion${approvedCount > 1 ? 's' : ''} to your CV?`
    );

    if (!confirmed) {
      return;
    }

    const finalData = commitChanges();
    if (finalData) {
      // Trigger save or update CV data
      if (onContentUpdate) {
        onContentUpdate(finalData);

        // Automatically save the changes to persist them
        if (onSave) {
          try {
            await onSave(finalData, `Applied ${approvedCount} AI suggestion${approvedCount > 1 ? 's' : ''}`);
          } catch (error) {
            console.error('FloatingSuggestionsPanel - Failed to save changes:', error);
          }
        } else {
          console.warn('FloatingSuggestionsPanel - onSave callback is not provided, changes will not be persisted');
        }
      } else {
        console.warn('FloatingSuggestionsPanel - onContentUpdate callback is not provided');
      }
    }
  };

  return (
    <Paper
      elevation={8}
      sx={{
        position: 'fixed',
        bottom: 20,
        right: 20,
        width: 380,
        maxHeight: '60vh',
        zIndex: 1300,
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 2,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 2,
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
            AI Suggestions
          </Typography>
          <Badge badgeContent={pendingCount} color="warning" showZero={false}>
            <Settings fontSize="small" />
          </Badge>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Tooltip title={isCollapsed ? 'Expand panel' : 'Collapse panel'}>
            <IconButton
              size="small"
              sx={{ color: 'inherit' }}
              onClick={() => setIsCollapsed(!isCollapsed)}
            >
              {isCollapsed ? <ExpandMore /> : <ExpandLess />}
            </IconButton>
          </Tooltip>
          <Tooltip title="Close suggestions panel">
            <IconButton
              size="small"
              sx={{ color: 'inherit' }}
              onClick={() => togglePanel(false)}
            >
              <Close />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Progress Bar */}
      <LinearProgress
        variant="determinate"
        value={progress}
        sx={{
          height: 4,
          bgcolor: 'grey.200',
          '& .MuiLinearProgress-bar': {
            bgcolor: 'success.main',
          },
        }}
      />

      {/* Content */}
      <Collapse in={!isCollapsed}>
        <Box sx={{ p: 2 }}>
          {/* Stats */}
          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <Chip
              label={`${totalCount} Total`}
              size="small"
              variant="outlined"
            />
            <Chip
              label={`${pendingCount} Pending`}
              size="small"
              color="warning"
              variant="filled"
            />
            <Chip
              label={`${approvedCount} Approved`}
              size="small"
              color="success"
              variant="filled"
            />
          </Box>

          {/* Highlight Mode Controls */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Show:
            </Typography>
            <Stack direction="row" spacing={1}>
              <Button
                size="small"
                variant={highlightMode === 'all' ? 'contained' : 'outlined'}
                onClick={() => setHighlightMode('all')}
              >
                All
              </Button>
              <Button
                size="small"
                variant={highlightMode === 'pending' ? 'contained' : 'outlined'}
                onClick={() => setHighlightMode('pending')}
              >
                Pending
              </Button>
              <Button
                size="small"
                variant={highlightMode === 'approved' ? 'contained' : 'outlined'}
                onClick={() => setHighlightMode('approved')}
              >
                Approved
              </Button>
            </Stack>
          </Box>

          <Divider sx={{ mb: 2 }} />

          {/* Suggestions List */}
          <Box sx={{ maxHeight: 300, overflow: 'auto', mb: 2 }}>
            {isApplyingAll ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <LinearProgress sx={{ mb: 2 }} />
                <Typography variant="body2" color="text.secondary">
                  Generating suggestions...
                </Typography>
              </Box>
            ) : suggestions.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="body2" color="text.secondary">
                  No suggestions available
                </Typography>
              </Box>
            ) : (
              <List disablePadding>
                {suggestions.map((suggestion) => (
                  <SuggestionItem
                    key={`${suggestion.id}-${suggestion.status}`}
                    suggestion={suggestion}
                    onAccept={acceptInlineSuggestion}
                    onReject={rejectInlineSuggestion}
                    onNavigate={onNavigateToSuggestion}
                  />
                ))}
              </List>
            )}
          </Box>

          {/* Action Buttons */}
          <Stack spacing={1}>
            <Stack direction="row" spacing={1}>
              <Button
                fullWidth
                variant="outlined"
                color="success"
                onClick={handleAcceptAll}
                disabled={pendingCount === 0 || isApplyingAll}
                startIcon={<CheckCircle />}
              >
                Accept All
              </Button>
              <Button
                fullWidth
                variant="outlined"
                color="error"
                onClick={handleRejectAll}
                disabled={pendingCount === 0 || isApplyingAll}
                startIcon={<Cancel />}
              >
                Reject All
              </Button>
            </Stack>
            <Button
              fullWidth
              variant="contained"
              color="primary"
              onClick={handleCommitChanges}
              disabled={isButtonDisabled}
            >
              Apply Changes ({approvedCount})
            </Button>
            <Button
              fullWidth
              variant="outlined"
              onClick={exitDiffMode}
              disabled={isApplyingAll}
            >
              Cancel & Exit
            </Button>
          </Stack>
        </Box>
      </Collapse>
    </Paper>
  );
};

export default FloatingSuggestionsPanel;
