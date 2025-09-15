import React from 'react'
import { TextField, Typography } from '@mui/material'
import { SectionProps } from '../types'
import SimpleFormSection from '../core/SimpleFormSection'

const ProfessionalSummarySection: React.FC<SectionProps> = ({ data, onUpdate, onSave, isEditing, onEdit, onClose, onUnsavedChanges }) => {
  const renderForm = (editData: any, updateData: (field: string, value: any) => void) => (
    <TextField
      fullWidth
      multiline
      rows={4}
      variant="standard"
      value={editData.content || ''}
      onChange={(e) => updateData('content', e.target.value)}
      error={!editData.content?.trim()}
      helperText={!editData.content?.trim() ? "Professional summary is required" : ""}
      placeholder="Your professional summary goes here... *"
      sx={{ 
        '& .MuiInputBase-input': { 
          lineHeight: 1.6,
          textAlign: 'justify'
        }
      }}
    />
  )

  const renderDisplay = (data: any) => (
    <Typography variant="body1" sx={{ lineHeight: 1.6, textAlign: 'justify' }}>
      {data.content || 'Your professional summary goes here...'}
    </Typography>
  )

  return (
    <SimpleFormSection
      data={data}
      onUpdate={onUpdate}
      onSave={onSave}
      isEditing={isEditing}
      onEdit={onEdit}
      onClose={onClose}
      onUnsavedChanges={onUnsavedChanges}
      title="Professional Summary"
      sectionId="professional_summary"
      requiredFields={['content']}
      renderForm={renderForm}
      renderDisplay={renderDisplay}
      autoSaveMessage="Professional summary auto-saved"
    />
  )
}

export default ProfessionalSummarySection
