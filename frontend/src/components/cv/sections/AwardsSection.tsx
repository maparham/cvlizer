import React from 'react'
import { Box, Typography } from '@mui/material'
import { SectionProps } from '../../../types'
import IndividualItemSection from '../core/IndividualItemSection'
import { FormField, DateFieldComponent, ValidatedFieldDisplay } from '../core/formUtils'
import { generateSectionId } from '../../../utils/idGenerator'
import MarkdownRenderer from '../../common/MarkdownRenderer'
import { useFieldValidation } from '../../../hooks/useFieldValidation'

interface Award {
  id: string
  name: string
  issuer: string
  date: string
  description: string
}

// Separate component for award form to allow using hooks
const AwardForm: React.FC<{
  award: Award;
  index: number;
  updateAward: (field: keyof Award, value: any) => void;
  onSave?: () => void;
}> = ({ award, index, updateAward, onSave }) => {
  // Get validation errors for this award item
  const nameValidation = useFieldValidation('awards', index, 'name');
  const issuerValidation = useFieldValidation('awards', index, 'issuer');
  const dateValidation = useFieldValidation('awards', index, 'date');

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <FormField
        config={{
          name: 'name',
          label: 'Award Name',
          placeholder: 'e.g., Employee of the Year',
          required: true
        }}
        value={award.name}
        onChange={(value) => updateAward('name', value)}
        onSave={onSave}
        error={nameValidation.hasError}
        helperText={nameValidation.errorMessage}
      />
      <FormField
        config={{
          name: 'issuer',
          label: 'Issuing Organization',
          placeholder: 'e.g., Tech Company Inc.',
          required: true
        }}
        value={award.issuer}
        onChange={(value) => updateAward('issuer', value)}
        onSave={onSave}
        error={issuerValidation.hasError}
        helperText={issuerValidation.errorMessage}
      />
      <DateFieldComponent
        config={{
          name: 'date',
          label: 'Date Received',
          required: true
        }}
        value={award.date}
        onChange={(value) => updateAward('date', value)}
        onSave={onSave}
        error={dateValidation.hasError}
        helperText={dateValidation.errorMessage}
      />
      <FormField
        config={{
          name: 'description',
          label: 'Description (Optional)',
          placeholder: 'Additional details about the award...',
          multiline: true,
          rows: 2
        }}
        value={award.description}
        onChange={(value) => updateAward('description', value)}
        onSave={onSave}
      />
    </Box>
  );
};

// Separate component for award display to allow using hooks
const AwardDisplay: React.FC<{
  award: Award;
  index: number;
}> = ({ award, index }) => {
  // Get validation errors for this award item
  const nameValidation = useFieldValidation('awards', index, 'name');
  const issuerValidation = useFieldValidation('awards', index, 'issuer');
  const dateValidation = useFieldValidation('awards', index, 'date');

  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5, pr: 10 }}>
        <Box sx={{ flex: 1 }}>
          <ValidatedFieldDisplay
            validation={nameValidation}
            variant="subtitle1"
            normalColor="#333"
          >
            🏆 {award.name}
          </ValidatedFieldDisplay>
        </Box>
        <Box sx={{ flexShrink: 0, ml: 2, minWidth: 120 }}>
          <ValidatedFieldDisplay
            validation={dateValidation}
            variant="body2"
            normalColor="#666"
            iconSize="0.875rem"
            align="flex-end"
          >
            {award.date}
          </ValidatedFieldDisplay>
        </Box>
      </Box>
      <Box sx={{ mb: 1 }}>
        <ValidatedFieldDisplay
          validation={issuerValidation}
          variant="body2"
          normalColor="#666"
          iconSize="0.875rem"
          sx={{ mb: 0 }}
        >
          {award.issuer}
        </ValidatedFieldDisplay>
      </Box>
      {award.description && (
        <Box>
          <MarkdownRenderer content={award.description} variant="body1" />
        </Box>
      )}
    </>
  );
};

const AwardsSection: React.FC<SectionProps> = ({ data, onUpdate, onSave, isEditing, onEdit, onClose, onUnsavedChanges, registerIndividualItemEditing, unregisterIndividualItemEditing, requestIndividualItemCancel, title = 'Awards & Recognition', onTitleSave, cvId }) => {
  const createNewAward = (): Award => ({
    id: generateSectionId('awards'),
    name: '',
    issuer: '',
    date: '',
    description: ''
  })

  const renderAwardForm = (award: Award, index: number, updateAward: (field: keyof Award, value: any) => void, onSave?: () => void) => {
    return (
      <AwardForm
        award={award}
        index={index}
        updateAward={updateAward}
        onSave={onSave}
      />
    );
  }

  const renderAwardDisplay = (award: Award, index: number) => {
    return (
      <AwardDisplay
        award={award}
        index={index}
      />
    );
  }

  return (
    <IndividualItemSection
      data={data as Award[]}
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
      emptyMessage="No awards added yet."
      createNewItem={createNewAward}
      requiredFields={['name', 'issuer', 'date']}
      renderItemForm={renderAwardForm}
      renderItemDisplay={renderAwardDisplay}
      autoSaveMessage="Award"
      sortOptions={[
        { field: 'date', label: 'Date Received' }
      ]}
      cvId={cvId}
    />
  )
}

// Memoize to prevent unnecessary re-renders of award items
export default React.memo(AwardsSection, (prevProps, nextProps) => {
  return (
    prevProps.data === nextProps.data &&
    prevProps.isEditing === nextProps.isEditing
  );
});
