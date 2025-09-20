import React from 'react'
import { Box, Typography } from '@mui/material'
import { SectionProps } from '../types'
import IndividualItemSection from '../core/IndividualItemSection'
import { FormField, DateFieldComponent } from '../core/formUtils'
import { generateSectionId } from '../../../utils/idGenerator'

interface Certification {
  id: string
  name: string
  issuer: string
  date: string
  expiry_date?: string
  description?: string
}

const CertificationsSection: React.FC<SectionProps> = ({ data, onUpdate, onSave, isEditing, onEdit, onClose, onUnsavedChanges, registerIndividualItemEditing, unregisterIndividualItemEditing, requestIndividualItemCancel }) => {
  const createNewCertification = (): Certification => ({
    id: generateSectionId('certifications'),
    name: '',
    issuer: '',
    date: '',
    expiry_date: '',
    description: ''
  })

  const renderCertificationForm = (cert: Certification, _index: number, updateCertification: (field: keyof Certification, value: any) => void) => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <FormField
        config={{
          name: 'name',
          label: 'Certification Name',
          placeholder: 'e.g., AWS Certified Solutions Architect',
          required: true
        }}
        value={cert.name}
        onChange={(value) => updateCertification('name', value)}
      />
      <FormField
        config={{
          name: 'issuer',
          label: 'Issuing Organization',
          placeholder: 'e.g., Amazon Web Services',
          required: true
        }}
        value={cert.issuer}
        onChange={(value) => updateCertification('issuer', value)}
      />
      <Box sx={{ display: 'flex', gap: 2 }}>
        <DateFieldComponent
          config={{
            name: 'date',
            label: 'Issue Date',
            required: true
          }}
          value={cert.date}
          onChange={(value) => updateCertification('date', value)}
          sx={{ flex: 1 }}
        />
        <DateFieldComponent
          config={{
            name: 'expiry_date',
            label: 'Expiry Date (Optional)'
          }}
          value={cert.expiry_date || ''}
          onChange={(value) => updateCertification('expiry_date', value)}
          sx={{ flex: 1 }}
        />
      </Box>
      <FormField
        config={{
          name: 'description',
          label: 'Description',
          placeholder: 'Describe what this certification covers or your experience with it...',
          multiline: true,
          rows: 2
        }}
        value={cert.description || ''}
        onChange={(value) => updateCertification('description', value)}
      />
    </Box>
  )

  const renderCertificationDisplay = (cert: Certification, _index: number) => (
    <>
      <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#333', mb: 0.5 }}>
        {cert.name}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        {cert.issuer} • {cert.date}
        {cert.expiry_date && ` • Expires: ${cert.expiry_date}`}
      </Typography>
      {cert.description && (
        <Typography variant="body1" sx={{ lineHeight: 1.6 }}>
          {cert.description}
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
      title="Certifications"
      emptyMessage="No certifications added yet."
      createNewItem={createNewCertification}
      requiredFields={['name', 'issuer', 'date']}
      renderItemForm={renderCertificationForm}
      renderItemDisplay={renderCertificationDisplay}
      autoSaveMessage="Certification"
      sortOptions={[
        { field: 'date', label: 'Issue Date' },
        { field: 'expiry_date', label: 'Expiry Date' }
      ]}
    />
  )
}

export default CertificationsSection
