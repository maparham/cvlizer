import React from 'react'
import { Box, Typography } from '@mui/material'
import { SectionProps } from '../../../types'
import IndividualItemSection from '../core/IndividualItemSection'
import { FormField } from '../core/formUtils'
import { generateSectionId } from '../../../utils/idGenerator'
import { ValidatedFormField, ValidatedDateField, ValidatedDisplay, useItemValidation } from '../core/validatedFields'

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
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <ValidatedFormField
        section="publications"
        field="title"
        index={index}
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
      <ValidatedFormField
        section="publications"
        field="authors"
        index={index}
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
      <ValidatedFormField
        section="publications"
        field="journal"
        index={index}
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
      <ValidatedDateField
        section="publications"
        field="date"
        index={index}
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
}

// Pure display component (no hooks - validation passed as props)
const PublicationDisplay: React.FC<{
  publication: Publication;
  index: number;
  validation: {
    title: { hasError: boolean; errorMessage?: string };
    authors: { hasError: boolean; errorMessage?: string };
    journal: { hasError: boolean; errorMessage?: string };
    date: { hasError: boolean; errorMessage?: string };
  };
}> = ({ publication, index: _index, validation }) => {
  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5, pr: 10 }}>
        <Box sx={{ flex: 1 }}>
          <ValidatedDisplay
            validation={validation.title}
            variant="subtitle1"
            normalColor="#333"
          >
            📄 {publication.title}
          </ValidatedDisplay>
        </Box>
        <Box sx={{ flexShrink: 0, ml: 2 }}>
          <ValidatedDisplay
            validation={validation.date}
            variant="body2"
            normalColor="#666"
          >
            {publication.date}
          </ValidatedDisplay>
        </Box>
      </Box>
      <Box sx={{ mb: 1 }}>
        <ValidatedDisplay
          validation={validation.authors}
          variant="body2"
          normalColor="#666"
        >
          {publication.authors}
        </ValidatedDisplay>
        {!validation.authors.hasError && !validation.journal.hasError && ' • '}
        <ValidatedDisplay
          validation={validation.journal}
          variant="body2"
          normalColor="#666"
        >
          {publication.journal}
        </ValidatedDisplay>
      </Box>
      {publication.url && (
        <Typography variant="body2" color="primary">
          🔗 <a href={publication.url} target="_blank" rel="noopener noreferrer">
            View Publication
          </a>
        </Typography>
      )}
    </>
  );
};

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

  const renderPublicationDisplay = (publication: Publication, index: number) => {
    // Wrapper component to use hooks
    const PublicationDisplayWrapper: React.FC<{ publication: Publication; index: number }> = ({ publication, index }) => {
      const validation = useItemValidation('publications', index, ['title', 'authors', 'journal', 'date']);
      return <PublicationDisplay publication={publication} index={index} validation={validation} />;
    };

    return <PublicationDisplayWrapper publication={publication} index={index} />;
  }

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
      getItemTitle={(item) => item.title || ""}
    />
  )
}

export default PublicationsSection
