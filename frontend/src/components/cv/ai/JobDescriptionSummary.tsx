/**
 * Job Description Summary Component
 * 
 * This component provides a compact summary of job descriptions in the sidebar,
 * showing the active job description and a button to open the full management modal.
 * 
 * Key responsibilities:
 * - Display active job description summary
 * - Show count of saved job descriptions
 * - Provide button to open full job description modal
 * - Show quick actions for the active job description
 * 
 * Usage:
 * - Used in the CV editor sidebar for compact job description display
 * - Requires cvId prop to associate with specific CV
 * - Integrates with AI store for state management
 */

import React, { useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  Chip,
  IconButton,
  Tooltip,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
} from '@mui/material';
import {
  AutoAwesome as AutoAwesomeIcon,
  Work as WorkIcon,
  Link as LinkIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Check as CheckIcon,
} from '@mui/icons-material';
import { useAIStore, useJobDescriptions, useActiveJobDescription } from '../../../stores/aiStore';
import { JobDescription } from '../../../types/ai';
import { useNotifications } from '../../../stores/uiStore';
import JobDescriptionsModal from './JobDescriptionsModal';

interface JobDescriptionSummaryProps {
  cvId: string;
  onJobDescriptionSelect?: (jobDescription: JobDescription | null) => void;
  onGenerateSuggestions?: () => void;
  suggestionsLoading?: boolean;
  onAddToCV?: (content: string, sectionType: string) => void;
}

const JobDescriptionSummary: React.FC<JobDescriptionSummaryProps> = ({
  cvId,
  onJobDescriptionSelect,
  onGenerateSuggestions,
  suggestionsLoading = false,
  onAddToCV,
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingJobDescription, setEditingJobDescription] = useState<JobDescription | null>(null);
  const [editForm, setEditForm] = useState({
    title: '',
    company: '',
    location: '',
    content: '',
  });
  const [isEditLoading, setIsEditLoading] = useState(false);
  const [isGeneratingJobFit, setIsGeneratingJobFit] = useState(false);

  const { deleteJobDescription, setActiveJobDescription, createJobDescription, createJobFitDraft } = useAIStore();
  const { showSuccess, showError } = useNotifications();

  const jobDescriptions = useJobDescriptions();
  const activeJobDescription = useActiveJobDescription();

  const handleJobDescriptionDelete = async (jobDescriptionId: string) => {
    try {
      await deleteJobDescription(jobDescriptionId);
      showSuccess('Job description deleted successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete job description';
      showError('Error', errorMessage);
    }
  };

  const handleEditJobDescription = useCallback((jobDescription: JobDescription) => {
    setEditingJobDescription(jobDescription);
    setEditForm({
      title: jobDescription.title || '',
      company: jobDescription.company || '',
      location: jobDescription.location || '',
      content: jobDescription.content,
    });
    setEditDialogOpen(true);
  }, []);

  const handleEditSubmit = useCallback(async () => {
    if (!editingJobDescription || !editForm.content.trim()) {
      return;
    }

    setIsEditLoading(true);

    try {
      // Store the old job description ID to clear active selection
      const oldJobDescriptionId = editingJobDescription.id;
      
      // Delete the old job description and create a new one
      await deleteJobDescription(oldJobDescriptionId);
      const newJobDescription = await createJobDescription({
        content: editForm.content,
        title: editForm.title || 'Manual Job Description',
        company: editForm.company || 'Unknown Company',
        location: editForm.location || 'Unknown Location',
      });
      
      // Set the new job description as active to maintain selection
      if (newJobDescription) {
        setActiveJobDescription(newJobDescription.id);
      }
      
      setEditDialogOpen(false);
      setEditingJobDescription(null);
      setEditForm({ title: '', company: '', location: '', content: '' });
      showSuccess('Job description updated successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update job description';
      showError('Error', errorMessage);
    } finally {
      setIsEditLoading(false);
    }
  }, [editingJobDescription, editForm, deleteJobDescription, createJobDescription, setActiveJobDescription, showSuccess, showError]);

  const handleGenerateJobFit = useCallback(async () => {
    if (!activeJobDescription) {
      showError('Error', 'Please select a job description first');
      return;
    }

    setIsGeneratingJobFit(true);
    try {
      // Create a draft instead of directly saving
      await createJobFitDraft(cvId, activeJobDescription.id);
      
      showSuccess('Job fit analysis draft created successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate job fit analysis';
      showError('Error', errorMessage);
    } finally {
      setIsGeneratingJobFit(false);
    }
  }, [activeJobDescription, cvId, createJobFitDraft, showSuccess, showError]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else if (diffInHours < 168) { // 7 days
      const days = Math.floor(diffInHours / 24);
      return `${days}d ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  return (
    <>
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <WorkIcon />
            Job Descriptions
          </Typography>
          <Button
            variant="outlined"
            size="small"
            onClick={() => setModalOpen(true)}
            sx={{ textTransform: 'none' }}
          >
            Manage ({jobDescriptions.length})
          </Button>
        </Box>

        {jobDescriptions.length === 0 ? (
          <Card 
            variant="outlined" 
            sx={{ 
              mb: 2,
              border: '2px dashed #e0e0e0',
              backgroundColor: 'rgba(0,0,0,0.02)',
              transition: 'all 0.2s ease-in-out',
              '&:hover': {
                borderColor: 'primary.light',
                backgroundColor: 'rgba(25, 118, 210, 0.04)'
              }
            }}
          >
            <CardContent sx={{ textAlign: 'center', py: 4 }}>
              <WorkIcon sx={{ fontSize: 64, color: 'primary.light', mb: 2, opacity: 0.7 }} />
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'text.primary' }}>
                No Job Description Yet
              </Typography>
              <Typography color="text.secondary" variant="body2" sx={{ mb: 3, maxWidth: 280, mx: 'auto' }}>
                Add a job description to get personalized AI suggestions and enhance your CV
              </Typography>
              <Button
                variant="contained"
                size="medium"
                onClick={() => setModalOpen(true)}
                startIcon={<WorkIcon />}
                sx={{ 
                  textTransform: 'none',
                  fontWeight: 600,
                  px: 3,
                  py: 1.5,
                  boxShadow: 2,
                  '&:hover': {
                    boxShadow: 4,
                    transform: 'translateY(-1px)'
                  },
                  transition: 'all 0.2s ease-in-out'
                }}
              >
                Add Job Description
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Stack spacing={2}>
            {/* Active Job Description */}
            {activeJobDescription ? (
              <Card 
                variant="outlined" 
                sx={{ 
                  border: 1, 
                  borderColor: 'primary.main',
                  backgroundColor: 'rgba(25, 118, 210, 0.04)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                    transform: 'translateY(-1px)'
                  }
                }}
              >
                <CardContent sx={{ pb: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                    <Typography variant="h6" sx={{ fontWeight: 700, flex: 1, mr: 1, color: 'primary.main' }}>
                      {activeJobDescription.title || 'Untitled Job Description'}
                    </Typography>
                    <Box>
                      <Tooltip title="Edit">
                        <IconButton
                          size="small"
                          onClick={() => handleEditJobDescription(activeJobDescription)}
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
                      <Tooltip title="Delete">
                        <IconButton
                          size="small"
                          onClick={() => handleJobDescriptionDelete(activeJobDescription.id)}
                          color="error"
                          sx={{
                            '&:hover': {
                              backgroundColor: 'error.light',
                              color: 'error.contrastText'
                            }
                          }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>
                  
                  {/* Company, Location, and URL as Chips */}
                  {(activeJobDescription.company || activeJobDescription.location || activeJobDescription.source_url) && (
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1.5 }}>
                      {activeJobDescription.company && (
                        <Chip
                          icon={<WorkIcon />}
                          label={activeJobDescription.company}
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
                      {activeJobDescription.location && (
                        <Chip
                          icon={<LinkIcon />}
                          label={activeJobDescription.location}
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
                      {activeJobDescription.source_url && (
                        <Chip
                          icon={<LinkIcon />}
                          label="URL"
                          size="small"
                          variant="outlined"
                          sx={{ 
                            backgroundColor: 'rgba(25, 118, 210, 0.08)',
                            borderColor: 'primary.light',
                            cursor: 'pointer',
                            '&:hover': {
                              backgroundColor: 'primary.light',
                              color: 'primary.contrastText',
                              transform: 'scale(1.05)'
                            },
                            '& .MuiChip-icon': {
                              fontSize: '16px'
                            },
                            transition: 'all 0.2s ease-in-out'
                          }}
                          onClick={() => window.open(activeJobDescription.source_url, '_blank', 'noopener,noreferrer')}
                        />
                      )}
                    </Box>
                  )}
                  
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                    Added: {formatDate(activeJobDescription.created_at)}
                  </Typography>
                  
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      mb: 1.5,
                      lineHeight: 1.6
                    }}
                  >
                    {activeJobDescription.content}
                  </Typography>
                </CardContent>
                
                <CardActions sx={{ 
                  pt: 0, 
                  px: 2, 
                  pb: 2, 
                  flexDirection: 'column', 
                  gap: 2,
                  alignItems: 'stretch',
                  '& .MuiButton-root': {
                    width: '100%',
                    minWidth: 'unset',
                    mx: 0
                  }
                }}>
                  {onGenerateSuggestions && (
                    <Button
                      variant="contained"
                      startIcon={
                        suggestionsLoading ? (
                          <CircularProgress size={16} color="inherit" />
                        ) : (
                          <AutoAwesomeIcon 
                            sx={{
                              animation: suggestionsLoading ? 'pulse 1.5s ease-in-out infinite' : 'none',
                              '@keyframes pulse': {
                                '0%': { transform: 'scale(1)' },
                                '50%': { transform: 'scale(1.1)' },
                                '100%': { transform: 'scale(1)' }
                              }
                            }}
                          />
                        )
                      }
                      onClick={onGenerateSuggestions}
                      disabled={suggestionsLoading}
                      sx={{
                        textTransform: 'none',
                        backgroundColor: 'transparent',
                        color: '#1976d2',
                        border: '1px solid #1976d2',
                        fontWeight: 600,
                        py: 1.5,
                        px: 2,
                        height: 48,
                        '&:hover': {
                          backgroundColor: 'rgba(25, 118, 210, 0.08)',
                          borderColor: '#1565c0',
                          transform: 'translateY(-1px)',
                          boxShadow: 2
                        },
                        '&:disabled': {
                          opacity: 0.7,
                          transform: 'none'
                        },
                        transition: 'all 0.2s ease-in-out'
                      }}
                    >
                      {suggestionsLoading ? 'Enhancing...' : 'Enhance CV'}
                    </Button>
                  )}
                  
                  {onAddToCV && (
                    <Button
                      variant="outlined"
                      startIcon={
                        isGeneratingJobFit ? (
                          <CircularProgress size={16} />
                        ) : (
                          <AutoAwesomeIcon 
                            sx={{
                              animation: isGeneratingJobFit ? 'pulse 1.5s ease-in-out infinite' : 'none',
                              '@keyframes pulse': {
                                '0%': { transform: 'scale(1)' },
                                '50%': { transform: 'scale(1.1)' },
                                '100%': { transform: 'scale(1)' }
                              }
                            }}
                          />
                        )
                      }
                      onClick={handleGenerateJobFit}
                      disabled={isGeneratingJobFit}
                      sx={{
                        textTransform: 'none',
                        backgroundColor: 'transparent',
                        color: '#1976d2',
                        border: '1px solid #1976d2',
                        fontWeight: 600,
                        py: 1.5,
                        px: 2,
                        height: 48,
                        '&:hover': {
                          backgroundColor: 'rgba(25, 118, 210, 0.08)',
                          borderColor: '#1565c0',
                          transform: 'translateY(-1px)',
                          boxShadow: 2
                        },
                        '&:disabled': {
                          opacity: 0.7,
                          transform: 'none'
                        },
                        transition: 'all 0.2s ease-in-out'
                      }}
                    >
                      {isGeneratingJobFit ? 'Generating...' : 'Generate Job Fit Section'}
                    </Button>
                  )}
                </CardActions>
              </Card>
            ) : (
              <Card 
                variant="outlined" 
                sx={{ 
                  mb: 2,
                  border: '1px dashed #e0e0e0',
                  backgroundColor: 'rgba(0,0,0,0.02)',
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    borderColor: 'primary.light',
                    backgroundColor: 'rgba(25, 118, 210, 0.04)'
                  }
                }}
              >
                <CardContent sx={{ textAlign: 'center', py: 3 }}>
                  <WorkIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1.5, opacity: 0.6 }} />
                  <Typography color="text.secondary" variant="body2" gutterBottom sx={{ fontWeight: 500 }}>
                    No job description selected
                  </Typography>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => setModalOpen(true)}
                    sx={{ 
                      textTransform: 'none',
                      fontWeight: 500,
                      '&:hover': {
                        backgroundColor: 'primary.light',
                        borderColor: 'primary.main',
                        color: 'primary.contrastText'
                      },
                      transition: 'all 0.2s ease-in-out'
                    }}
                  >
                    Select Job Description
                  </Button>
                </CardContent>
              </Card>
            )}

          </Stack>
        )}
      </Box>

      <JobDescriptionsModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        cvId={cvId}
        onJobDescriptionSelect={onJobDescriptionSelect}
      />

      {/* Edit Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Edit Job Description</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Job Title"
              value={editForm.title}
              onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
              fullWidth
              disabled={isEditLoading}
            />
            <TextField
              label="Company"
              value={editForm.company}
              onChange={(e) => setEditForm(prev => ({ ...prev, company: e.target.value }))}
              fullWidth
              disabled={isEditLoading}
            />
            <TextField
              label="Location"
              value={editForm.location}
              onChange={(e) => setEditForm(prev => ({ ...prev, location: e.target.value }))}
              fullWidth
              disabled={isEditLoading}
            />
            <TextField
              label="Job Description"
              value={editForm.content}
              onChange={(e) => setEditForm(prev => ({ ...prev, content: e.target.value }))}
              multiline
              rows={8}
              fullWidth
              disabled={isEditLoading}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)} disabled={isEditLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleEditSubmit}
            variant="contained"
            disabled={isEditLoading || !editForm.content.trim()}
            startIcon={isEditLoading ? <CircularProgress size={20} /> : <CheckIcon />}
          >
            {isEditLoading ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default JobDescriptionSummary;
