import React from 'react'
import { Box } from '@mui/material'
import { SectionProps } from '../../../types'
import IndividualItemSection from '../core/IndividualItemSection'
import { FormField } from '../core/formUtils'
import { ValidatedFormField, ValidatedDateField, ValidatedDisplay, useItemValidation } from '../core/validatedFields'
import { generateSectionId } from '../../../utils/idGenerator'
import MarkdownRenderer from '../../common/MarkdownRenderer'

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
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <ValidatedFormField
        section="awards"
        field="name"
        index={index}
        config={{
          name: 'name',
          label: 'Award Name',
          placeholder: 'e.g., Employee of the Year',
          required: true
        }}
        value={award.name}
        onChange={(value) => updateAward('name', value)}
        onSave={onSave}
      />
      <ValidatedFormField
        section="awards"
        field="issuer"
        index={index}
        config={{
          name: 'issuer',
          label: 'Issuing Organization',
          placeholder: 'e.g., Tech Company Inc.',
          required: true
        }}
        value={award.issuer}
        onChange={(value) => updateAward('issuer', value)}
        onSave={onSave}
      />
      <ValidatedDateField
        section="awards"
        field="date"
        index={index}
        config={{
          name: 'date',
          label: 'Date Received',
          required: true
        }}
        value={award.date}
        onChange={(value) => updateAward('date', value)}
        onSave={onSave}
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

// Separate component for award display (no hooks - validation passed as props)
const AwardDisplay: React.FC<{
  award: Award;
  index: number;
  validation: {
    name: { hasError: boolean; errorMessage?: string };
    issuer: { hasError: boolean; errorMessage?: string };
    date: { hasError: boolean; errorMessage?: string };
  };
}> = ({ award, index: _index, validation }) => {
  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5, pr: 10 }}>
        <Box sx={{ flex: 1 }}>
          <ValidatedDisplay
            validation={validation.name}
            variant="subtitle1"
            normalColor="#333"
          >
            🏆 {award.name}
          </ValidatedDisplay>
        </Box>
        <Box sx={{ flexShrink: 0, ml: 2, minWidth: 120 }}>
          <ValidatedDisplay
            validation={validation.date}
            variant="body2"
            normalColor="#666"
            iconSize="0.875rem"
            align="flex-end"
          >
            {award.date}
          </ValidatedDisplay>
        </Box>
      </Box>
      <Box sx={{ mb: 1 }}>
        <ValidatedDisplay
          validation={validation.issuer}
          variant="body2"
          normalColor="#666"
          iconSize="0.875rem"
          sx={{ mb: 0 }}
        >
          {award.issuer}
        </ValidatedDisplay>
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
    // Get all validation states at once using useItemValidation hook
    const AwardDisplayWrapper: React.FC<{ award: Award; index: number }> = ({ award, index }) => {
      const validation = useItemValidation('awards', index, ['name', 'issuer', 'date']);
      return <AwardDisplay award={award} index={index} validation={validation} />;
    };

    return <AwardDisplayWrapper award={award} index={index} />;
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
