import React from 'react'
import { Box, Typography } from '@mui/material'
import { SectionProps } from '../../../types'
import IndividualItemSection from '../core/IndividualItemSection'
import { FormField, DateFieldComponent } from '../core/formUtils'
import { generateSectionId } from '../../../utils/idGenerator'
import MarkdownRenderer from '../../common/MarkdownRenderer'

interface Award {
  id: string
  name: string
  issuer: string
  date: string
  description: string
}

const AwardsSection: React.FC<SectionProps> = ({ data, onUpdate, onSave, isEditing, onEdit, onClose, onUnsavedChanges, registerIndividualItemEditing, unregisterIndividualItemEditing, requestIndividualItemCancel, title = 'Awards & Recognition', onTitleSave, cvId }) => {
  const createNewAward = (): Award => ({
    id: generateSectionId('awards'),
    name: '',
    issuer: '',
    date: '',
    description: ''
  })

  const renderAwardForm = (award: Award, _index: number, updateAward: (field: keyof Award, value: any) => void, onSave?: () => void) => (
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
  )

  const renderAwardDisplay = (award: Award, _index: number) => (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5, pr: 10 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#333' }}>
          🏆 {award.name}
        </Typography>
        <Typography variant="body2" sx={{ color: '#666', flexShrink: 0, ml: 2 }}>
          {award.date}
        </Typography>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        {award.issuer}
      </Typography>
      {award.description && (
        <Box>
          <MarkdownRenderer content={award.description} variant="body1" />
        </Box>
      )}
    </>
  )

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
