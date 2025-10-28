import React from 'react'
import { Box, Typography } from '@mui/material'
import { SectionProps } from '../../../types'
import IndividualItemSection from '../core/IndividualItemSection'
import { FormField } from '../core/formUtils'
import { generateSectionId } from '../../../utils/idGenerator'
import MarkdownRenderer from '../../common/MarkdownRenderer'

interface Project {
  id: string
  name: string
  description: string
  technologies: string[]
  url?: string
}

const ProjectsSection: React.FC<SectionProps> = ({ data, onUpdate, onSave, isEditing, onEdit, onClose, onUnsavedChanges, registerIndividualItemEditing, unregisterIndividualItemEditing, requestIndividualItemCancel, title = 'Projects', onTitleSave, cvId }) => {
  const createNewProject = (): Project => ({
    id: generateSectionId('projects'),
    name: '',
    description: '',
    technologies: [],
    url: ''
  })

  const renderProjectForm = (project: Project, _index: number, updateProject: (field: keyof Project, value: any) => void, onSave?: () => void) => {
    const updateTechnologies = (techString: string) => {
      const technologies = techString.split(',').map(tech => tech.trim()).filter(tech => tech)
      updateProject('technologies', technologies)
    }

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <FormField
          config={{
            name: 'name',
            label: 'Project Name',
            placeholder: 'e.g., E-commerce Website',
            required: true
          }}
          value={project.name}
          onChange={(value) => updateProject('name', value)}
          onSave={onSave}
        />
        <FormField
          config={{
            name: 'description',
            label: 'Description',
            placeholder: 'Brief description of the project (minimum 10 characters)...',
            multiline: true,
            rows: 2,
            required: true,
            minLength: 10
          }}
          value={project.description}
          onChange={(value) => updateProject('description', value)}
          onSave={onSave}
        />
        <FormField
          config={{
            name: 'technologies',
            label: 'Technologies (comma-separated)',
            placeholder: 'e.g., React, Node.js, MongoDB'
          }}
          value={project.technologies.join(', ')}
          onChange={updateTechnologies}
          onSave={onSave}
        />
        <FormField
          config={{
            name: 'url',
            label: 'Project URL (Optional)',
            placeholder: 'https://github.com/username/project',
            type: 'url'
          }}
          value={project.url || ''}
          onChange={(value) => updateProject('url', value)}
          onSave={onSave}
        />
      </Box>
    )
  }

  const renderProjectDisplay = (project: Project, _index: number) => (
    <>
      <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#333', mb: 0.5 }}>
        {project.name}
      </Typography>
      <Box sx={{ mb: 1 }}>
        <MarkdownRenderer content={project.description} variant="body1" />
      </Box>
      {project.technologies.length > 0 && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
          {project.technologies.map((tech, techIndex) => (
            <Box
              key={techIndex}
              sx={{
                backgroundColor: '#e3f2fd',
                color: '#1976d2',
                px: 1,
                py: 0.5,
                borderRadius: 1,
                fontSize: '0.75rem'
              }}
            >
              {tech}
            </Box>
          ))}
        </Box>
      )}
      {project.url && (
        <Typography variant="body2" color="primary">
          🔗 <a href={project.url} target="_blank" rel="noopener noreferrer">
            View Project
          </a>
        </Typography>
      )}
    </>
  )

  return (
    <IndividualItemSection
      data={data as Project[]}
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
      emptyMessage="No projects added yet."
      createNewItem={createNewProject}
      requiredFields={['name', 'description']}
      fieldConstraints={{
        description: { minLength: 10 }
      }}
      renderItemForm={renderProjectForm}
      renderItemDisplay={renderProjectDisplay}
      autoSaveMessage="Project"
      sortOptions={[
        { field: 'name', label: 'Name' }
      ]}
      cvId={cvId}
      enhancementContentField="description"
    />
  )
}

// Memoize to prevent unnecessary re-renders of project items
export default React.memo(ProjectsSection, (prevProps, nextProps) => {
  return (
    prevProps.data === nextProps.data &&
    prevProps.isEditing === nextProps.isEditing
  );
});
