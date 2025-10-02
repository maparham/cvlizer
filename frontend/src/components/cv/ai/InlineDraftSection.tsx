/**
 * Inline Draft Section Component
 * 
 * This component displays draft AI-generated sections directly within the CV editor content area.
 * It provides a seamless inline editing experience with visual distinction from regular sections.
 * 
 * Key responsibilities:
 * - Display draft content inline within CV structure
 * - Provide approve and reject actions with immediate feedback
 * - Show visual distinction with draft styling
 * - Handle loading states and error feedback
 * - Integrate seamlessly with CV editor flow
 * 
 * Usage:
 * - Rendered inline within CVContentArea alongside regular sections
 * - Shows drafts in appropriate locations based on section type
 * - Provides immediate approval/rejection without page refresh
 */

import React, { useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  Box,
  Paper,
  Typography,
  Button,
  Chip,
  Stack,
  CircularProgress,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Fade,
} from '@mui/material';
import {
  Check as CheckIcon,
  Close as CloseIcon,
  ExpandMore as ExpandMoreIcon,
  AutoAwesome as AutoAwesomeIcon,
  Schedule as ScheduleIcon,
  Psychology as PsychologyIcon,
} from '@mui/icons-material';
import { useAIStore } from '../../../stores/aiStore';
import { useNotifications } from '../../../stores/uiStore';
import { useCVEditor } from '../../../contexts/CVEditorContext';
import { DraftResponse } from '../../../types/ai';

interface InlineDraftSectionProps {
  cvId: string;
  draft: DraftResponse;
  onApproved?: () => void;
  onRejected?: () => void;
}

const InlineDraftSection: React.FC<InlineDraftSectionProps> = ({
  cvId,
  draft,
  onApproved,
  onRejected,
}) => {
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  
  const { approveWhyGoodFitDraft, deleteWhyGoodFitDraft } = useAIStore();
  const { showSuccess, showError } = useNotifications();
  const { onUpdateCV, onSave } = useCVEditor();

  const handleApprove = useCallback(async () => {
    setIsApproving(true);
    try {
      // Notify parent component immediately to remove from local state
      onApproved?.();
      
      const result = await approveWhyGoodFitDraft(cvId, draft.id);
      
      // The backend returns the updated CV data
      if (result && result.cv) {
        // Update the CV data immediately without page refresh
        onUpdateCV(result.cv.parsed_data);
        
        // Save the changes to persist them
        await onSave(result.cv.parsed_data, 'AI draft approved and added to CV');
        
        showSuccess('Draft approved and added to CV successfully');
        
        // Hide the draft section with a smooth transition
        setIsVisible(false);
      } else {
        // Fallback if result format is different
        showSuccess('Draft approved and added to CV successfully');
        setIsVisible(false);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to approve draft';
      showError('Error', errorMessage);
    } finally {
      setIsApproving(false);
    }
  }, [cvId, draft.id, approveWhyGoodFitDraft, onUpdateCV, onSave, showSuccess, showError, onApproved]);

  const handleReject = useCallback(async () => {
    setIsRejecting(true);
    try {
      // Notify parent component immediately to remove from local state
      onRejected?.();
      
      await deleteWhyGoodFitDraft(cvId);
      
      showSuccess('Draft rejected successfully');
      
      // Hide the draft section with a smooth transition
      setIsVisible(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to reject draft';
      showError('Error', errorMessage);
    } finally {
      setIsRejecting(false);
    }
  }, [cvId, deleteWhyGoodFitDraft, showSuccess, showError, onRejected]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (milliseconds: number) => {
    if (milliseconds < 1000) {
      return `${milliseconds}ms`;
    }
    return `${(milliseconds / 1000).toFixed(1)}s`;
  };

  if (!isVisible) {
    return null;
  }

  return (
    <Fade in={isVisible} timeout={300}>
      <Box sx={{ mb: 3 }}>
        <Paper
          elevation={2}
          sx={{
            border: '2px solid',
            borderColor: 'warning.main',
            backgroundColor: 'warning.50',
            position: 'relative',
            overflow: 'hidden',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '4px',
              background: 'linear-gradient(90deg, #ff9800, #ffc107, #ff9800)',
              backgroundSize: '200% 100%',
              animation: 'shimmer 2s infinite',
            },
            '@keyframes shimmer': {
              '0%': { backgroundPosition: '-200% 0' },
              '100%': { backgroundPosition: '200% 0' },
            },
          }}
        >
          <Box sx={{ p: 3 }}>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Chip
                  icon={<AutoAwesomeIcon />}
                  label="AI Draft"
                  color="warning"
                  size="small"
                  sx={{ fontWeight: 600 }}
                />
                <Typography variant="h6" sx={{ fontWeight: 600, color: 'warning.dark' }}>
                  Why I'm a Good Fit
                </Typography>
              </Box>
              <Typography variant="caption" color="text.secondary">
                Generated: {formatDate(draft.created_at)}
              </Typography>
            </Box>

            {/* Main content */}
            <Box
              sx={{
                mb: 2,
                lineHeight: 1.6,
                color: 'text.primary',
                '& h1, & h2, & h3, & h4, & h5, & h6': {
                  marginTop: 2,
                  marginBottom: 1,
                  fontWeight: 600,
                },
                '& p': {
                  marginBottom: 1,
                },
                '& ul, & ol': {
                  marginBottom: 1,
                  paddingLeft: 2,
                },
                '& li': {
                  marginBottom: 0.5,
                },
                '& strong': {
                  fontWeight: 600,
                },
                '& em': {
                  fontStyle: 'italic',
                },
              }}
            >
              <ReactMarkdown>
                {draft.draft_data?.fit_analysis || draft.draft_data?.content || 'No content available'}
              </ReactMarkdown>
            </Box>

            {/* Action buttons */}
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <Button
                variant="contained"
                color="success"
                startIcon={isApproving ? <CircularProgress size={16} /> : <CheckIcon />}
                onClick={handleApprove}
                disabled={isApproving || isRejecting}
                sx={{ textTransform: 'none', fontWeight: 600 }}
              >
                {isApproving ? 'Approving...' : 'Approve & Add to CV'}
              </Button>
              <Button
                variant="outlined"
                color="error"
                startIcon={isRejecting ? <CircularProgress size={16} /> : <CloseIcon />}
                onClick={handleReject}
                disabled={isApproving || isRejecting}
                sx={{ textTransform: 'none' }}
              >
                {isRejecting ? 'Rejecting...' : 'Reject'}
              </Button>
            </Box>

            {/* Additional details in accordion */}
            <Accordion sx={{ boxShadow: 'none', '&:before': { display: 'none' } }}>
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                sx={{ 
                  minHeight: 'auto',
                  py: 1,
                  '& .MuiAccordionSummary-content': { margin: 0 }
                }}
              >
                <Typography variant="caption" color="text.secondary">
                  View Analysis Details
                </Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ pt: 0 }}>
                <Stack spacing={2}>
                  {/* Confidence Score */}
                  {draft.draft_data?.confidence_score !== undefined && (
                    <Box>
                      <Typography variant="caption" color="text.secondary" display="block">
                        Confidence Score
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {draft.draft_data.confidence_score}%
                      </Typography>
                    </Box>
                  )}

                  {/* Key Matches */}
                  {draft.draft_data?.key_matches?.length > 0 && (
                    <Box>
                      <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                        Key Matches
                      </Typography>
                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        {draft.draft_data.key_matches.map((match: string, index: number) => (
                          <Chip
                            key={index}
                            label={match}
                            size="small"
                            variant="outlined"
                            color="success"
                          />
                        ))}
                      </Stack>
                    </Box>
                  )}

                  {/* Missing Skills */}
                  {draft.draft_data?.missing_skills?.length > 0 && (
                    <Box>
                      <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                        Missing Skills
                      </Typography>
                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        {draft.draft_data.missing_skills.map((skill: string, index: number) => (
                          <Chip
                            key={index}
                            label={skill}
                            size="small"
                            variant="outlined"
                            color="error"
                          />
                        ))}
                      </Stack>
                    </Box>
                  )}

                  {/* Generation Metadata */}
                  <Divider />
                  <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <PsychologyIcon fontSize="small" color="action" />
                      <Typography variant="caption" color="text.secondary">
                        {draft.ai_model}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <ScheduleIcon fontSize="small" color="action" />
                      <Typography variant="caption" color="text.secondary">
                        {formatDuration(draft.generation_time)}
                      </Typography>
                    </Box>
                    {draft.tokens_used > 0 && (
                      <Typography variant="caption" color="text.secondary">
                        {draft.tokens_used} tokens
                      </Typography>
                    )}
                  </Box>
                </Stack>
              </AccordionDetails>
            </Accordion>
          </Box>
        </Paper>
      </Box>
    </Fade>
  );
};

export default InlineDraftSection;
