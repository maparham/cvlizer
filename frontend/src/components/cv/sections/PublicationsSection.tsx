import React from 'react'
import { Box, Typography } from '@mui/material'
import { SectionProps } from '../../../types'
import IndividualItemSection from '../core/IndividualItemSection'
import { FormField, DateFieldComponent } from '../core/formUtils'
import { generateSectionId } from '../../../utils/idGenerator'

interface Publication {
  id: string
  title: string
  authors: string
  journal: string
  date: string
  url?: string
}

const PublicationsSection: React.FC<SectionProps> = ({ data, onUpdate, onSave, isEditing, onEdit, onClose, onUnsavedChanges, registerIndividualItemEditing, unregisterIndividualItemEditing, requestIndividualItemCancel }) => {
  const createNewPublication = (): Publication => ({
    id: generateSectionId('publications'),
    title: '',
    authors: '',
    journal: '',
    date: '',
    url: ''
  })

  const renderPublicationForm = (publication: Publication, _index: number, updatePublication: (field: keyof Publication, value: any) => void, onSave?: () => void) => (
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

  const renderPublicationDisplay = (publication: Publication, _index: number) => (
    <>
      <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#333', mb: 0.5 }}>
        📄 {publication.title}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        {publication.authors} • {publication.journal} • {publication.date}
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
      title="Publications"
      emptyMessage="No publications added yet."
      createNewItem={createNewPublication}
      requiredFields={['title', 'authors', 'journal', 'date']}
      renderItemForm={renderPublicationForm}
      renderItemDisplay={renderPublicationDisplay}
      autoSaveMessage="Publication"
      sortOptions={[
        { field: 'date', label: 'Publication Date' }
      ]}
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
