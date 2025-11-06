import React from 'react'
import { Box, Typography } from '@mui/material'
import { SectionProps } from '../../../types'
import IndividualItemSection from '../core/IndividualItemSection'
import { FormField } from '../core/formUtils'
import { ValidatedFormField, ValidatedDisplay, useItemValidation } from '../core/validatedFields'
import { generateSectionId } from '../../../utils/idGenerator'
import MarkdownRenderer from '../../common/MarkdownRenderer'

interface Project {
  id: string
  name: string
  description: string
  technologies: string[]
  url?: string
}

// Separate component for project form to allow using hooks
const ProjectForm: React.FC<{
  project: Project;
  index: number;
  updateProject: (field: keyof Project, value: any) => void;
  onSave?: () => void;
}> = ({ project, index, updateProject, onSave }) => {
  const updateTechnologies = (techString: string) => {
    const technologies = techString.split(',').map(tech => tech.trim()).filter(tech => tech)
    updateProject('technologies', technologies)
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <ValidatedFormField
        section="projects"
        field="name"
        index={index}
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
      <ValidatedFormField
        section="projects"
        field="description"
        index={index}
        config={{
          name: 'description',
          label: 'Description',
          placeholder: 'Brief description of the project (minimum 10 characters)...',
          multiline: true,
          rows: 2,
          required: true,
          minLength: 10,
          useMarkdownEditor: true
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
  );
};

// Separate component for project display (no hooks - validation passed as props)
const ProjectDisplay: React.FC<{
  project: Project;
  index: number;
  validation: {
    name: { hasError: boolean; errorMessage?: string };
    description: { hasError: boolean; errorMessage?: string };
  };
}> = ({ project, index: _index, validation }) => {
  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5, pr: 10 }}>
        <Box sx={{ flex: 1 }}>
          <ValidatedDisplay
            validation={validation.name}
            variant="subtitle1"
            normalColor="#333"
          >
            {project.name}
          </ValidatedDisplay>
        </Box>
      </Box>
      <Box sx={{ mb: 1 }}>
        <ValidatedDisplay
          validation={validation.description}
          variant="body1"
          normalColor="#333"
        >
          <MarkdownRenderer content={project.description} variant="body1" />
        </ValidatedDisplay>
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
  );
};

const ProjectsSection: React.FC<SectionProps> = ({ data, onUpdate, onSave, isEditing, onEdit, onClose, onUnsavedChanges, registerIndividualItemEditing, unregisterIndividualItemEditing, requestIndividualItemCancel, title = 'Projects', onTitleSave, cvId }) => {
  const createNewProject = (): Project => ({
    id: generateSectionId('projects'),
    name: '',
    description: '',
    technologies: [],
    url: ''
  })

  const renderProjectForm = (project: Project, index: number, updateProject: (field: keyof Project, value: any) => void, onSave?: () => void) => {
    return (
      <ProjectForm
        project={project}
        index={index}
        updateProject={updateProject}
        onSave={onSave}
      />
    );
  }

  const renderProjectDisplay = (project: Project, index: number) => {
    // Get all validation states at once using useItemValidation hook
    const ProjectDisplayWrapper: React.FC<{ project: Project; index: number }> = ({ project, index }) => {
      const validation = useItemValidation('projects', index, ['name', 'description']);
      return <ProjectDisplay project={project} index={index} validation={validation} />;
    };

    return <ProjectDisplayWrapper project={project} index={index} />;
  }

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
