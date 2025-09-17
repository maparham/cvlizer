import React from 'react'
import { Box, Typography } from '@mui/material'
import { SectionProps } from '../types'
import IndividualItemSection from '../core/IndividualItemSection'
import { FormField, DateFieldComponent } from '../core/formUtils'

interface Award {
  name: string
  issuer: string
  date: string
  description: string
}

const AwardsSection: React.FC<SectionProps> = ({ data, onUpdate, onSave, isEditing, onEdit, onClose, onUnsavedChanges, registerIndividualItemEditing, unregisterIndividualItemEditing, requestIndividualItemCancel }) => {
  const createNewAward = (): Award => ({
    name: '',
    issuer: '',
    date: '',
    description: ''
  })

  const renderAwardForm = (award: Award, _index: number, updateAward: (field: keyof Award, value: any) => void) => (
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
      />
      <DateFieldComponent
        config={{
          name: 'date',
          label: 'Date Received',
          required: true
        }}
        value={award.date}
        onChange={(value) => updateAward('date', value)}
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
      />
    </Box>
  )

  const renderAwardDisplay = (award: Award, _index: number) => (
    <>
      <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#333', mb: 0.5 }}>
        🏆 {award.name}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        {award.issuer} • {award.date}
      </Typography>
      {award.description && (
        <Typography variant="body1">
          {award.description}
        </Typography>
      )}
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
      title="Awards & Recognition"
      emptyMessage="No awards added yet."
      createNewItem={createNewAward}
      requiredFields={['name', 'issuer', 'date']}
      renderItemForm={renderAwardForm}
      renderItemDisplay={renderAwardDisplay}
      autoSaveMessage="Award"
      sortOptions={[
        { field: 'date', label: 'Date Received' }
      ]}
    />
  )
}

export default AwardsSection
