import React from 'react'
import { Box, Typography } from '@mui/material'
import { SectionProps } from '../../../types'
import IndividualItemSection from '../core/IndividualItemSection'
import { FormField, DateFieldComponent } from '../core/formUtils'
import { generateSectionId } from '../../../utils/idGenerator'
import { useFieldValidation } from '../../../hooks/useFieldValidation'

interface Publication {
  id: string
  title: string
  authors: string
  journal: string
  date: string
  url?: string
}

// Separate component for publication form to allow using hooks
const PublicationForm: React.FC<{
  publication: Publication
  index: number
  updatePublication: (field: keyof Publication, value: any) => void
  onSave?: () => void
}> = ({ publication, index, updatePublication, onSave }) => {
  // Get validation errors for this publication item
  const titleValidation = useFieldValidation('publications', index, 'title')
  const authorsValidation = useFieldValidation('publications', index, 'authors')
  const journalValidation = useFieldValidation('publications', index, 'journal')
  const dateValidation = useFieldValidation('publications', index, 'date')

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <FormField
        config={{
          name: 'title',
          label: 'Publication Title',
          placeholder: 'e.g., Machine Learning Applications in Healthcare',
          required: true
        }}
        value={publication.title}
        onChange={(value) => updatePublication('title', value)}
        onSave={onSave}
        error={titleValidation.hasError}
        helperText={titleValidation.errorMessage}
      />
      <FormField
        config={{
          name: 'authors',
          label: 'Authors',
          placeholder: 'e.g., John Doe, Jane Smith',
          required: true
        }}
        value={publication.authors}
        onChange={(value) => updatePublication('authors', value)}
        onSave={onSave}
        error={authorsValidation.hasError}
        helperText={authorsValidation.errorMessage}
      />
      <FormField
        config={{
          name: 'journal',
          label: 'Journal/Conference',
          placeholder: 'e.g., Nature Medicine, IEEE Conference',
          required: true
        }}
        value={publication.journal}
        onChange={(value) => updatePublication('journal', value)}
        onSave={onSave}
        error={journalValidation.hasError}
        helperText={journalValidation.errorMessage}
      />
      <DateFieldComponent
        config={{
          name: 'date',
          label: 'Publication Date',
          required: true
        }}
        value={publication.date}
        onChange={(value) => updatePublication('date', value)}
        onSave={onSave}
        error={dateValidation.hasError}
        helperText={dateValidation.errorMessage}
      />
      <FormField
        config={{
          name: 'url',
          label: 'URL (Optional)',
          placeholder: 'https://doi.org/10.1000/xyz123',
          type: 'url'
        }}
        value={publication.url || ''}
        onChange={(value) => updatePublication('url', value)}
        onSave={onSave}
      />
    </Box>
  )
}

const PublicationsSection: React.FC<SectionProps & { sectionType?: string }> = ({ data, onUpdate, onSave, isEditing, onEdit, onClose, onUnsavedChanges, registerIndividualItemEditing, unregisterIndividualItemEditing, requestIndividualItemCancel, title = 'Publications', onTitleSave, cvId, sectionType }) => {
  const createNewPublication = (): Publication => ({
    id: generateSectionId('publications'),
    title: '',
    authors: '',
    journal: '',
    date: '',
    url: ''
  })

  const renderPublicationForm = (publication: Publication, index: number, updatePublication: (field: keyof Publication, value: any) => void, onSave?: () => void) => {
    return (
      <PublicationForm
        publication={publication}
        index={index}
        updatePublication={updatePublication}
        onSave={onSave}
      />
    )
  }

  const renderPublicationDisplay = (publication: Publication, _index: number) => (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5, pr: 10 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#333' }}>
          📄 {publication.title}
        </Typography>
        <Typography variant="body2" sx={{ color: '#666', flexShrink: 0, ml: 2 }}>
          {publication.date}
        </Typography>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        {publication.authors} • {publication.journal}
      </Typography>
      {publication.url && (
        <Typography variant="body2" color="primary">
          🔗 <a href={publication.url} target="_blank" rel="noopener noreferrer">
            View Publication
          </a>
        </Typography>
      )}
    </>
  )

  return (
    <IndividualItemSection
      sectionType={sectionType || 'publications'}
      data={data as Publication[]}
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
      emptyMessage="No publications added yet."
      createNewItem={createNewPublication}
      requiredFields={['title', 'authors', 'journal', 'date']}
      renderItemForm={renderPublicationForm}
      renderItemDisplay={renderPublicationDisplay}
      autoSaveMessage="Publication"
      sortOptions={[
        { field: 'date', label: 'Publication Date' }
      ]}
      cvId={cvId}
    />
  )
}

// Memoize to prevent unnecessary re-renders of publication items
export default React.memo(PublicationsSection, (prevProps, nextProps) => {
  return (
    prevProps.data === nextProps.data &&
    prevProps.isEditing === nextProps.isEditing
  );
});
