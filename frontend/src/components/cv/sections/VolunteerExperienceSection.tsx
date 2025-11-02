import React from 'react'
import { Box, Typography } from '@mui/material'
import { SectionProps } from '../../../types'
import IndividualItemSection from '../core/IndividualItemSection'
import { FormField, DateFieldComponent, ValidatedFieldDisplay } from '../core/formUtils'
import { generateSectionId } from '../../../utils/idGenerator'
import MarkdownRenderer from '../../common/MarkdownRenderer'
import { useFieldValidation } from '../../../hooks/useFieldValidation'

interface VolunteerExperience {
  id: string
  organization: string
  role: string
  start_date: string
  end_date?: string
  description: string
}

// Separate component for volunteer experience form to allow using hooks
const VolunteerExperienceForm: React.FC<{
  volunteer: VolunteerExperience;
  index: number;
  updateVolunteer: (field: keyof VolunteerExperience, value: any) => void;
  onSave?: () => void;
}> = ({ volunteer, index, updateVolunteer, onSave }) => {
  // Get validation errors for this volunteer experience item
  const organizationValidation = useFieldValidation('volunteer_experience', index, 'organization');
  const roleValidation = useFieldValidation('volunteer_experience', index, 'role');
  const startDateValidation = useFieldValidation('volunteer_experience', index, 'start_date');

  return (
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
        error={organizationValidation.hasError}
        helperText={organizationValidation.errorMessage}
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
        error={roleValidation.hasError}
        helperText={roleValidation.errorMessage}
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
          error={startDateValidation.hasError}
          helperText={startDateValidation.errorMessage}
        />
        <DateFieldComponent
          config={{
            name: 'end_date',
            label: 'End Date',
            minDate: volunteer.start_date || undefined
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
          placeholder: 'Describe your volunteer work...',
          multiline: true,
          rows: 3
        }}
        value={volunteer.description}
        onChange={(value) => updateVolunteer('description', value)}
        onSave={onSave}
      />
    </Box>
  );
};

// Separate component for volunteer experience display to allow using hooks
const VolunteerExperienceDisplay: React.FC<{
  volunteer: VolunteerExperience;
  index: number;
}> = ({ volunteer, index }) => {
  // Get validation errors for this volunteer experience item
  const organizationValidation = useFieldValidation('volunteer_experience', index, 'organization');
  const roleValidation = useFieldValidation('volunteer_experience', index, 'role');
  const startDateValidation = useFieldValidation('volunteer_experience', index, 'start_date');

  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5, pr: 10 }}>
        <Box sx={{ flex: 1 }}>
          <ValidatedFieldDisplay
            validation={roleValidation}
            variant="subtitle1"
            normalColor="#333"
          >
            🤝 {volunteer.role}
          </ValidatedFieldDisplay>
        </Box>
        <Box sx={{ flexShrink: 0, ml: 2, minWidth: 120 }}>
          <ValidatedFieldDisplay
            validation={startDateValidation}
            variant="body2"
            normalColor="#666"
            iconSize="0.875rem"
            align="flex-end"
          >
            {volunteer.start_date}
            {volunteer.end_date ? ` - ${volunteer.end_date}` : ' - Present'}
          </ValidatedFieldDisplay>
        </Box>
      </Box>
      <Box sx={{ mb: 1 }}>
        <ValidatedFieldDisplay
          validation={organizationValidation}
          variant="body2"
          normalColor="#666"
          iconSize="0.875rem"
          sx={{ mb: 0 }}
        >
          {volunteer.organization}
        </ValidatedFieldDisplay>
      </Box>
      <Box>
        <MarkdownRenderer content={volunteer.description} variant="body1" />
      </Box>
    </>
  );
};

const VolunteerExperienceSection: React.FC<SectionProps> = ({ data, onUpdate, onSave, isEditing, onEdit, onClose, onUnsavedChanges, registerIndividualItemEditing, unregisterIndividualItemEditing, requestIndividualItemCancel, title = 'Volunteer Experience', onTitleSave, cvId }) => {
  const createNewVolunteerExperience = (): VolunteerExperience => ({
    id: generateSectionId('volunteer_experience'),
    organization: '',
    role: '',
    start_date: '',
    end_date: '',
    description: ''
  })

  const renderVolunteerForm = (volunteer: VolunteerExperience, index: number, updateVolunteer: (field: keyof VolunteerExperience, value: any) => void, onSave?: () => void) => {
    return (
      <VolunteerExperienceForm
        volunteer={volunteer}
        index={index}
        updateVolunteer={updateVolunteer}
        onSave={onSave}
      />
    );
  }

  const renderVolunteerDisplay = (volunteer: VolunteerExperience, index: number) => {
    return (
      <VolunteerExperienceDisplay
        volunteer={volunteer}
        index={index}
      />
    );
  }

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
