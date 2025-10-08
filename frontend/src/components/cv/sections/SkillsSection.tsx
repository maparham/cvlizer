import React, { useState, useCallback } from 'react'
import { Box, Typography, Chip, Tooltip, Button } from '@mui/material'
import { Add as AddIcon, InfoOutlined as InfoIcon } from '@mui/icons-material'
import { SectionProps } from '../../../types'
import SimpleFormSection from '../core/SimpleFormSection'
import SkillsAutocomplete from '../ui/SkillsAutocomplete'
import { useAISuggestionsStore, useValidatedSuggestions } from '../../../stores/aiSuggestionsStore'
import { useNotifications } from '../../../stores/uiStore'

interface SkillsSectionProps extends SectionProps {
  cvId?: string;
}

const SkillsSection: React.FC<SkillsSectionProps> = ({ data, onUpdate, onSave, isEditing, onEdit, onClose, cvId, title = 'Skills', onTitleSave }) => {
  const [newTechnicalSkill, setNewTechnicalSkill] = useState('')
  const [newSoftSkill, setNewSoftSkill] = useState('')

  // Get unified AI suggestions store with CV validation
  const {
    dismissSkillSuggestion,
    dismissAllSkillSuggestions
  } = useAISuggestionsStore()

  // Use CV-validated selector to prevent cross-CV contamination
  const allSuggestions = useValidatedSuggestions(cvId || '')

  // Get notifications for user feedback
  const { showSuccess } = useNotifications()

  // Extract skills suggestions from unified store
  const skillsSuggestions = allSuggestions?.skills || null
  const hasSuggestions = skillsSuggestions && (skillsSuggestions.technical.length > 0 || skillsSuggestions.soft.length > 0)

  // Helper function to save data immediately without closing edit mode
  const saveDataImmediately = useCallback((updatedData: any, message?: string) => {
    onUpdate(updatedData)
    onSave?.(updatedData, message)
  }, [onUpdate, onSave])

  const renderForm = (editData: any, updateData: (field: string, value: any) => void) => {
    const addTechnicalSkill = () => {
      if (newTechnicalSkill.trim()) {
        const updatedData = {
          ...editData,
          technical: [...(editData.technical || []), newTechnicalSkill.trim()]
        }
        updateData('technical', updatedData.technical)
        saveDataImmediately(updatedData, 'Technical skill added')
        setNewTechnicalSkill('')
      }
    }

    const addSoftSkill = () => {
      if (newSoftSkill.trim()) {
        const updatedData = {
          ...editData,
          soft: [...(editData.soft || []), newSoftSkill.trim()]
        }
        updateData('soft', updatedData.soft)
        saveDataImmediately(updatedData, 'Soft skill added')
        setNewSoftSkill('')
      }
    }

    const addTechnicalSkillDirect = (skill: string) => {
      const updatedData = {
        ...editData,
        technical: [...(editData.technical || []), skill]
      }
      updateData('technical', updatedData.technical)
      saveDataImmediately(updatedData, 'Technical skill added')
    }

    const addSoftSkillDirect = (skill: string) => {
      const updatedData = {
        ...editData,
        soft: [...(editData.soft || []), skill]
      }
      updateData('soft', updatedData.soft)
      saveDataImmediately(updatedData, 'Soft skill added')
    }

    const removeTechnicalSkill = (index: number) => {
      const updatedData = {
        ...editData,
        technical: (editData.technical || []).filter((_: any, i: number) => i !== index)
      }
      updateData('technical', updatedData.technical)
      saveDataImmediately(updatedData, 'Technical skill removed')
    }

    const removeSoftSkill = (index: number) => {
      const updatedData = {
        ...editData,
        soft: (editData.soft || []).filter((_: any, i: number) => i !== index)
      }
      updateData('soft', updatedData.soft)
      saveDataImmediately(updatedData, 'Soft skill removed')
    }
    
    // AI Suggestions handlers
    const handleAddSuggestedSkill = async (skill: string, type: 'technical' | 'soft') => {
      const updatedData = {
        ...editData,
        [type]: [...(editData[type] || []), skill]
      }
      updateData(type, updatedData[type])
      saveDataImmediately(updatedData, `AI suggested skill "${skill}" added`)
      await dismissSkillSuggestion(skill, type)
    }

    const handleApplyAllSuggestions = async () => {
      if (!skillsSuggestions) {
        return;
      }


      const updatedData = { ...editData }

      // Add all technical skills
      if (skillsSuggestions.technical.length > 0) {
        updatedData.technical = [
          ...(updatedData.technical || []),
          ...skillsSuggestions.technical.map(s => s.skill)
        ]
      }

      // Add all soft skills
      if (skillsSuggestions.soft.length > 0) {
        updatedData.soft = [
          ...(updatedData.soft || []),
          ...skillsSuggestions.soft.map(s => s.skill)
        ]
      }

      // Update both technical and soft skills
      updateData('technical', updatedData.technical)
      updateData('soft', updatedData.soft)
      saveDataImmediately(updatedData, 'All AI suggested skills applied')

      // Dismiss all suggestions - this will DELETE the enhancement from backend since all are applied
      await dismissAllSkillSuggestions()

      showSuccess('All AI suggested skills have been applied')
    }

    const handleRejectAllSuggestions = async () => {
      await dismissAllSkillSuggestions()
      showSuccess('All AI suggestions have been rejected')
    }
    
    const hasSuggestions = skillsSuggestions && (skillsSuggestions.technical.length > 0 || skillsSuggestions.soft.length > 0)

    return (
      <Box>
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
            Technical Skills
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
            {(editData.technical || []).map((skill: string, index: number) => (
              <Chip
                key={index}
                label={skill}
                onDelete={() => removeTechnicalSkill(index)}
                sx={{
                  bgcolor: '#e3f2fd',
                  color: '#1976d2'
                }}
              />
            ))}
          </Box>
          <SkillsAutocomplete
            value={newTechnicalSkill}
            onChange={setNewTechnicalSkill}
            onAdd={addTechnicalSkill}
            onAddDirect={addTechnicalSkillDirect}
            placeholder="Add technical skill"
            skillType="technical"
            existingSkills={editData.technical || []}
          />
        </Box>

        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
            Soft Skills
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
            {(editData.soft || []).map((skill: string, index: number) => (
              <Chip
                key={index}
                label={skill}
                onDelete={() => removeSoftSkill(index)}
                sx={{
                  bgcolor: '#f3e5f5',
                  color: '#7b1fa2'
                }}
              />
            ))}
          </Box>
          <SkillsAutocomplete
            value={newSoftSkill}
            onChange={setNewSoftSkill}
            onAdd={addSoftSkill}
            onAddDirect={addSoftSkillDirect}
            placeholder="Add soft skill"
            skillType="soft"
            existingSkills={editData.soft || []}
          />
        </Box>
        
        {/* AI Suggestions Section - Only show if suggestions exist */}
        {hasSuggestions && (
            <Box 
              sx={{ 
                mt: 2, 
                p: 2, 
                backgroundColor: '#E3F2FD',
                border: '1px solid #90CAF9',
                borderRadius: '8px'
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                <Typography 
                  variant="subtitle2" 
                  sx={{ 
                    fontWeight: 600, 
                    fontSize: '14px',
                    color: '#1976D2'
                  }}
                >
                  AI Suggested Skills
                </Typography>
                <Tooltip title="These skills from the job description are not in your CV yet">
                  <InfoIcon sx={{ ml: 0.5, fontSize: '16px', color: '#1976D2' }} />
                </Tooltip>
              </Box>
              
              {skillsSuggestions.technical.length > 0 && (
                <Box sx={{ mb: skillsSuggestions.soft.length > 0 ? 2 : 0 }}>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      fontWeight: 500, 
                      fontSize: '13px',
                      color: '#424242',
                      mb: 1
                    }}
                  >
                    Technical Skills
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {skillsSuggestions.technical.map((suggestion) => (
                      <Tooltip key={suggestion.skill} title={suggestion.reasoning} arrow>
                        <Chip
                          label={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <span>{suggestion.skill}</span>
                              <AddIcon sx={{ fontSize: '16px' }} />
                            </Box>
                          }
                          onClick={() => handleAddSuggestedSkill(suggestion.skill, 'technical')}
                          sx={{
                            backgroundColor: 'white',
                            border: '1px solid #64B5F6',
                            borderRadius: '16px',
                            padding: '6px 12px',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            '&:hover': {
                              backgroundColor: '#E3F2FD',
                              borderColor: '#42A5F5'
                            },
                            '& .MuiChip-label': {
                              padding: 0
                            }
                          }}
                        />
                      </Tooltip>
                    ))}
                  </Box>
                </Box>
              )}
              
              {skillsSuggestions.soft.length > 0 && (
                <Box>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      fontWeight: 500, 
                      fontSize: '13px',
                      color: '#424242',
                      mb: 1
                    }}
                  >
                    Soft Skills
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {skillsSuggestions.soft.map((suggestion) => (
                      <Tooltip key={suggestion.skill} title={suggestion.reasoning} arrow>
                        <Chip
                          label={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <span>{suggestion.skill}</span>
                              <AddIcon sx={{ fontSize: '16px' }} />
                            </Box>
                          }
                          onClick={() => handleAddSuggestedSkill(suggestion.skill, 'soft')}
                          sx={{
                            backgroundColor: 'white',
                            border: '1px solid #64B5F6',
                            borderRadius: '16px',
                            padding: '6px 12px',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            '&:hover': {
                              backgroundColor: '#E3F2FD',
                              borderColor: '#42A5F5'
                            },
                            '& .MuiChip-label': {
                              padding: 0
                            }
                          }}
                        />
                      </Tooltip>
                    ))}
                  </Box>
                </Box>
              )}
              
              {/* Action Buttons */}
              <Box sx={{ 
                display: 'flex', 
                gap: 1, 
                mt: 2, 
                pt: 2, 
                borderTop: '1px solid #BBDEFB' 
              }}>
                <Button
                  variant="contained"
                  size="small"
                  onClick={handleApplyAllSuggestions}
                  sx={{
                    backgroundColor: '#1976D2',
                    color: 'white',
                    textTransform: 'none',
                    fontSize: '12px',
                    fontWeight: 500,
                    px: 2,
                    py: 0.5,
                    '&:hover': {
                      backgroundColor: '#1565C0'
                    }
                  }}
                >
                  Apply All
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={handleRejectAllSuggestions}
                  sx={{
                    borderColor: '#1976D2',
                    color: '#1976D2',
                    textTransform: 'none',
                    fontSize: '12px',
                    fontWeight: 500,
                    px: 2,
                    py: 0.5,
                    '&:hover': {
                      borderColor: '#1565C0',
                      backgroundColor: '#E3F2FD'
                    }
                  }}
                >
                  Reject All
                </Button>
              </Box>
            </Box>
        )}
      </Box>
    )
  }

  const renderDisplay = (data: any) => {
    // Handler functions for display mode
    const handleApplyAllSuggestionsDisplay = async () => {
      if (!skillsSuggestions) {
        return;
      }


      const updatedData = { ...data }

      // Add all technical skills
      if (skillsSuggestions.technical.length > 0) {
        updatedData.technical = [
          ...(updatedData.technical || []),
          ...skillsSuggestions.technical.map(s => s.skill)
        ]
      }

      // Add all soft skills
      if (skillsSuggestions.soft.length > 0) {
        updatedData.soft = [
          ...(updatedData.soft || []),
          ...skillsSuggestions.soft.map(s => s.skill)
        ]
      }

      // Update the data
      onUpdate(updatedData)
      onSave?.(updatedData, 'All AI suggested skills applied')

      // Dismiss all suggestions - this will DELETE the enhancement from backend since all are applied
      await dismissAllSkillSuggestions()

      showSuccess('All AI suggested skills have been applied')
    }

    const handleRejectAllSuggestionsDisplay = async () => {
      await dismissAllSkillSuggestions()
      showSuccess('All AI suggestions have been rejected')
    }

    return (
      <Box>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {data.technical?.map((skill: string, index: number) => (
            <Chip
              key={index}
              label={skill}
              sx={{
                bgcolor: '#e3f2fd',
                color: '#1976d2'
              }}
            />
          ))}
          {data.soft?.map((skill: string, index: number) => (
            <Chip
              key={`soft-${index}`}
              label={skill}
              sx={{
                bgcolor: '#f3e5f5',
                color: '#7b1fa2'
              }}
            />
          ))}
        </Box>
      
      {/* AI Skills Suggestions - Show in display mode too */}
      {hasSuggestions && (
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
              AI Suggested Skills
            </Typography>
            <Tooltip title="AI-generated skills based on job description">
              <InfoIcon sx={{ ml: 1, fontSize: 16, color: '#1976d2' }} />
            </Tooltip>
          </Box>
          
          {(skillsSuggestions.technical.length > 0 || skillsSuggestions.soft.length > 0) && (
            <Box>
              {skillsSuggestions.technical.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" sx={{ fontWeight: 'bold', color: '#666', display: 'block', mb: 1 }}>
                    Technical Skills:
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: { xs: 0.25, sm: 0.5 } }}>
                    {skillsSuggestions.technical.map((suggestion, index) => (
                      <Tooltip key={index} title={suggestion.reasoning}>
                        <Chip
                          label={suggestion.skill}
                          size="small"
                          sx={{ 
                            backgroundColor: 'white',
                            border: '1px solid #1976d2',
                            color: '#1976d2',
                            cursor: 'pointer',
                            '&:hover': {
                              backgroundColor: '#f5f5f5'
                            }
                          }}
                          onClick={() => {
                            const updatedData = {
                              ...data,
                              technical: [...(data.technical || []), suggestion.skill]
                            }
                            onUpdate(updatedData)
                            onSave?.(updatedData)
                            dismissSkillSuggestion(suggestion.skill, 'technical')
                            showSuccess(`Added "${suggestion.skill}" to technical skills`)
                          }}
                        />
                      </Tooltip>
                    ))}
                  </Box>
                </Box>
              )}
              
              {skillsSuggestions.soft.length > 0 && (
                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 'bold', color: '#666', display: 'block', mb: 1 }}>
                    Soft Skills:
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: { xs: 0.25, sm: 0.5 } }}>
                    {skillsSuggestions.soft.map((suggestion, index) => (
                      <Tooltip key={index} title={suggestion.reasoning}>
                        <Chip
                          label={suggestion.skill}
                          size="small"
                          sx={{ 
                            backgroundColor: 'white',
                            border: '1px solid #7b1fa2',
                            color: '#7b1fa2',
                            cursor: 'pointer',
                            '&:hover': {
                              backgroundColor: '#f5f5f5'
                            }
                          }}
                          onClick={() => {
                            const updatedData = {
                              ...data,
                              soft: [...(data.soft || []), suggestion.skill]
                            }
                            onUpdate(updatedData)
                            onSave?.(updatedData)
                            dismissSkillSuggestion(suggestion.skill, 'soft')
                            showSuccess(`Added "${suggestion.skill}" to soft skills`)
                          }}
                        />
                      </Tooltip>
                    ))}
                  </Box>
                </Box>
              )}
              
              {/* Action Buttons for Display Mode */}
              <Box sx={{ 
                display: 'flex', 
                gap: 1, 
                mt: 2, 
                pt: 2, 
                borderTop: '1px solid #BBDEFB' 
              }}>
                <Button
                  variant="contained"
                  size="small"
                  onClick={handleApplyAllSuggestionsDisplay}
                  sx={{
                    backgroundColor: '#1976D2',
                    color: 'white',
                    textTransform: 'none',
                    fontSize: '12px',
                    fontWeight: 500,
                    px: 2,
                    py: 0.5,
                    '&:hover': {
                      backgroundColor: '#1565C0'
                    }
                  }}
                >
                  Apply All
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={handleRejectAllSuggestionsDisplay}
                  sx={{
                    borderColor: '#1976D2',
                    color: '#1976D2',
                    textTransform: 'none',
                    fontSize: '12px',
                    fontWeight: 500,
                    px: 2,
                    py: 0.5,
                    '&:hover': {
                      borderColor: '#1565C0',
                      backgroundColor: '#E3F2FD'
                    }
                  }}
                >
                  Reject All
                </Button>
              </Box>
            </Box>
          )}
        </Box>
      )}
    </Box>
  )
  }

  return (
    <SimpleFormSection
      data={data}
      onUpdate={onUpdate}
      onSave={onSave}
      isEditing={isEditing}
      onEdit={onEdit}
      onClose={onClose}
      onUnsavedChanges={undefined} // Skills auto-save immediately, no unsaved changes tracking needed
      title={title}
      sectionId="skills"
      requiredFields={[]} // Skills are optional
      renderForm={renderForm}
      renderDisplay={renderDisplay}
      autoSaveMessage="Skills auto-saved"
      autoSaveMode={true} // Hide save/cancel buttons for Skills section
      onTitleSave={onTitleSave}
    />
  )
}

// Memoize component to prevent unnecessary re-renders
export default React.memo(SkillsSection, (prevProps, nextProps) => {
  // Re-render only if critical props change
  return (
    prevProps.data === nextProps.data &&
    prevProps.isEditing === nextProps.isEditing &&
    prevProps.cvId === nextProps.cvId
  );
});
