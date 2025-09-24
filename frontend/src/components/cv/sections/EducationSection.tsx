import React from 'react'
import { Box, TextField, Button, Typography, IconButton } from '@mui/material'
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material'
import { SectionProps } from '../types'
import IndividualItemSection from '../core/IndividualItemSection'
import { FormField, DateFieldComponent } from '../core/formUtils'
import LocationAutocomplete from '../ui/LocationAutocomplete'
import DegreeAutocomplete from '../ui/DegreeAutocomplete'
import { generateSectionId } from '../../../utils/idGenerator'
import { useFieldValidation } from '../../../hooks/useFieldValidation'

interface Education {
  id: string
  institution: string
  degree: string
  field_of_study: string
  location: string
  start_date: string
  end_date: string
  gpa: string
  description: string
  achievements: string[]
  honors: string[]
}

const EducationSection: React.FC<SectionProps> = ({ data, onUpdate, onSave, isEditing, onEdit, onClose, onUnsavedChanges, registerIndividualItemEditing, unregisterIndividualItemEditing, requestIndividualItemCancel }) => {
  const createNewEducation = (): Education => ({
    id: generateSectionId('education'),
    institution: '',
    degree: '',
    field_of_study: '',
    location: '',
    start_date: '',
    end_date: '',
    gpa: '',
    description: '',
    achievements: [],
    honors: []
  })

  const renderEducationForm = (edu: Education, index: number, updateEducation: (field: keyof Education, value: any) => void) => {
    // Get validation errors for this education item
    const startDateValidation = useFieldValidation('education', index, 'start_date')
    const endDateValidation = useFieldValidation('education', index, 'end_date')
    const addHonor = () => {
      const currentHonors = edu.honors || []
      const newHonors = [...currentHonors, '']
      updateEducation('honors', newHonors)
    }

    const updateHonor = (honorIndex: number, value: string) => {
      const currentHonors = edu.honors || []
      const newHonors = [...currentHonors]
      newHonors[honorIndex] = value
      updateEducation('honors', newHonors)
    }

    const removeHonor = (honorIndex: number) => {
      const currentHonors = edu.honors || []
      const newHonors = currentHonors.filter((_, i) => i !== honorIndex)
      updateEducation('honors', newHonors)
    }

    const addAchievement = () => {
      const currentAchievements = edu.achievements || []
      const newAchievements = [...currentAchievements, '']
      updateEducation('achievements', newAchievements)
    }

    const updateAchievement = (achievementIndex: number, value: string) => {
      const currentAchievements = edu.achievements || []
      const newAchievements = [...currentAchievements]
      newAchievements[achievementIndex] = value
      updateEducation('achievements', newAchievements)
    }

    const removeAchievement = (achievementIndex: number) => {
      const currentAchievements = edu.achievements || []
      const newAchievements = currentAchievements.filter((_, i) => i !== achievementIndex)
      updateEducation('achievements', newAchievements)
    }

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <DegreeAutocomplete
          value={edu.degree || ''}
          onChange={(value) => updateEducation('degree', value)}
          placeholder="e.g., Bachelor of Science"
          label="Degree"
          error={!edu.degree?.trim()}
          helperText={!edu.degree?.trim() ? 'Degree is required' : ''}
        />
        <FormField
          config={{
            name: 'institution',
            label: 'Institution',
            placeholder: 'e.g., University of California',
            required: true
          }}
          value={edu.institution}
          onChange={(value) => updateEducation('institution', value)}
        />
        <FormField
          config={{
            name: 'field_of_study',
            label: 'Field of Study',
            placeholder: 'e.g., Computer Science'
          }}
          value={edu.field_of_study}
          onChange={(value) => updateEducation('field_of_study', value)}
        />
        <LocationAutocomplete
          value={edu.location || ''}
          onChange={(value) => updateEducation('location', value)}
          placeholder="e.g., Boston, MA"
        />
        <Box sx={{ display: 'flex', gap: 2 }}>
          <DateFieldComponent
            config={{
              name: 'start_date',
              label: 'Start Date',
              required: true
            }}
            value={edu.start_date}
            onChange={(value) => updateEducation('start_date', value)}
            sx={{ flex: 1 }}
            {...startDateValidation.fieldProps}
          />
          <DateFieldComponent
            config={{
              name: 'end_date',
              label: 'End Date',
              minDate: edu.start_date || undefined // End date must be after start date
            }}
            value={edu.end_date}
            onChange={(value) => updateEducation('end_date', value)}
            sx={{ flex: 1 }}
            {...endDateValidation.fieldProps}
          />
        </Box>
        <FormField
          config={{
            name: 'gpa',
            label: 'GPA',
            placeholder: 'e.g., 3.8/4.0'
          }}
          value={edu.gpa}
          onChange={(value) => updateEducation('gpa', value)}
        />
        <FormField
          config={{
            name: 'description',
            label: 'Description',
            placeholder: 'Describe your education, coursework, thesis, or relevant projects...',
            multiline: true,
            rows: 3
          }}
          value={edu.description}
          onChange={(value) => updateEducation('description', value)}
        />
        
        <Box>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
            Achievements
          </Typography>
          {(edu.achievements || []).map((achievement: string, achievementIndex: number) => (
            <Box key={achievementIndex} sx={{ 
              display: 'flex', 
              gap: 1, 
              mb: 1,
              '&:hover .item-action-button': {
                opacity: 1
              }
            }}>
              <TextField
                fullWidth
                size="small"
                value={achievement}
                onChange={(e) => updateAchievement(achievementIndex, e.target.value)}
                placeholder="Enter academic achievement"
              />
              <IconButton
                size="small"
                onClick={() => removeAchievement(achievementIndex)}
                className="item-action-button"
                sx={{
                  color: 'text.secondary',
                  opacity: 0.3,
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    color: 'error.main',
                    bgcolor: 'rgba(255, 235, 238, 0.5)',
                    opacity: 1
                  }
                }}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>
          ))}
          <Button size="small" startIcon={<AddIcon />} onClick={addAchievement}>
            Add Achievement
          </Button>
        </Box>
        
        <Box>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
            Honors & Awards
          </Typography>
          {(edu.honors || []).map((honor: string, honorIndex: number) => (
            <Box key={honorIndex} sx={{ 
              display: 'flex', 
              gap: 1, 
              mb: 1,
              '&:hover .item-action-button': {
                opacity: 1
              }
            }}>
              <TextField
                fullWidth
                size="small"
                value={honor}
                onChange={(e) => updateHonor(honorIndex, e.target.value)}
                placeholder="Enter honor or award"
              />
              <IconButton
                size="small"
                onClick={() => removeHonor(honorIndex)}
                className="item-action-button"
                sx={{
                  color: 'text.secondary',
                  opacity: 0.3,
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    color: 'error.main',
                    bgcolor: 'rgba(255, 235, 238, 0.5)',
                    opacity: 1
                  }
                }}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>
          ))}
          <Button size="small" startIcon={<AddIcon />} onClick={addHonor}>
            Add Honor/Award
          </Button>
        </Box>
      </Box>
    )
  }

  const renderEducationDisplay = (edu: Education, index: number) => {
    // Get validation errors for this education item
    const startDateValidation = useFieldValidation('education', index, 'start_date')
    const endDateValidation = useFieldValidation('education', index, 'end_date')
    
    return (
      <>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#333', mb: 0.5 }}>
          {edu.degree || 'Degree'}
        </Typography>
        <Typography variant="subtitle1" sx={{ color: '#1976d2', mb: 1 }}>
          {edu.institution || 'Institution'}
          {edu.location && ` • ${edu.location}`}
        </Typography>
        {edu.field_of_study && (
          <Typography variant="body2" sx={{ color: '#666', mb: 1 }}>
            {edu.field_of_study}
          </Typography>
        )}
        <Box sx={{ mb: 1 }}>
          {(startDateValidation.hasError || endDateValidation.hasError) && (
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 1, 
              mb: 0.5, 
              p: 1,
              backgroundColor: '#ffebee',
              border: '1px solid #f44336',
              borderRadius: 1,
              borderLeft: '4px solid #f44336'
            }}>
              <Box sx={{ color: '#f44336', display: 'flex', alignItems: 'center' }}>
                ⚠
              </Box>
              <Typography variant="body2" sx={{ color: '#d32f2f', fontWeight: 500 }}>
                {startDateValidation.errorMessage || endDateValidation.errorMessage}
              </Typography>
            </Box>
          )}
          <Typography variant="body2" sx={{ color: '#666' }}>
            {edu.start_date || 'Start date required'} - {edu.end_date || 'PRESENT'}
          </Typography>
        </Box>
        {edu.gpa && (
        <Typography variant="body2" sx={{ color: '#666', mb: 1 }}>
          GPA: {edu.gpa}
        </Typography>
      )}
      {edu.description && (
        <Typography variant="body1" sx={{ lineHeight: 1.6, mb: 1 }}>
          {edu.description}
        </Typography>
      )}
      {edu.achievements && edu.achievements.length > 0 && (
        <Box sx={{ mb: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
            Achievements:
          </Typography>
          <ul style={{ margin: 0, paddingLeft: '20px' }}>
            {edu.achievements.map((achievement: string, achievementIndex: number) => (
              <li key={achievementIndex}>
                <Typography variant="body2" sx={{ color: '#666' }}>
                  {achievement}
                </Typography>
              </li>
            ))}
          </ul>
        </Box>
      )}
      {edu.honors && edu.honors.length > 0 && (
        <Box sx={{ mt: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
            Honors & Awards:
          </Typography>
          <ul style={{ margin: 0, paddingLeft: '20px' }}>
            {edu.honors.map((honor: string, honorIndex: number) => (
              <li key={honorIndex}>
                <Typography variant="body2" sx={{ color: '#666' }}>
                  {honor}
                </Typography>
              </li>
            ))}
          </ul>
        </Box>
      )}
    </>
    )
  }

  return (
    <IndividualItemSection
      data={data as Education[]}
      onUpdate={onUpdate}
      onSave={onSave}
      isEditing={isEditing}
      onEdit={onEdit}
      onClose={onClose}
      onUnsavedChanges={onUnsavedChanges}
      registerIndividualItemEditing={registerIndividualItemEditing as any}
      unregisterIndividualItemEditing={unregisterIndividualItemEditing as any}
      requestIndividualItemCancel={requestIndividualItemCancel as any}
      title="Education"
      emptyMessage="Click the + button to add your first education entry"
      createNewItem={createNewEducation}
      requiredFields={['degree', 'institution', 'start_date']}
      renderItemForm={renderEducationForm}
      renderItemDisplay={renderEducationDisplay}
      autoSaveMessage="Education"
      sortOptions={[
        { field: 'start_date', label: 'Start Date' },
        { field: 'end_date', label: 'End Date' }
      ]}
    />
  )
}

export default EducationSection
