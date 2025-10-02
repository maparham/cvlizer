/**
 * Professional Summary Section with Inline Diff Support
 * 
 * Enhanced version of the ProfessionalSummarySection that integrates with the inline diff system
 * to show AI suggestions for content enhancements and keyword additions.
 * 
 * Key responsibilities:
 * - Render professional summary with highlighted suggestions
 * - Show content enhancement suggestions with appropriate visual indicators
 * - Allow users to accept/reject individual content suggestions
 * - Maintain backward compatibility with original ProfessionalSummarySection functionality
 * - Handle both content and keyword suggestions for professional summary
 * 
 * Usage:
 * - Drop-in replacement for original ProfessionalSummarySection when diff mode is active
 * - Automatically detects diff mode and renders accordingly
 * - Falls back to original behavior when not in diff mode
 */

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { TextField, Typography, Box, Button, Chip, IconButton, Tooltip } from '@mui/material';
import { CheckCircleOutline, CancelOutlined, Edit } from '@mui/icons-material';
import { SectionProps } from '../../../types';
import SimpleFormSection from '../core/SimpleFormSection';
import { SuggestionHighlight } from '../ai/SuggestionHighlight';
import { useInlineDiffSection, useHighlightedContent } from '../../../hooks/useInlineDiffSection';
import { useInlineDiffContext } from '../../../contexts/InlineDiffContext';

const ProfessionalSummarySectionWithDiff: React.FC<SectionProps> = ({ 
  data, 
  onUpdate, 
  onSave, 
  isEditing, 
  onEdit, 
  onClose, 
  onUnsavedChanges 
}) => {
  const [showMarkdownPreview, setShowMarkdownPreview] = useState(false);
  
  const {
    isInDiffMode,
    acceptSuggestion: acceptInlineSuggestion,
    rejectSuggestion: rejectInlineSuggestion,
  } = useInlineDiffContext();

  // Use diff hooks for professional summary content
  const diffData = useInlineDiffSection({
    section: 'professional_summary',
    fieldPath: 'content',
    originalData: (data as any)?.content || '',
  });

  const contentDiff = useHighlightedContent(
    'professional_summary',
    'content',
    (data as any)?.content || ''
  );

  // Enhanced content renderer that handles suggestions
  const renderContentWithSuggestions = (content: string, isPreview: boolean = false) => {
    if (isPreview) {
      return (
        <Box
          sx={{ 
            minHeight: '120px',
            padding: 2,
            border: '1px solid #ccc',
            borderRadius: '4px',
            bgcolor: 'grey.50',
            lineHeight: 1.6,
            '& h1, & h2, & h3, & h4, & h5, & h6': {
              marginTop: 1,
              marginBottom: 0.5,
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
              marginBottom: 0.25,
            },
            '& strong': {
              fontWeight: 600,
            },
            '& em': {
              fontStyle: 'italic',
            },
            '& code': {
              backgroundColor: 'rgba(0, 0, 0, 0.1)',
              padding: '2px 4px',
              borderRadius: '3px',
              fontFamily: 'monospace',
            },
            '& pre': {
              backgroundColor: 'rgba(0, 0, 0, 0.05)',
              padding: '12px',
              borderRadius: '4px',
              overflow: 'auto',
            },
            '& blockquote': {
              borderLeft: '4px solid #ccc',
              marginLeft: 0,
              paddingLeft: '16px',
              fontStyle: 'italic',
            },
          }}
        >
          {isInDiffMode && contentDiff.hasChanges ? (
            <SuggestionHighlight
              suggestion={contentDiff.suggestion}
              section="professional_summary"
              fieldPath="content"
            >
              <ReactMarkdown>{contentDiff.displayContent}</ReactMarkdown>
            </SuggestionHighlight>
          ) : (
            <ReactMarkdown>{content}</ReactMarkdown>
          )}
        </Box>
      );
    }

    return (
      <TextField
        fullWidth
        multiline
        rows={6}
        value={isInDiffMode ? contentDiff.displayContent : content}
        onChange={(e) => {
          if (!isInDiffMode) {
            onUpdate({ ...(data as any), content: e.target.value });
          }
        }}
        placeholder="Enter your professional summary..."
        variant="outlined"
        disabled={isInDiffMode}
        sx={{
          '& .MuiOutlinedInput-root': {
            '& fieldset': {
              borderColor: isInDiffMode && contentDiff.hasChanges ? 'warning.main' : undefined,
            },
            '&:hover fieldset': {
              borderColor: isInDiffMode && contentDiff.hasChanges ? 'warning.dark' : undefined,
            },
            '&.Mui-focused fieldset': {
              borderColor: isInDiffMode && contentDiff.hasChanges ? 'warning.main' : undefined,
            },
          },
        }}
        InputProps={{
          endAdornment: isInDiffMode && contentDiff.hasChanges && contentDiff.suggestion ? (
            <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
              <Tooltip title="Accept suggestion">
                <IconButton
                  size="small"
                  color="success"
                  onClick={() => acceptInlineSuggestion(contentDiff.suggestion!.id)}
                  sx={{ 
                    width: 24, 
                    height: 24,
                    bgcolor: 'background.paper',
                    boxShadow: 1,
                    '&:hover': { boxShadow: 2 }
                  }}
                >
                  <CheckCircleOutline fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Reject suggestion">
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => rejectInlineSuggestion(contentDiff.suggestion!.id)}
                  sx={{ 
                    width: 24, 
                    height: 24,
                    bgcolor: 'background.paper',
                    boxShadow: 1,
                    '&:hover': { boxShadow: 2 }
                  }}
                >
                  <CancelOutlined fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          ) : null,
        }}
      />
    );
  };

  const renderForm = (editData: any, _updateData: (field: string, value: any) => void) => (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="subtitle2" color="text.secondary">
            Professional Summary
          </Typography>
          {isInDiffMode && diffData.hasPendingSuggestions && (
            <Chip
              label={`${diffData.suggestions.filter(s => s.status === 'pending').length} suggestions`}
              size="small"
              color="success"
              variant="outlined"
              icon={<Edit />}
            />
          )}
        </Box>
        <Button
          size="small"
          variant="outlined"
          onClick={() => setShowMarkdownPreview(!showMarkdownPreview)}
          disabled={isInDiffMode}
        >
          {showMarkdownPreview ? 'Edit' : 'Preview'}
        </Button>
      </Box>
      
      {renderContentWithSuggestions(editData?.content || '', showMarkdownPreview)}
    </Box>
  );

  // Utility function to safely extract string content
  const safeExtractContent = (data: any): string => {
    if (typeof data === 'string') {
      return data;
    }
    if (data && typeof data === 'object') {
      // Check if it has a content property
      if (typeof data.content === 'string') {
        return data.content;
      }
      // If it's an object but doesn't have content, it might be malformed data
      // Log for debugging but return empty string to prevent crashes
      console.warn('ProfessionalSummarySectionWithDiff: Unexpected data structure:', data);
    }
    return '';
  };

  const renderDisplay = (displayData: any) => {
    // Ensure we extract content as a string, not an object
    let content = '';
    if (isInDiffMode) {
      content = safeExtractContent(diffData.displayData);
    } else {
      content = safeExtractContent(displayData);
    }

    return (
      <Box data-section="professional_summary">
        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
          Professional Summary
        </Typography>
        <Typography variant="body2" sx={{ lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
          {isInDiffMode && contentDiff.hasChanges ? (
            <SuggestionHighlight
              suggestion={contentDiff.suggestion}
              section="professional_summary"
              fieldPath="content"
            >
              {typeof contentDiff.displayContent === 'string' ? contentDiff.displayContent : ''}
            </SuggestionHighlight>
          ) : (
            content
          )}
        </Typography>
      </Box>
    );
  };

  return (
    <SimpleFormSection
      data={data}
      renderForm={renderForm}
      renderDisplay={renderDisplay}
      onUpdate={onUpdate}
      onSave={onSave}
      isEditing={isEditing}
      onEdit={onEdit}
      onClose={onClose}
      onUnsavedChanges={onUnsavedChanges}
      title="Professional Summary"
      sectionId="professional_summary"
      requiredFields={['content']}
      autoSaveMessage="Professional summary updated"
      autoSaveMode={isInDiffMode}
    />
  );
};

export default ProfessionalSummarySectionWithDiff;
