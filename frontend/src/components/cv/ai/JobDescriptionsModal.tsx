/**
 * Job Descriptions Modal Component
 * 
 * This component provides a full-screen modal interface for managing job descriptions
 * including URL parsing, manual text input, and file upload support. It integrates
 * with the AI store to manage job descriptions for CV optimization.
 * 
 * Key responsibilities:
 * - Full-screen modal for job description management
 * - URL input with automatic parsing for job postings
 * - Manual text input area for job descriptions
 * - Save and manage job descriptions for the current CV
 * - Integration with AI features for optimization
 * 
 * Usage:
 * - Used as a modal dialog triggered from the CV editor sidebar
 * - Requires cvId prop to associate with specific CV
 * - Integrates with AI store for state management
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  TextField,
  Button,
  Typography,
  Card,
  CardContent,
  CardActions,
  Tabs,
  Tab,
  Alert,
  CircularProgress,
  Chip,
  IconButton,
  Tooltip,
  Stack,
  Grid,
  Paper,
} from '@mui/material';
import {
  Add as AddIcon,
  Link as LinkIcon,
  Description as DescriptionIcon,
  Upload as UploadIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Work as WorkIcon,
} from '@mui/icons-material';
import { useAIStore, useJobDescriptions, useActiveJobDescription } from '../../../stores/aiStore';
import { JobDescription } from '../../../types/ai';
import { useNotifications } from '../../../stores/uiStore';
import { aiService } from '../../../services/aiService';

interface JobDescriptionsModalProps {
  open: boolean;
  onClose: () => void;
  cvId: string;
  onJobDescriptionSelect?: (jobDescription: JobDescription | null) => void;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index, ...other }: TabPanelProps) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`job-desc-tabpanel-${index}`}
      aria-labelledby={`job-desc-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const JobDescriptionsModal: React.FC<JobDescriptionsModalProps> = ({
  open,
  onClose,
  cvId,
  onJobDescriptionSelect,
}) => {
  const [tabValue, setTabValue] = useState(0);
  const [urlInput, setUrlInput] = useState('');
  const [textInput, setTextInput] = useState('');
  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [location, setLocation] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingJobDescription, setEditingJobDescription] = useState<JobDescription | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);

  const { showSuccess, showError } = useNotifications();
  const {
    loadJobDescriptions,
    createJobDescription,
    deleteJobDescription,
    setActiveJobDescription,
  } = useAIStore();

  const jobDescriptions = useJobDescriptions();
  const activeJobDescription = useActiveJobDescription();

  // Load job descriptions when modal opens
  useEffect(() => {
    if (open && cvId) {
      loadJobDescriptions();
    }
  }, [open, cvId, loadJobDescriptions]);

  // Notify parent when active job description changes
  useEffect(() => {
    if (onJobDescriptionSelect) {
      onJobDescriptionSelect(activeJobDescription || null);
    }
  }, [activeJobDescription, onJobDescriptionSelect]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    setError(null);
  };

  const handleUrlSubmit = useCallback(async () => {
    if (!urlInput.trim()) {
      setError('Please enter a URL');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Use the URL parsing service
      const parsedData = await aiService.parseJobDescriptionUrl(cvId, urlInput);
      
      if (!(parsedData as { success?: boolean }).success) {
        throw new Error((parsedData as { error?: string }).error || 'Failed to parse URL');
      }

      const jobDescription = {
        content: parsedData.content || `Job posting from: ${urlInput}`,
        title: parsedData.title || title || 'Parsed Job Description',
        company: parsedData.company || company || 'Unknown Company',
        location: parsedData.location || location || 'Unknown Location',
        source_url: urlInput,
      };

      const newJobDescription = await createJobDescription(jobDescription);
      
      // Automatically select the newly created job description
      setActiveJobDescription(newJobDescription.id);
      if (onJobDescriptionSelect) {
        onJobDescriptionSelect(newJobDescription);
      }
      
      // Clear form fields
      setUrlInput('');
      setTitle('');
      setCompany('');
      setLocation('');
      setTextInput('');
      
      // Close the modal after successful parsing
      onClose();
      
      showSuccess('Job description parsed and created successfully');
    } catch (err) {
      const userFriendlyMessage = 'Unable to parse this URL. Please use the "Text" tab to enter the job description manually.';
      setError(userFriendlyMessage);
      showError('URL Parsing Failed', userFriendlyMessage);
    } finally {
      setIsLoading(false);
    }
  }, [urlInput, title, company, location, cvId, createJobDescription, showSuccess, showError]);

  const handleTextSubmit = useCallback(async () => {
    if (!textInput.trim()) {
      setError('Please enter job description text');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const jobDescription = {
        content: textInput,
        title: title || 'Manual Job Description',
        company: company || 'Unknown Company',
        location: location || 'Unknown Location',
      };

      const newJobDescription = await createJobDescription(jobDescription);
      
      // Automatically select the newly created job description
      setActiveJobDescription(newJobDescription.id);
      if (onJobDescriptionSelect) {
        onJobDescriptionSelect(newJobDescription);
      }
      
      // Clear form fields
      setTextInput('');
      setTitle('');
      setCompany('');
      setLocation('');
      
      // Close the modal after successful creation
      onClose();
      
      showSuccess('Job description created successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create job description';
      setError(errorMessage);
      showError('Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [textInput, title, company, location, cvId, createJobDescription, showSuccess, showError]);

  const handleJobDescriptionSelect = useCallback((jobDescription: JobDescription) => {
    setActiveJobDescription(jobDescription.id);
    // Close the modal after selection
    onClose();
  }, [setActiveJobDescription, onClose]);

  const handleJobDescriptionDelete = useCallback(async (jobDescriptionId: string) => {
    try {
      await deleteJobDescription(jobDescriptionId);
      showSuccess('Job description deleted successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete job description';
      showError('Error', errorMessage);
    }
  }, [deleteJobDescription, showSuccess, showError]);

  const handleEditJobDescription = useCallback((jobDescription: JobDescription) => {
    setEditingJobDescription(jobDescription);
    setTitle(jobDescription.title || '');
    setCompany(jobDescription.company || '');
    setLocation(jobDescription.location || '');
    setTextInput(jobDescription.content);
    setShowEditDialog(true);
  }, []);

  const handleEditSubmit = useCallback(async () => {
    if (!editingJobDescription || !textInput.trim()) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // TODO: Implement update job description API
      // For now, we'll delete and recreate
      await deleteJobDescription(editingJobDescription.id);
      await createJobDescription({
        content: textInput,
        title: title || 'Manual Job Description',
        company: company || 'Unknown Company',
        location: location || 'Unknown Location',
      });
      
      setShowEditDialog(false);
      setEditingJobDescription(null);
      setTextInput('');
      setTitle('');
      setCompany('');
      setLocation('');
      showSuccess('Job description updated successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update job description';
      setError(errorMessage);
      showError('Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [editingJobDescription, textInput, title, company, location, deleteJobDescription, createJobDescription, showSuccess, showError]);


  const formatDate = useCallback((dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }, []);

  const handleClose = useCallback(() => {
    setError(null);
    setTabValue(0);
    onClose();
  }, [onClose]);

  return (
    <>
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="lg"
        fullWidth
        fullScreen
        PaperProps={{
          sx: {
            height: '100vh',
            maxHeight: '100vh',
            m: 0,
            borderRadius: 0,
          }
        }}
      >
        <DialogTitle sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          borderBottom: '1px solid #e0e0e0',
          pb: 2
        }}>
          <Typography variant="h5" component="div">
            Job Descriptions
          </Typography>
          <IconButton 
            onClick={handleClose} 
            size="large"
            sx={{ 
              '&:hover': {
                backgroundColor: 'rgba(0, 0, 0, 0.04)'
              }
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: 0, overflow: 'hidden' }}>
          <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {error && (
              <Alert severity="error" sx={{ m: 2, mb: 0 }}>
                {error}
              </Alert>
            )}

            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs value={tabValue} onChange={handleTabChange} aria-label="job description input tabs">
                <Tab label="URL" icon={<LinkIcon />} />
                <Tab label="Text" icon={<DescriptionIcon />} />
                <Tab label="Saved" icon={<UploadIcon />} />
              </Tabs>
            </Box>

            <Box sx={{ flex: 1, overflow: 'auto' }}>
              {/* URL Input Tab */}
              <TabPanel value={tabValue} index={0}>
                <Stack spacing={3} sx={{ maxWidth: 800, mx: 'auto' }}>
                  <TextField
                    label="Job Posting URL"
                    placeholder="https://linkedin.com/jobs/view/..."
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    fullWidth
                    disabled={isLoading}
                    helperText="Paste a URL from LinkedIn, Indeed, or other job sites"
                  />
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={4}>
                      <TextField
                        label="Job Title (Optional)"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        fullWidth
                        disabled={isLoading}
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <TextField
                        label="Company (Optional)"
                        value={company}
                        onChange={(e) => setCompany(e.target.value)}
                        fullWidth
                        disabled={isLoading}
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <TextField
                        label="Location (Optional)"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        fullWidth
                        disabled={isLoading}
                      />
                    </Grid>
                  </Grid>
                  <Button
                    variant="contained"
                    onClick={handleUrlSubmit}
                    disabled={isLoading || !urlInput.trim()}
                    startIcon={isLoading ? <CircularProgress size={20} /> : <AddIcon />}
                    size="large"
                    sx={{ alignSelf: 'flex-start' }}
                  >
                    {isLoading ? 'Parsing...' : 'Parse & Save Job Description'}
                  </Button>
                </Stack>
              </TabPanel>

              {/* Text Input Tab */}
              <TabPanel value={tabValue} index={1}>
                <Stack spacing={3} sx={{ maxWidth: 800, mx: 'auto' }}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={4}>
                      <TextField
                        label="Job Title (Optional)"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        fullWidth
                        disabled={isLoading}
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <TextField
                        label="Company (Optional)"
                        value={company}
                        onChange={(e) => setCompany(e.target.value)}
                        fullWidth
                        disabled={isLoading}
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <TextField
                        label="Location (Optional)"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        fullWidth
                        disabled={isLoading}
                      />
                    </Grid>
                  </Grid>
                  <TextField
                    label="Job Description"
                    placeholder="Paste the job description text here..."
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    multiline
                    rows={12}
                    fullWidth
                    disabled={isLoading}
                    helperText="Paste the complete job description including requirements, responsibilities, and qualifications"
                  />
                  <Button
                    variant="contained"
                    onClick={handleTextSubmit}
                    disabled={isLoading || !textInput.trim()}
                    startIcon={isLoading ? <CircularProgress size={20} /> : <AddIcon />}
                    size="large"
                    sx={{ alignSelf: 'flex-start' }}
                  >
                    {isLoading ? 'Saving...' : 'Save Job Description'}
                  </Button>
                </Stack>
              </TabPanel>

              {/* Saved Job Descriptions Tab */}
              <TabPanel value={tabValue} index={2}>
                <Box sx={{ maxWidth: 1200, mx: 'auto', p: 2 }}>
                  {jobDescriptions.length === 0 ? (
                    <Paper sx={{ p: 4, textAlign: 'center' }}>
                      <Typography color="text.secondary" variant="h6" gutterBottom>
                        No job descriptions saved yet
                      </Typography>
                      <Typography color="text.secondary">
                        Add one using the URL or Text tabs.
                      </Typography>
                    </Paper>
                  ) : (
                    <Grid container spacing={3}>
                      {jobDescriptions.map((jobDescription) => (
                        <Grid item xs={12} md={6} lg={4} key={jobDescription.id}>
                          <Card
                            variant="outlined"
                            sx={{
                              height: '100%',
                              display: 'flex',
                              flexDirection: 'column',
                              border: activeJobDescription?.id === jobDescription.id ? 2 : 1,
                              borderColor: activeJobDescription?.id === jobDescription.id ? 'primary.main' : 'divider',
                            }}
                          >
                            <CardContent sx={{ flex: 1 }}>
                              <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                                <Typography variant="h6" component="div" sx={{ flex: 1, mr: 1 }}>
                                  {jobDescription.title || 'Untitled Job Description'}
                                </Typography>
                                <Box>
                                  <Tooltip title="Edit">
                                    <IconButton
                                      size="small"
                                      onClick={() => handleEditJobDescription(jobDescription)}
                                    >
                                      <EditIcon />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="Delete">
                                    <IconButton
                                      size="small"
                                      onClick={() => handleJobDescriptionDelete(jobDescription.id)}
                                      color="error"
                                    >
                                      <DeleteIcon />
                                    </IconButton>
                                  </Tooltip>
                                </Box>
                              </Box>
                              
                              {(jobDescription.company || jobDescription.location || jobDescription.source_url) && (
                                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
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
                                      icon={<LinkIcon />}
                                      label={jobDescription.location}
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
                                  {jobDescription.source_url && (
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
                                      onClick={() => window.open(jobDescription.source_url, '_blank', 'noopener,noreferrer')}
                                    />
                                  )}
                                </Box>
                              )}
                              
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                                Added: {formatDate(jobDescription.created_at)}
                              </Typography>
                              
                              <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{
                                  display: '-webkit-box',
                                  WebkitLineClamp: 4,
                                  WebkitBoxOrient: 'vertical',
                                  overflow: 'hidden',
                                  mb: 1,
                                }}
                              >
                                {jobDescription.content}
                              </Typography>
                            </CardContent>
                            
                            <CardActions sx={{ justifyContent: 'center', px: 2, pb: 2 }}>
                              <Button
                                size="small"
                                onClick={() => handleJobDescriptionSelect(jobDescription)}
                                variant={activeJobDescription?.id === jobDescription.id ? 'contained' : 'outlined'}
                              >
                                {activeJobDescription?.id === jobDescription.id ? 'Selected' : 'Select'}
                              </Button>
                            </CardActions>
                          </Card>
                        </Grid>
                      ))}
                    </Grid>
                  )}
                </Box>
              </TabPanel>
            </Box>
          </Box>
        </DialogContent>

        <DialogActions sx={{ borderTop: '1px solid #e0e0e0', p: 2 }}>
          {activeJobDescription && (
            <Typography variant="body2" color="text.secondary">
              Active: {activeJobDescription.title || 'Untitled Job Description'}
            </Typography>
          )}
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog
        open={showEditDialog}
        onClose={() => setShowEditDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Edit Job Description</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Job Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              fullWidth
              disabled={isLoading}
            />
            <TextField
              label="Company"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              fullWidth
              disabled={isLoading}
            />
            <TextField
              label="Location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              fullWidth
              disabled={isLoading}
            />
            <TextField
              label="Job Description"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              multiline
              rows={8}
              fullWidth
              disabled={isLoading}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowEditDialog(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleEditSubmit}
            variant="contained"
            disabled={isLoading || !textInput.trim()}
            startIcon={isLoading ? <CircularProgress size={20} /> : <CheckIcon />}
          >
            {isLoading ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default JobDescriptionsModal;
