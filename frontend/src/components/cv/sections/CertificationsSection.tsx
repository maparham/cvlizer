import React from 'react'
import { Box, Typography } from '@mui/material'
import { SectionProps } from '../../../types'
import IndividualItemSection from '../core/IndividualItemSection'
import { FormField, DateFieldComponent } from '../core/formUtils'
import { generateSectionId } from '../../../utils/idGenerator'
import MarkdownRenderer from '../../common/MarkdownRenderer'

interface Certification {
  id: string
  name: string
  issuer: string
  date: string
  expiry_date?: string
  description?: string
}

const CertificationsSection: React.FC<SectionProps> = ({ data, onUpdate, onSave, isEditing, onEdit, onClose, onUnsavedChanges, registerIndividualItemEditing, unregisterIndividualItemEditing, requestIndividualItemCancel, title = 'Certifications', onTitleSave, cvId }) => {
  const createNewCertification = (): Certification => ({
    id: generateSectionId('certifications'),
    name: '',
    issuer: '',
    date: '',
    expiry_date: '',
    description: ''
  })

  const renderCertificationForm = (cert: Certification, _index: number, updateCertification: (field: keyof Certification, value: any) => void, onSave?: () => void) => (
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
        onSave={onSave}
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
        onSave={onSave}
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
          onSave={onSave}
          sx={{ flex: 1 }}
        />
        <DateFieldComponent
          config={{
            name: 'expiry_date',
            label: 'Expiry Date (Optional)'
          }}
          value={cert.expiry_date || ''}
          onChange={(value) => updateCertification('expiry_date', value)}
          onSave={onSave}
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
        onSave={onSave}
      />
    </Box>
  )

  const renderCertificationDisplay = (cert: Certification, _index: number) => (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5, pr: 10 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#333' }}>
          {cert.name}
        </Typography>
        <Typography variant="body2" sx={{ color: '#666', flexShrink: 0, ml: 2 }}>
          {cert.date}
          {cert.expiry_date && ` - ${cert.expiry_date}`}
        </Typography>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        {cert.issuer}
      </Typography>
      {cert.description && (
        <Box>
          <MarkdownRenderer content={cert.description} variant="body1" />
        </Box>
      )}
    </>
  )

  return (
    <IndividualItemSection
      data={data as Certification[]}
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
      cvId={cvId}
    />
  )
}

// Memoize to prevent unnecessary re-renders of certification items
export default React.memo(CertificationsSection, (prevProps, nextProps) => {
  return (
    prevProps.data === nextProps.data &&
    prevProps.isEditing === nextProps.isEditing
  );
});
