import React from 'react'
import { Box, Typography } from '@mui/material'
import { SectionProps } from '../../../types'
import IndividualItemSection from '../core/IndividualItemSection'
import { FormField, DateFieldComponent, ValidatedFieldDisplay } from '../core/formUtils'
import { generateSectionId } from '../../../utils/idGenerator'
import MarkdownRenderer from '../../common/MarkdownRenderer'
import { useFieldValidation } from '../../../hooks/useFieldValidation'

interface Certification {
  id: string
  name: string
  issuer: string
  date: string
  expiry_date?: string
  description?: string
}

// Separate component for certification form to allow using hooks
const CertificationForm: React.FC<{
  cert: Certification;
  index: number;
  updateCertification: (field: keyof Certification, value: any) => void;
  onSave?: () => void;
}> = ({ cert, index, updateCertification, onSave }) => {
  // Get validation errors for this certification item
  const nameValidation = useFieldValidation('certifications', index, 'name');
  const issuerValidation = useFieldValidation('certifications', index, 'issuer');
  const dateValidation = useFieldValidation('certifications', index, 'date');

  return (
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
        error={nameValidation.hasError}
        helperText={nameValidation.errorMessage}
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
        error={issuerValidation.hasError}
        helperText={issuerValidation.errorMessage}
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
          error={dateValidation.hasError}
          helperText={dateValidation.errorMessage}
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
  );
};

// Separate component for certification display to allow using hooks
const CertificationDisplay: React.FC<{
  cert: Certification;
  index: number;
}> = ({ cert, index }) => {
  // Get validation errors for this certification item
  const nameValidation = useFieldValidation('certifications', index, 'name');
  const issuerValidation = useFieldValidation('certifications', index, 'issuer');
  const dateValidation = useFieldValidation('certifications', index, 'date');

  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5, pr: 10 }}>
        <Box sx={{ flex: 1 }}>
          <ValidatedFieldDisplay
            validation={nameValidation}
            variant="subtitle1"
            normalColor="#333"
          >
            {cert.name}
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
            {cert.date}
            {cert.expiry_date && ` - ${cert.expiry_date}`}
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
          {cert.issuer}
        </ValidatedFieldDisplay>
      </Box>
      {cert.description && (
        <Box>
          <MarkdownRenderer content={cert.description} variant="body1" />
        </Box>
      )}
    </>
  );
};

const CertificationsSection: React.FC<SectionProps> = ({ data, onUpdate, onSave, isEditing, onEdit, onClose, onUnsavedChanges, registerIndividualItemEditing, unregisterIndividualItemEditing, requestIndividualItemCancel, title = 'Certifications', onTitleSave, cvId }) => {
  const createNewCertification = (): Certification => ({
    id: generateSectionId('certifications'),
    name: '',
    issuer: '',
    date: '',
    expiry_date: '',
    description: ''
  })

  const renderCertificationForm = (cert: Certification, index: number, updateCertification: (field: keyof Certification, value: any) => void, onSave?: () => void) => {
    return (
      <CertificationForm
        cert={cert}
        index={index}
        updateCertification={updateCertification}
        onSave={onSave}
      />
    );
  }

  const renderCertificationDisplay = (cert: Certification, index: number) => {
    return (
      <CertificationDisplay
        cert={cert}
        index={index}
      />
    );
  }

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
