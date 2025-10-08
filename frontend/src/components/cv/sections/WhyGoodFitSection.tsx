/**
 * Why I'm a Good Fit Section Component
 * 
 * This component renders the AI-generated "Why I'm a Good Fit" section in the CV.
 * It displays the generated content with confidence score and key matches.
 * 
 * Key responsibilities:
 * - Display AI-generated content in a professional format
 * - Show confidence score and key matches
 * - Allow editing and deletion of the section
 * - Integrate with CV editor context for updates
 * 
 * Usage:
 * - Used in CVContentArea to render the why_good_fit section
 * - Requires WhyGoodFit data and standard section props
 * - Integrates with CV editor context for state management
 */

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  Box,
  Typography,
  Card,
  CardContent,
  IconButton,
  Tooltip,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  AutoAwesome as AutoAwesomeIcon,
  CheckCircle as CheckCircleIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';
import { WhyGoodFit } from '../../../types/cv';
import { EditableTitle } from '../EditableTitle';

interface WhyGoodFitSectionProps {
  data?: WhyGoodFit;
  onUpdate: (data: WhyGoodFit) => void;
  onSave: (data: WhyGoodFit | null, message?: string) => void;
  isEditing: boolean;
  onEdit: () => void;
  onClose: () => void;
  onUnsavedChanges: (hasChanges: boolean) => void;
  title?: string;
  onTitleSave?: (newTitle: string) => Promise<void>;
}

const WhyGoodFitSection: React.FC<WhyGoodFitSectionProps> = ({
  data,
  // onUpdate, // Unused parameter removed
  onSave,
  isEditing,
  onEdit,
  onClose,
  onUnsavedChanges,
  title = "Why I'm a Good Fit",
  onTitleSave,
}) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editContent, setEditContent] = useState(data?.content || data?.fit_analysis || '');
  const [showMarkdownPreview, setShowMarkdownPreview] = useState(false);

  const handleEdit = () => {
    setEditContent(data?.content || data?.fit_analysis || '');
    onEdit();
  };

  const handleSave = () => {
    if (!data) return;

    const updatedData: WhyGoodFit = {
      ...data,
      content: editContent,
      fit_analysis: editContent, // Backend requires both content and fit_analysis
    };

    onSave(updatedData, 'Why I\'m a Good Fit section updated');
    onClose();
  };

  const handleCancel = () => {
    setEditContent(data?.content || data?.fit_analysis || '');
    onClose();
  };

  const handleDelete = () => {
    if (!data) return;
    
    // Set section to null to properly delete it
    onSave(null, 'Why I\'m a Good Fit section deleted');
    setShowDeleteDialog(false);
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 80) return 'success';
    if (score >= 60) return 'warning';
    return 'error';
  };

  const getConfidenceLabel = (score: number) => {
    if (score >= 80) return 'Excellent Match';
    if (score >= 60) return 'Good Match';
    if (score >= 40) return 'Fair Match';
    return 'Poor Match';
  };

  
  if (!data || (!data.content && !data.fit_analysis)) {
    return null;
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        {onTitleSave ? (
          <EditableTitle
            title={title}
            onSave={onTitleSave}
            variant="h5"
            sx={{
              '& .MuiTypography-root': {
                fontWeight: 600,
                color: 'primary.main'
              }
            }}
          />
        ) : (
          <Typography variant="h5" component="h2" sx={{ fontWeight: 600, color: 'primary.main' }}>
            {title}
          </Typography>
        )}
        <Box>
          <Tooltip title="Edit Section">
            <IconButton onClick={handleEdit} size="small">
              <EditIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete Section">
            <IconButton onClick={() => setShowDeleteDialog(true)} size="small" color="error">
              <DeleteIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {isEditing ? (
        <Card>
          <CardContent>
            <Box mb={2}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">
                  Edit Why I'm a Good Fit
                </Typography>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => setShowMarkdownPreview(!showMarkdownPreview)}
                >
                  {showMarkdownPreview ? 'Edit' : 'Preview'}
                </Button>
              </Box>
              
              {showMarkdownPreview ? (
                <Box
                  sx={{ 
                    minHeight: '200px',
                    padding: 2,
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    bgcolor: 'grey.50',
                    lineHeight: 1.6,
                    '& h1, & h2, & h3, & h4, & h5, & h6': {
                      marginTop: 2,
                      marginBottom: 1,
                      fontWeight: 600,
                    },
                    '& p': {
                      marginBottom: 2,
                    },
                    '& ul, & ol': {
                      marginBottom: 2,
                      paddingLeft: 3,
                    },
                    '& li': {
                      marginBottom: 0.5,
                    },
                    '& strong': {
                      fontWeight: 600,
                    },
                    '& em': {
                      fontStyle: 'italic',
                    }
                  }}
                >
                  <ReactMarkdown>{editContent}</ReactMarkdown>
                </Box>
              ) : (
                <textarea
                  value={editContent}
                  onChange={(e) => {
                    setEditContent(e.target.value);
                    onUnsavedChanges(e.target.value !== (data?.content || data?.fit_analysis));
                  }}
                  style={{
                    width: '100%',
                    minHeight: '200px',
                    padding: '12px',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    fontFamily: 'inherit',
                    fontSize: '14px',
                    lineHeight: '1.5',
                    resize: 'vertical',
                  }}
                  placeholder="Enter why you're a good fit for this role... (Markdown supported)"
                />
              )}
            </Box>
            <Box display="flex" gap={1} justifyContent="flex-end">
              <Button onClick={handleCancel} variant="outlined">
                Cancel
              </Button>
              <Button onClick={handleSave} variant="contained">
                Save
              </Button>
            </Box>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent>
            {/* Confidence Score */}
            <Box display="flex" alignItems="center" gap={2} mb={2}>
              <Chip
                icon={<AutoAwesomeIcon />}
                label={`${data.confidence_score}% Match`}
                color={getConfidenceColor(data.confidence_score)}
                variant="filled"
                size="small"
              />
              <Typography variant="body2" color="text.secondary">
                {getConfidenceLabel(data.confidence_score)}
              </Typography>
            </Box>

            {/* Main Content */}
            <Box
              sx={{ 
                lineHeight: 1.6,
                textAlign: 'justify',
                '& h1, & h2, & h3, & h4, & h5, & h6': {
                  marginTop: 2,
                  marginBottom: 1,
                  fontWeight: 600,
                },
                '& p': {
                  marginBottom: 2,
                },
                '& ul, & ol': {
                  marginBottom: 2,
                  paddingLeft: 3,
                },
                '& li': {
                  marginBottom: 0.5,
                },
                '& strong': {
                  fontWeight: 600,
                },
                '& em': {
                  fontStyle: 'italic',
                }
              }}
            >
              <ReactMarkdown>{data.content || data.fit_analysis}</ReactMarkdown>
            </Box>

            {/* Key Matches */}
            {data.key_matches && data.key_matches.length > 0 && (
              <>
                <Divider sx={{ my: 2 }} />
                <Box>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TrendingUpIcon color="primary" />
                    Key Matches
                  </Typography>
                  <List dense>
                    {data.key_matches.map((match, index) => (
                      <ListItem key={index} sx={{ py: 0.5 }}>
                        <ListItemIcon sx={{ minWidth: 32 }}>
                          <CheckCircleIcon color="success" fontSize="small" />
                        </ListItemIcon>
                        <ListItemText 
                          primary={match}
                          primaryTypographyProps={{ variant: 'body2' }}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              </>
            )}

            {/* Generation Info */}
            <Box mt={2} pt={2} borderTop="1px solid" borderColor="divider">
              <Typography variant="caption" color="text.secondary">
                Generated on {new Date(data.generated_at).toLocaleDateString()} at{' '}
                {new Date(data.generated_at).toLocaleTimeString()}
              </Typography>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Delete Section</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Are you sure you want to delete the "Why I'm a Good Fit" section? This action cannot be undone.
          </Alert>
          <Typography variant="body2" color="text.secondary">
            The section will be removed from your CV and you'll need to regenerate it if you want to add it back.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDeleteDialog(false)}>
            Cancel
          </Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default WhyGoodFitSection;
