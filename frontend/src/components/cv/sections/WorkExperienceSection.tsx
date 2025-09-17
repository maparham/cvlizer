/**
 * Work Experience Section Component
 * 
 * This module manages the work experience section of a CV including:
 * - Multiple work experience entries with individual editing
 * - Job position and location autocomplete functionality
 * - Date range management with current job handling
 * - Achievements and technologies tracking
 * - Add, edit, delete, and reorder functionality
 */
import React from 'react'
import { Box, Typography } from '@mui/material'
import { SectionProps } from '../types'
import IndividualItemSection from '../core/IndividualItemSection'
import { FormField, DateFieldComponent } from '../core/formUtils'
import LocationAutocomplete from '../ui/LocationAutocomplete'
import JobPositionAutocomplete from '../ui/JobPositionAutocomplete'

interface WorkExperience {
  company: string
  position: string
  location: string
  start_date: string
  end_date: string
  current: boolean
  description: string
  achievements: string[]
  technologies: string[]
}

const WorkExperienceSection: React.FC<SectionProps> = ({ data, onUpdate, onSave, isEditing, onEdit, onClose, onUnsavedChanges, registerIndividualItemEditing, unregisterIndividualItemEditing, requestIndividualItemCancel }) => {
  const createNewExperience = (): WorkExperience => ({
    company: '',
    position: '',
    location: '',
    start_date: '',
    end_date: '',
    current: false,
    description: '',
    achievements: [],
    technologies: []
  })

  const renderExperienceForm = (exp: WorkExperience, _index: number, updateExperience: (field: keyof WorkExperience, value: any) => void) => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <JobPositionAutocomplete
        value={exp.position || ''}
        onChange={(value) => updateExperience('position', value)}
        error={!exp.position?.trim()}
        helperText={!exp.position?.trim() ? "Position is required" : ""}
        placeholder="e.g., Software Engineer"
      />
      <FormField
        config={{
          name: 'company',
          label: 'Company',
          placeholder: 'e.g., Tech Company Inc.',
          required: true
        }}
        value={exp.company}
        onChange={(value) => updateExperience('company', value)}
      />
      <LocationAutocomplete
        value={exp.location || ''}
        onChange={(value) => updateExperience('location', value)}
        placeholder="e.g., San Francisco, CA"
      />
      <Box sx={{ display: 'flex', gap: 2 }}>
        <DateFieldComponent
          config={{
            name: 'start_date',
            label: 'Start Date',
            required: true
          }}
          value={exp.start_date}
          onChange={(value) => updateExperience('start_date', value)}
          sx={{ flex: 1 }}
        />
        <DateFieldComponent
          config={{
            name: 'end_date',
            label: 'End Date'
          }}
          value={exp.end_date}
          onChange={(value) => updateExperience('end_date', value)}
          sx={{ flex: 1 }}
        />
      </Box>
      <FormField
        config={{
          name: 'description',
          label: 'Description',
          placeholder: 'Describe your role and achievements...',
          multiline: true,
          rows: 3
        }}
        value={exp.description}
        onChange={(value) => updateExperience('description', value)}
      />
    </Box>
  )

  const renderExperienceDisplay = (exp: WorkExperience, _index: number) => (
    <>
      <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#333', mb: 0.5 }}>
        {exp.position || 'Position Title'}
      </Typography>
      <Typography variant="subtitle1" sx={{ color: '#1976d2', mb: 1 }}>
        {exp.company || 'Company Name'}
        {exp.location && ` • ${exp.location}`}
      </Typography>
      <Typography variant="body2" sx={{ color: '#666', mb: 1 }}>
        {exp.start_date} - {exp.current ? 'PRESENT' : (exp.end_date || 'PRESENT')}
      </Typography>
      <Typography variant="body1" sx={{ lineHeight: 1.6 }}>
        {exp.description || 'Job description...'}
      </Typography>
    </>
  )

  return (
    <IndividualItemSection
      data={data}
      onUpdate={onUpdate}
      onSave={onSave}
      isEditing={isEditing}
      onEdit={onEdit}
      onClose={onClose}
      onUnsavedChanges={onUnsavedChanges}
      registerIndividualItemEditing={registerIndividualItemEditing}
      unregisterIndividualItemEditing={unregisterIndividualItemEditing}
      requestIndividualItemCancel={requestIndividualItemCancel}
      title="Work Experience"
      emptyMessage="Click the + button to add your first work experience"
      createNewItem={createNewExperience}
      requiredFields={['position', 'company', 'start_date']}
      renderItemForm={renderExperienceForm}
      renderItemDisplay={renderExperienceDisplay}
      autoSaveMessage="Work experience"
      sortOptions={[
        { field: 'start_date', label: 'Start Date' },
        { field: 'end_date', label: 'End Date' }
      ]}
    />
  )
}

export default WorkExperienceSection
