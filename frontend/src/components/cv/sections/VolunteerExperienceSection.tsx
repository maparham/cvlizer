import React from 'react'
import { Box, Typography } from '@mui/material'
import { SectionProps } from '../types'
import IndividualItemSection from '../core/IndividualItemSection'
import { FormField, DateField } from '../core/formUtils'

interface VolunteerExperience {
  organization: string
  role: string
  start_date: string
  end_date?: string
  description: string
}

const VolunteerExperienceSection: React.FC<SectionProps> = ({ data, onUpdate, onSave, isEditing, onEdit, onClose, onUnsavedChanges, registerIndividualItemEditing, unregisterIndividualItemEditing, requestIndividualItemCancel }) => {
  const createNewVolunteerExperience = (): VolunteerExperience => ({
    organization: '',
    role: '',
    start_date: '',
    end_date: '',
    description: ''
  })

  const renderVolunteerForm = (volunteer: VolunteerExperience, _index: number, updateVolunteer: (field: keyof VolunteerExperience, value: any) => void) => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <FormField
        config={{
          name: 'organization',
          label: 'Organization',
          placeholder: 'e.g., Local Food Bank',
          required: true
        }}
        value={volunteer.organization}
        onChange={(value) => updateVolunteer('organization', value)}
      />
      <FormField
        config={{
          name: 'role',
          label: 'Role/Position',
          placeholder: 'e.g., Volunteer Coordinator',
          required: true
        }}
        value={volunteer.role}
        onChange={(value) => updateVolunteer('role', value)}
      />
      <Box sx={{ display: 'flex', gap: 2 }}>
        <DateField
          config={{
            name: 'start_date',
            label: 'Start Date',
            required: true
          }}
          value={volunteer.start_date}
          onChange={(value) => updateVolunteer('start_date', value)}
          sx={{ flex: 1 }}
        />
        <DateField
          config={{
            name: 'end_date',
            label: 'End Date (Optional)'
          }}
          value={volunteer.end_date || ''}
          onChange={(value) => updateVolunteer('end_date', value)}
          sx={{ flex: 1 }}
        />
      </Box>
      <FormField
        config={{
          name: 'description',
          label: 'Description',
          placeholder: 'Describe your volunteer work and achievements...',
          multiline: true,
          rows: 3
        }}
        value={volunteer.description}
        onChange={(value) => updateVolunteer('description', value)}
      />
    </Box>
  )

  const renderVolunteerDisplay = (volunteer: VolunteerExperience, _index: number) => (
    <>
      <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#333', mb: 0.5 }}>
        🤝 {volunteer.role}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        {volunteer.organization} • {volunteer.start_date}
        {volunteer.end_date ? ` - ${volunteer.end_date}` : ' - Present'}
      </Typography>
      <Typography variant="body1">
        {volunteer.description}
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
      title="Volunteer Experience"
      emptyMessage="No volunteer experience added yet."
      createNewItem={createNewVolunteerExperience}
      requiredFields={['organization', 'role', 'start_date']}
      renderItemForm={renderVolunteerForm}
      renderItemDisplay={renderVolunteerDisplay}
      autoSaveMessage="Volunteer experience"
    />
  )
}

export default VolunteerExperienceSection
