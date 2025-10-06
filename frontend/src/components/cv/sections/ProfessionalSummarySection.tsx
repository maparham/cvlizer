import React, { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { TextField, Typography, Box, Button, Chip, Tooltip, IconButton } from '@mui/material'
import { Add as AddIcon, Close as CloseIcon, InfoOutlined as InfoIcon } from '@mui/icons-material'
import { SectionProps } from '../../../types'
import SimpleFormSection from '../core/SimpleFormSection'
import { useAISuggestionsStore, useValidatedSuggestions } from '../../../stores/aiSuggestionsStore'
import { useNotifications } from '../../../stores/uiStore'

interface ProfessionalSummarySectionProps extends SectionProps {
  cvId?: string;
}

const ProfessionalSummarySection: React.FC<ProfessionalSummarySectionProps> = ({ data, onUpdate, onSave, isEditing, onEdit, onClose, onUnsavedChanges, cvId }) => {
  const [showMarkdownPreview, setShowMarkdownPreview] = useState(false)

  // Get unified AI suggestions store with CV validation
  const {
    dismissSummarySuggestion
  } = useAISuggestionsStore()

  // Use CV-validated selector to prevent cross-CV contamination
  const allSuggestions = useValidatedSuggestions(cvId || '')

  // Get notifications for user feedback
  const { showSuccess } = useNotifications()

  // Extract professional summary suggestion from unified store
  const summarySuggestion = allSuggestions?.professional_summary
  const hasSummarySuggestion = summarySuggestion && summarySuggestion.suggested_text

  const renderForm = (editData: any, updateData: (field: string, value: any) => void) => {
    const handleApplySummarySuggestion = async () => {
      if (summarySuggestion?.suggested_text) {
        updateData('content', summarySuggestion.suggested_text)
        // Update the editData with the new content for saving
        const updatedEditData = {
          ...editData,
          content: summarySuggestion.suggested_text
        }
        onSave?.(updatedEditData)
        await dismissSummarySuggestion()
        showSuccess('Professional summary updated with AI suggestion')
      }
    }
    
    return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
        <Typography variant="subtitle2" color="text.secondary">
          Professional Summary
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
            }
          }}
        >
          <ReactMarkdown>{(typeof editData === 'string' ? editData : editData.content) || ''}</ReactMarkdown>
        </Box>
      ) : (
        <TextField
          fullWidth
          multiline
          rows={4}
          variant="standard"
          value={(typeof editData === 'string' ? editData : editData.content) || ''}
          onChange={(e) => updateData('content', e.target.value)}
          error={!((typeof editData === 'string' ? editData : editData.content)?.trim()) || (typeof editData === 'string' ? editData : editData.content)?.trim().length < 10}
          helperText={
            !((typeof editData === 'string' ? editData : editData.content)?.trim())
              ? "Professional summary is required" 
              : (typeof editData === 'string' ? editData : editData.content)?.trim().length < 10 
                ? "Professional summary must be at least 10 characters long"
                : "Markdown formatting is supported"
          }
          placeholder="Your professional summary goes here... (Markdown supported) *"
          sx={{ 
            '& .MuiInputBase-input': { 
              lineHeight: 1.6,
              textAlign: 'justify'
            }
          }}
        />
      )}
      
      {/* AI Summary Suggestion - Only show if suggestion exists */}
      {hasSummarySuggestion && (
        <Box 
          sx={{ 
            mt: 2, 
            p: { xs: 1.5, sm: 2 }, 
            backgroundColor: '#E3F2FD',
            border: '1px solid #BBDEFB',
            borderRadius: 1
          }}
        >
          <Box display="flex" alignItems="center" mb={1}>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#1976d2' }}>
              AI Suggested Professional Summary
            </Typography>
            <Tooltip title="AI-generated improvement based on job description">
              <InfoIcon sx={{ ml: 1, fontSize: 16, color: '#1976d2' }} />
            </Tooltip>
            <IconButton
              size="small"
              onClick={dismissSummarySuggestion}
              sx={{ ml: 'auto', color: '#666' }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
          
          <Typography variant="body2" sx={{ mb: 2, lineHeight: 1.6 }}>
            {summarySuggestion.suggested_text}
          </Typography>
          
          {summarySuggestion.key_changes && summarySuggestion.key_changes.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" sx={{ fontWeight: 'bold', color: '#666' }}>
                Key improvements:
              </Typography>
              <Box sx={{ mt: 0.5 }}>
                {summarySuggestion.key_changes.map((change, index) => (
                  <Chip
                    key={index}
                    label={change}
                    size="small"
                    sx={{ 
                      mr: { xs: 0.25, sm: 0.5 }, 
                      mb: { xs: 0.25, sm: 0.5 },
                      backgroundColor: '#E8F5E8',
                      color: '#2E7D32',
                      fontSize: { xs: '0.7rem', sm: '0.75rem' }
                    }}
                  />
                ))}
              </Box>
            </Box>
          )}
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="contained"
              size="small"
              startIcon={<AddIcon />}
              onClick={handleApplySummarySuggestion}
              sx={{
                textTransform: 'none',
                backgroundColor: '#4CAF50',
                '&:hover': {
                  backgroundColor: '#45a049'
                }
              }}
            >
              Apply Suggestion
            </Button>
            <Button
              variant="outlined"
              size="small"
              onClick={dismissSummarySuggestion}
              sx={{
                textTransform: 'none',
                borderColor: '#f44336',
                color: '#f44336',
                '&:hover': {
                  borderColor: '#d32f2f',
                  backgroundColor: '#ffebee'
                }
              }}
            >
              Reject
            </Button>
          </Box>
        </Box>
      )}
    </Box>
  )
}

  const renderDisplay = (data: any) => (
    <Box>
      <Box
        sx={{ 
          lineHeight: 1.6,
          textAlign: 'justify',
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
          }
        }}
      >
        <ReactMarkdown>{(typeof data === 'string' ? data : data.content) || 'Your professional summary goes here...'}</ReactMarkdown>
      </Box>
      
      {/* AI Summary Suggestion - Show in display mode too */}
      {hasSummarySuggestion && (
        <Box 
          sx={{ 
            mt: 2, 
            p: { xs: 1.5, sm: 2 }, 
            backgroundColor: '#E3F2FD',
            border: '1px solid #BBDEFB',
            borderRadius: 1
          }}
        >
          <Box display="flex" alignItems="center" mb={1}>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#1976d2' }}>
              AI Suggested Professional Summary
            </Typography>
            <Tooltip title="AI-generated improvement based on job description">
              <InfoIcon sx={{ ml: 1, fontSize: 16, color: '#1976d2' }} />
            </Tooltip>
            <IconButton
              size="small"
              onClick={dismissSummarySuggestion}
              sx={{ ml: 'auto', color: '#666' }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
          
          <Typography variant="body2" sx={{ mb: 2, lineHeight: 1.6 }}>
            {summarySuggestion.suggested_text}
          </Typography>
          
          {summarySuggestion.key_changes && summarySuggestion.key_changes.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" sx={{ fontWeight: 'bold', color: '#666' }}>
                Key improvements:
              </Typography>
              <Box sx={{ mt: 0.5 }}>
                {summarySuggestion.key_changes.map((change, index) => (
                  <Chip
                    key={index}
                    label={change}
                    size="small"
                    sx={{ 
                      mr: { xs: 0.25, sm: 0.5 }, 
                      mb: { xs: 0.25, sm: 0.5 },
                      backgroundColor: '#E8F5E8',
                      color: '#2E7D32',
                      fontSize: { xs: '0.7rem', sm: '0.75rem' }
                    }}
                  />
                ))}
              </Box>
            </Box>
          )}
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="contained"
              size="small"
              startIcon={<AddIcon />}
              onClick={async () => {
                // Apply the suggestion by updating the CV data
                // Fix the corrupted data structure by ensuring professional_summary is an object
                const updatedData = {
                  content: summarySuggestion.suggested_text,
                  keywords: data.keywords || []
                }
                onUpdate(updatedData)
                onSave?.(updatedData)
                await dismissSummarySuggestion()
                showSuccess('Professional summary updated with AI suggestion')
              }}
              sx={{
                textTransform: 'none',
                backgroundColor: '#4CAF50',
                '&:hover': {
                  backgroundColor: '#45a049'
                }
              }}
            >
              Apply Suggestion
            </Button>
            <Button
              variant="outlined"
              size="small"
              onClick={dismissSummarySuggestion}
              sx={{
                textTransform: 'none',
                borderColor: '#f44336',
                color: '#f44336',
                '&:hover': {
                  borderColor: '#d32f2f',
                  backgroundColor: '#ffebee'
                }
              }}
            >
              Reject
            </Button>
          </Box>
        </Box>
      )}
    </Box>
  )

  return (
    <SimpleFormSection
      data={data}
      onUpdate={onUpdate}
      onSave={onSave}
      isEditing={isEditing}
      onEdit={onEdit}
      onClose={onClose}
      onUnsavedChanges={onUnsavedChanges}
      title="Professional Summary"
      sectionId="professional_summary"
      requiredFields={['content']}
      renderForm={renderForm}
      renderDisplay={renderDisplay}
      autoSaveMessage="Professional summary auto-saved"
    />
  )
}

export default ProfessionalSummarySection
