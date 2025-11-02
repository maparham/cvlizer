import React from 'react'
import { Box, Typography } from '@mui/material'
import { SectionProps } from '../../../types'
import IndividualItemSection from '../core/IndividualItemSection'
import { FormField, DateFieldComponent } from '../core/formUtils'
import { ValidatedFormField, ValidatedDateField, ValidatedDisplay, useItemValidation } from '../core/validatedFields'
import { generateSectionId } from '../../../utils/idGenerator'
import MarkdownRenderer from '../../common/MarkdownRenderer'

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
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <ValidatedFormField
        section="volunteer_experience"
        field="organization"
        index={index}
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
      <ValidatedFormField
        section="volunteer_experience"
        field="role"
        index={index}
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
        <ValidatedDateField
          section="volunteer_experience"
          field="start_date"
          index={index}
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

// Separate component for volunteer experience display (no hooks - validation passed as props)
const VolunteerExperienceDisplay: React.FC<{
  volunteer: VolunteerExperience;
  index: number;
  validation: {
    organization: { hasError: boolean; errorMessage?: string };
    role: { hasError: boolean; errorMessage?: string };
    start_date: { hasError: boolean; errorMessage?: string };
  };
}> = ({ volunteer, index, validation }) => {
  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5, pr: 10 }}>
        <Box sx={{ flex: 1 }}>
          <ValidatedDisplay
            validation={validation.role}
            variant="subtitle1"
            normalColor="#333"
          >
            🤝 {volunteer.role}
          </ValidatedDisplay>
        </Box>
        <Box sx={{ flexShrink: 0, ml: 2, minWidth: 120 }}>
          <ValidatedDisplay
            validation={validation.start_date}
            variant="body2"
            normalColor="#666"
            iconSize="0.875rem"
            align="flex-end"
          >
            {volunteer.start_date}
            {volunteer.end_date ? ` - ${volunteer.end_date}` : ' - Present'}
          </ValidatedDisplay>
        </Box>
      </Box>
      <Box sx={{ mb: 1 }}>
        <ValidatedDisplay
          validation={validation.organization}
          variant="body2"
          normalColor="#666"
          iconSize="0.875rem"
          sx={{ mb: 0 }}
        >
          {volunteer.organization}
        </ValidatedDisplay>
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
    // Get all validation states at once using useItemValidation hook
    const VolunteerExperienceDisplayWrapper: React.FC<{ volunteer: VolunteerExperience; index: number }> = ({ volunteer, index }) => {
      const validation = useItemValidation('volunteer_experience', index, ['organization', 'role', 'start_date']);
      return <VolunteerExperienceDisplay volunteer={volunteer} index={index} validation={validation} />;
    };

    return <VolunteerExperienceDisplayWrapper volunteer={volunteer} index={index} />;
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
