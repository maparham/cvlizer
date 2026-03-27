import React from 'react'
import Box from '@mui/material/Box';import { SectionProps } from '../../../types'
import IndividualItemSection from '../core/IndividualItemSection'
import { FormField, DateFieldComponent } from '../core/formUtils'
import { ValidatedFormField, ValidatedDateField, ValidatedDisplay, useItemValidation, type ItemValidationState } from '../core/validatedFields'
import { generateSectionId } from '../../../utils/idGenerator'
import MarkdownRenderer from '../../common/MarkdownRenderer'
import { createTrackedFieldUpdater } from './hooks/createTrackedFieldUpdater'

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
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <ValidatedFormField
        section="certifications"
        field="name"
        index={index}
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
      <ValidatedFormField
        section="certifications"
        field="issuer"
        index={index}
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
        <ValidatedDateField
          section="certifications"
          field="date"
          index={index}
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
  );
};

// Separate component for certification display (no hooks - validation passed as props)
const CertificationDisplay: React.FC<{
  cert: Certification;
  index: number;
  validation: ItemValidationState;
}> = ({ cert, index: _index, validation }) => {
  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5, pr: 10 }}>
        <Box sx={{ flex: 1 }}>
          <ValidatedDisplay
            validation={validation.name}
            variant="subtitle1"
            normalColor="#333"
          >
            {cert.name}
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
            {cert.date}
            {cert.expiry_date && ` - ${cert.expiry_date}`}
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
          {cert.issuer}
        </ValidatedDisplay>
      </Box>
      {cert.description && (
        <Box>
          <MarkdownRenderer content={cert.description} variant="body1" />
        </Box>
      )}
    </>
  );
};

const CertificationsSection: React.FC<SectionProps & { sectionType?: string }> = ({ data, onUpdate, onSave, isEditing, onEdit, onClose, onUnsavedChanges, registerIndividualItemEditing, unregisterIndividualItemEditing, requestIndividualItemCancel, title = 'Certifications', onTitleSave, cvId, sectionType, sectionId, onHide, onDelete }) => {
  const createNewCertification = (): Certification => ({
    id: generateSectionId('certifications'),
    name: '',
    issuer: '',
    date: '',
    expiry_date: '',
    description: ''
  })

  const renderCertificationForm = (cert: Certification, index: number, updateCertification: (field: keyof Certification, value: any) => void, onSave?: () => void) => {
    const wrappedUpdateCertification = createTrackedFieldUpdater(cvId, `certifications:${cert.id}`, updateCertification, ['description']);
    return (
      <CertificationForm
        cert={cert}
        index={index}
        updateCertification={wrappedUpdateCertification}
        onSave={onSave}
      />
    );
  }

  const renderCertificationDisplay = (cert: Certification, index: number) => {
    // Get all validation states at once using useItemValidation hook
    const CertificationDisplayWrapper: React.FC<{ cert: Certification; index: number }> = ({ cert, index }) => {
      const validation = useItemValidation('certifications', index, ['name', 'issuer', 'date']);
      return <CertificationDisplay cert={cert} index={index} validation={validation} />;
    };

    return <CertificationDisplayWrapper cert={cert} index={index} />;
  }

  return (
    <IndividualItemSection
      sectionType={sectionType || 'certifications'}
      sectionId={sectionId}
      onHide={onHide}
      onDelete={onDelete}
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
      getItemTitle={(item) => item.name || ""}
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
