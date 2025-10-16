import React from 'react'
import { Box, Typography } from '@mui/material'
import { SectionProps } from '../../../types'
import IndividualItemSection from '../core/IndividualItemSection'
import { FormField, DateFieldComponent } from '../core/formUtils'
import { generateSectionId } from '../../../utils/idGenerator'

interface VolunteerExperience {
  id: string
  organization: string
  role: string
  start_date: string
  end_date?: string
  description: string
}

const VolunteerExperienceSection: React.FC<SectionProps> = ({ data, onUpdate, onSave, isEditing, onEdit, onClose, onUnsavedChanges, registerIndividualItemEditing, unregisterIndividualItemEditing, requestIndividualItemCancel, title = 'Volunteer Experience', onTitleSave, cvId }) => {
  const createNewVolunteerExperience = (): VolunteerExperience => ({
    id: generateSectionId('volunteer_experience'),
    organization: '',
    role: '',
    start_date: '',
    end_date: '',
    description: ''
  })

  const renderVolunteerForm = (volunteer: VolunteerExperience, _index: number, updateVolunteer: (field: keyof VolunteerExperience, value: any) => void, onSave?: () => void) => (
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
        onSave={onSave}
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
        onSave={onSave}
      />
      <Box sx={{ display: 'flex', gap: 2 }}>
        <DateFieldComponent
          config={{
            name: 'start_date',
            label: 'Start Date',
            required: true
          }}
          value={volunteer.start_date}
          onChange={(value) => updateVolunteer('start_date', value)}
          onSave={onSave}
          sx={{ flex: 1 }}
        />
        <DateFieldComponent
          config={{
            name: 'end_date',
            label: 'End Date (Optional)',
            minDate: volunteer.start_date || undefined // End date must be after start date
          }}
          value={volunteer.end_date || ''}
          onChange={(value) => updateVolunteer('end_date', value)}
          onSave={onSave}
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
        onSave={onSave}
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
      data={data as VolunteerExperience[]}
      onUpdate={onUpdate}
      onSave={onSave}
      isEditing={isEditing}
      onEdit={onEdit}
      onClose={onClose}
      onUnsavedChanges={onUnsavedChanges}
      registerIndividualItemEditing={registerIndividualItemEditing as any}
      unregisterIndividualItemEditing={unregisterIndividualItemEditing as any}
      requestIndividualItemCancel={requestIndividualItemCancel as any}
      title={title}
      onTitleSave={onTitleSave}
      emptyMessage="No volunteer experience added yet."
      createNewItem={createNewVolunteerExperience}
      requiredFields={['organization', 'role', 'start_date']}
      renderItemForm={renderVolunteerForm}
      renderItemDisplay={renderVolunteerDisplay}
      autoSaveMessage="Volunteer experience"
      sortOptions={[
        { field: 'start_date', label: 'Start Date' },
        { field: 'end_date', label: 'End Date' }
      ]}
      cvId={cvId}
      enhancementContentField="description"
    />
  )
}

// Memoize to prevent unnecessary re-renders of volunteer experience items
export default React.memo(VolunteerExperienceSection, (prevProps, nextProps) => {
  return (
    prevProps.data === nextProps.data &&
    prevProps.isEditing === nextProps.isEditing
  );
});
