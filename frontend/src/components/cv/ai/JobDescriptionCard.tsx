/**
 * Job Description Card Component
 * 
 * Reusable card component for displaying job descriptions in both
 * the sidebar and modal contexts. Handles parsing states, errors,
 * and provides action buttons.
 * 
 * Key responsibilities:
 * - Display job description details (title, company, location)
 * - Make title clickable when source URL exists
 * - Show parsing/loading states
 * - Show error states
 * - Provide edit, delete/hide, and select actions
 * - Support active/selected state highlighting
 * 
 * Usage:
 * - Used in JobDescriptionSummary for sidebar display
 * - Used in JobDescriptionsModal for grid display
 */

import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Box,
  Chip,
  IconButton,
  Tooltip,
  Button,
  CircularProgress,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Work as WorkIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Close as CloseIcon,
  HourglassEmpty as HourglassEmptyIcon,
  LocationOn as LocationOnIcon,
  AttachMoney as AttachMoneyIcon,
  BusinessCenter as BusinessCenterIcon,
} from '@mui/icons-material';
import { JobDescription } from '../../../types/ai';
import { formatRelativeTime } from '../../../utils/formatters';
import { MarkdownRenderer } from '../../common';

export interface JobDescriptionCardProps {
  jobDescription: JobDescription;
  isActive?: boolean;
  isParsing?: boolean;
  onEdit?: (jobDescription: JobDescription) => void;
  onDelete?: (jobDescription: JobDescription) => void;
  onHide?: (jobDescriptionId: string) => void;
  onSelect?: (jobDescription: JobDescription) => void;
  showSelectButton?: boolean;
  variant?: 'default' | 'sidebar';
}

const JobDescriptionCard: React.FC<JobDescriptionCardProps> = ({
  jobDescription,
  isActive = false,
  isParsing: isParsingProp,
  onEdit,
  onDelete,
  onHide,
  onSelect,
  showSelectButton = false,
  variant = 'default',
}) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const isParsing = isParsingProp || jobDescription.is_parsing;
  const hasError = jobDescription.parse_error;

  const handleCardClick = () => {
    // Only open dialog for successfully parsed job descriptions
    if (!isParsing && !hasError) {
      setDialogOpen(true);
    }
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
  };

  // Parsing/Error state card
  if (isParsing || hasError) {
    return (
      <Card
        variant="outlined"
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          border: 2,
          borderColor: hasError ? 'error.main' : 'warning.main',
          backgroundColor: hasError ? 'rgba(244, 67, 54, 0.04)' : 'rgba(255, 193, 7, 0.04)',
          transition: 'all 0.2s ease-in-out',
        }}
      >
        <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: variant === 'sidebar' ? 150 : 200 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            {hasError ? (
              <>
                <Typography variant="h6" color="error" sx={{ fontWeight: 500 }}>
                  Parsing Failed
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
                  Unable to extract job details from URL
                </Typography>
                <Typography variant="caption" color="error" sx={{ textAlign: 'center', maxWidth: 200 }}>
                  {jobDescription.parse_error}
                </Typography>
                {onDelete && (
                  <Button
                    size="small"
                    variant="outlined"
                    color="error"
                    onClick={() => onDelete(jobDescription)}
                    sx={{ mt: 1 }}
                  >
                    Remove
                  </Button>
                )}
              </>
            ) : (
              <>
                <CircularProgress size={40} thickness={4} />
                <Typography variant="h6" color="primary" sx={{ fontWeight: 500 }}>
                  Parsing Job Description
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
                  Extracting details from URL...
                </Typography>
                <Box sx={{ width: '100%', maxWidth: 200 }}>
                  <LinearProgress 
                    variant="indeterminate" 
                    sx={{ 
                      height: 4, 
                      borderRadius: 2,
                      backgroundColor: 'rgba(25, 118, 210, 0.1)',
                      '& .MuiLinearProgress-bar': {
                        borderRadius: 2,
                      }
                    }} 
                  />
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                  <HourglassEmptyIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                  <Typography variant="caption" color="text.secondary">
                    This may take a few moments
                  </Typography>
                </Box>
              </>
            )}
          </Box>
        </CardContent>
      </Card>
    );
  }

  // Normal job description card
  return (
    <>
      <Card
        variant="outlined"
        onClick={handleCardClick}
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          border: isActive ? 2 : 1,
          borderColor: isActive ? 'primary.main' : 'divider',
          backgroundColor: isActive ? 'rgba(25, 118, 210, 0.04)' : 'transparent',
          boxShadow: isActive ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
          transition: 'all 0.2s ease-in-out',
          cursor: 'pointer',
          '&:hover': {
            boxShadow: isActive ? '0 4px 12px rgba(0,0,0,0.12)' : '0 2px 8px rgba(0,0,0,0.08)',
            transform: 'translateY(-1px)'
          }
        }}
      >
      <CardContent sx={{ flex: 1, pb: showSelectButton ? 1 : 2 }}>
        {/* Header with title and actions */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
          {jobDescription.source_url ? (
            <Typography 
              variant="h6" 
              component="a"
              href={jobDescription.source_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              sx={{ 
                fontWeight: isActive ? 700 : 600, 
                flex: 1, 
                mr: 1,
                color: isActive ? 'primary.main' : 'primary.main',
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                textDecoration: 'none',
                cursor: 'pointer',
                '&:hover': {
                  textDecoration: 'underline',
                  opacity: 0.8
                }
              }}
            >
              {jobDescription.title || 'Untitled Job Description'}
            </Typography>
          ) : (
            <Typography 
              variant="h6" 
              sx={{ 
                fontWeight: isActive ? 700 : 600, 
                flex: 1, 
                mr: 1,
                color: isActive ? 'primary.main' : 'text.primary',
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}
            >
              {jobDescription.title || 'Untitled Job Description'}
            </Typography>
          )}
          <Box>
            {onEdit && (
              <Tooltip title="Edit">
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(jobDescription);
                  }}
                  sx={{
                    '&:hover': {
                      backgroundColor: 'primary.light',
                      color: 'primary.contrastText'
                    }
                  }}
                >
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            {onHide && (
              <Tooltip title="Remove from sidebar">
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    onHide(jobDescription.id);
                  }}
                  sx={{
                    '&:hover': {
                      backgroundColor: 'rgba(0, 0, 0, 0.04)',
                      color: 'text.secondary'
                    }
                  }}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            {onDelete && (
              <Tooltip title="Delete">
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(jobDescription);
                  }}
                  color="error"
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </Box>

        {/* Company, Location, Employment Type chips */}
        {(jobDescription.company || jobDescription.location || jobDescription.employment_type || jobDescription.salary_range) && (
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1.5 }}>
            {jobDescription.company && (
              <Chip
                icon={<WorkIcon />}
                label={jobDescription.company}
                size="small"
                variant="outlined"
                sx={{
                  backgroundColor: 'rgba(25, 118, 210, 0.08)',
                  borderColor: 'primary.light',
                  '& .MuiChip-icon': {
                    fontSize: '16px'
                  }
                }}
              />
            )}
            {jobDescription.location && (
              <Chip
                icon={<LocationOnIcon />}
                label={jobDescription.location}
                size="small"
                variant="outlined"
                sx={{
                  backgroundColor: 'rgba(76, 175, 80, 0.08)',
                  borderColor: 'success.light',
                  '& .MuiChip-icon': {
                    fontSize: '16px'
                  }
                }}
              />
            )}
            {jobDescription.employment_type && (
              <Chip
                icon={<BusinessCenterIcon />}
                label={jobDescription.employment_type}
                size="small"
                variant="outlined"
                sx={{
                  backgroundColor: 'rgba(156, 39, 176, 0.08)',
                  borderColor: 'secondary.light',
                  '& .MuiChip-icon': {
                    fontSize: '16px'
                  }
                }}
              />
            )}
            {jobDescription.salary_range && (
              <Chip
                icon={<AttachMoneyIcon />}
                label={jobDescription.salary_range}
                size="small"
                variant="outlined"
                sx={{
                  backgroundColor: 'rgba(255, 152, 0, 0.08)',
                  borderColor: 'warning.light',
                  '& .MuiChip-icon': {
                    fontSize: '16px'
                  }
                }}
              />
            )}
          </Box>
        )}

        {/* Created date */}
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
          Added: {formatRelativeTime(jobDescription.created_at)}
        </Typography>

        {/* Content preview */}
        <MarkdownRenderer
          content={jobDescription.content}
          variant="body2"
          color="text.secondary"
          lineClamp={variant === 'sidebar' ? 2 : 4}
          sx={{
            mb: 1,
          }}
        />
      </CardContent>

      {/* Select button (only shown in modal) */}
      {showSelectButton && onSelect && (
        <CardActions sx={{ justifyContent: 'center', px: 2, pb: 2, pt: 0 }}>
          <Button
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onSelect(jobDescription);
            }}
            variant={isActive ? 'contained' : 'outlined'}
            fullWidth
          >
            {isActive ? 'Selected' : 'Select'}
          </Button>
        </CardActions>
      )}
    </Card>

    {/* Job Description Detail Dialog */}
    <Dialog
      open={dialogOpen}
      onClose={handleCloseDialog}
      fullWidth
      maxWidth="md"
      fullScreen={isMobile}
    >
      <DialogTitle>
        <Box>
          <Typography variant="h5" component="div" sx={{ fontWeight: 600, mb: 1 }}>
            {jobDescription.title || 'Untitled Job Description'}
          </Typography>
          {/* Metadata chips */}
          {(jobDescription.company || jobDescription.location || jobDescription.employment_type || jobDescription.salary_range) && (
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {jobDescription.company && (
                <Chip
                  icon={<WorkIcon />}
                  label={jobDescription.company}
                  size="small"
                  variant="outlined"
                  sx={{
                    backgroundColor: 'rgba(25, 118, 210, 0.08)',
                    borderColor: 'primary.light',
                    '& .MuiChip-icon': {
                      fontSize: '16px'
                    }
                  }}
                />
              )}
              {jobDescription.location && (
                <Chip
                  icon={<LocationOnIcon />}
                  label={jobDescription.location}
                  size="small"
                  variant="outlined"
                  sx={{
                    backgroundColor: 'rgba(76, 175, 80, 0.08)',
                    borderColor: 'success.light',
                    '& .MuiChip-icon': {
                      fontSize: '16px'
                    }
                  }}
                />
              )}
              {jobDescription.employment_type && (
                <Chip
                  icon={<BusinessCenterIcon />}
                  label={jobDescription.employment_type}
                  size="small"
                  variant="outlined"
                  sx={{
                    backgroundColor: 'rgba(156, 39, 176, 0.08)',
                    borderColor: 'secondary.light',
                    '& .MuiChip-icon': {
                      fontSize: '16px'
                    }
                  }}
                />
              )}
              {jobDescription.salary_range && (
                <Chip
                  icon={<AttachMoneyIcon />}
                  label={jobDescription.salary_range}
                  size="small"
                  variant="outlined"
                  sx={{
                    backgroundColor: 'rgba(255, 152, 0, 0.08)',
                    borderColor: 'warning.light',
                    '& .MuiChip-icon': {
                      fontSize: '16px'
                    }
                  }}
                />
              )}
            </Box>
          )}
        </Box>
      </DialogTitle>
      <DialogContent dividers>
        <MarkdownRenderer
          content={jobDescription.content}
          variant="body1"
          color="text.primary"
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCloseDialog} variant="outlined">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  </>
  );
};

export default JobDescriptionCard;

