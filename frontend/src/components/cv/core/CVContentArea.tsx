import React from 'react'
import { Box, Paper } from '@mui/material'
import { CVSection } from '../types'
import {
  PersonalInfoSection,
  ProfessionalSummarySection,
  WorkExperienceSection,
  EducationSection,
  SkillsSection,
  CertificationsSection,
  ProjectsSection,
  AwardsSection,
  PublicationsSection,
  VolunteerExperienceSection
} from '../sections'
import { 
  useCVEditorControls,
  useCVEditorState,
  useCVEditor
} from '../../../contexts/CVEditorContext'

const CVContentArea: React.FC = () => {
  // Get data from context instead of props
  const { cvData, onUpdateCV, onSave } = useCVEditor()
  const { sections } = useCVEditorControls()
  const { editing, changes } = useCVEditorState()
  
  // Extract editing-related functions for easier use
  const {
    section: editingSection,
    individualItem: editingIndividualItem,
    onSectionEdit: handleSectionEdit,
    onSectionClose: handleSectionClose,
    onRequestSectionCancel: requestSectionCancel,
    onRegisterIndividualItem: registerIndividualItemEditing,
    onUnregisterIndividualItem: unregisterIndividualItemEditing,
    onRequestIndividualCancel: requestIndividualItemCancel,
  } = editing
  
  const { onUnsavedChanges } = changes

  // Provide defaults to prevent undefined errors
  const safeSections = sections.items || []
  const safeEditingIndividualItem = editingIndividualItem || null

  const renderSection = (section: CVSection) => {
    if (!section.visible) return null

    const isEditing = editingSection === section.type
    
    // Check if another individual item is being edited
    const isAnotherItemBeingEdited = safeEditingIndividualItem !== null

    switch (section.type) {
      case 'personal_info':
        return (
          <PersonalInfoSection 
            data={cvData?.personal_info} 
            onUpdate={(data) => onUpdateCV({ ...cvData, personal_info: data })} 
            onSave={(data) => onSave({ ...cvData, personal_info: data }, 'Personal information saved')} 
            isEditing={isEditing}
            onEdit={() => handleSectionEdit('personal_info')}
            onClose={requestSectionCancel || handleSectionClose}
            onUnsavedChanges={onUnsavedChanges}
          />
        )
      case 'professional_summary':
        return (
          <ProfessionalSummarySection 
            data={cvData?.professional_summary} 
            onUpdate={(data) => onUpdateCV({ ...cvData, professional_summary: data })} 
            onSave={(data) => onSave({ ...cvData, professional_summary: data }, 'Professional summary saved')} 
            isEditing={isEditing}
            onEdit={() => handleSectionEdit('professional_summary')}
            onClose={requestSectionCancel || handleSectionClose}
            onUnsavedChanges={onUnsavedChanges}
          />
        )
      case 'work_experience':
        return (
          <WorkExperienceSection 
            data={cvData?.work_experience} 
            onUpdate={(data) => onUpdateCV({ ...cvData, work_experience: data })} 
            onSave={(data) => onSave({ ...cvData, work_experience: data }, 'Work experience saved')} 
            isEditing={isEditing}
            onEdit={() => handleSectionEdit('work_experience')}
            onClose={requestSectionCancel || handleSectionClose}
            onUnsavedChanges={onUnsavedChanges}
            registerIndividualItemEditing={registerIndividualItemEditing}
            unregisterIndividualItemEditing={unregisterIndividualItemEditing}
            requestIndividualItemCancel={requestIndividualItemCancel}
            isAnotherItemBeingEdited={isAnotherItemBeingEdited}
          />
        )
      case 'education':
        return (
          <EducationSection 
            data={cvData?.education} 
            onUpdate={(data) => onUpdateCV({ ...cvData, education: data })} 
            onSave={(data) => onSave({ ...cvData, education: data }, 'Education saved')} 
            isEditing={isEditing}
            onEdit={() => handleSectionEdit('education')}
            onClose={requestSectionCancel || handleSectionClose}
            onUnsavedChanges={onUnsavedChanges}
            registerIndividualItemEditing={registerIndividualItemEditing}
            unregisterIndividualItemEditing={unregisterIndividualItemEditing}
            requestIndividualItemCancel={requestIndividualItemCancel}
            isAnotherItemBeingEdited={isAnotherItemBeingEdited}
          />
        )
      case 'skills':
        return (
          <SkillsSection 
            data={cvData?.skills} 
            onUpdate={(data) => onUpdateCV({ ...cvData, skills: data })} 
            onSave={(data, message) => onSave({ ...cvData, skills: data }, message)} 
            isEditing={isEditing}
            onEdit={() => handleSectionEdit('skills')}
            onClose={requestSectionCancel || handleSectionClose}
            onUnsavedChanges={onUnsavedChanges}
          />
        )
      case 'certifications':
        return (
          <CertificationsSection 
            data={cvData?.certifications || []} 
            onUpdate={(data) => onUpdateCV({ ...cvData, certifications: data })} 
            onSave={(data) => onSave({ ...cvData, certifications: data }, 'Certifications saved')} 
            isEditing={isEditing}
            onEdit={() => handleSectionEdit('certifications')}
            onClose={requestSectionCancel || handleSectionClose}
            onUnsavedChanges={onUnsavedChanges}
            registerIndividualItemEditing={registerIndividualItemEditing}
            unregisterIndividualItemEditing={unregisterIndividualItemEditing}
            requestIndividualItemCancel={requestIndividualItemCancel}
            isAnotherItemBeingEdited={isAnotherItemBeingEdited}
          />
        )
      case 'projects':
        return (
          <ProjectsSection 
            data={cvData?.projects || []} 
            onUpdate={(data) => onUpdateCV({ ...cvData, projects: data })} 
            onSave={(data) => onSave({ ...cvData, projects: data }, 'Projects saved')} 
            isEditing={isEditing}
            onEdit={() => handleSectionEdit('projects')}
            onClose={requestSectionCancel || handleSectionClose}
            onUnsavedChanges={onUnsavedChanges}
            registerIndividualItemEditing={registerIndividualItemEditing}
            unregisterIndividualItemEditing={unregisterIndividualItemEditing}
            requestIndividualItemCancel={requestIndividualItemCancel}
            isAnotherItemBeingEdited={isAnotherItemBeingEdited}
          />
        )
      case 'awards':
        return (
          <AwardsSection 
            data={cvData?.awards || []} 
            onUpdate={(data) => onUpdateCV({ ...cvData, awards: data })} 
            onSave={(data) => onSave({ ...cvData, awards: data }, 'Awards saved')} 
            isEditing={isEditing}
            onEdit={() => handleSectionEdit('awards')}
            onClose={requestSectionCancel || handleSectionClose}
            onUnsavedChanges={onUnsavedChanges}
            registerIndividualItemEditing={registerIndividualItemEditing}
            unregisterIndividualItemEditing={unregisterIndividualItemEditing}
            requestIndividualItemCancel={requestIndividualItemCancel}
            isAnotherItemBeingEdited={isAnotherItemBeingEdited}
          />
        )
      case 'publications':
        return (
          <PublicationsSection 
            data={cvData?.publications || []} 
            onUpdate={(data) => onUpdateCV({ ...cvData, publications: data })} 
            onSave={(data) => onSave({ ...cvData, publications: data }, 'Publications saved')} 
            isEditing={isEditing}
            onEdit={() => handleSectionEdit('publications')}
            onClose={requestSectionCancel || handleSectionClose}
            onUnsavedChanges={onUnsavedChanges}
            registerIndividualItemEditing={registerIndividualItemEditing}
            unregisterIndividualItemEditing={unregisterIndividualItemEditing}
            requestIndividualItemCancel={requestIndividualItemCancel}
            isAnotherItemBeingEdited={isAnotherItemBeingEdited}
          />
        )
      case 'volunteer_experience':
        return (
          <VolunteerExperienceSection 
            data={cvData?.volunteer_experience || []} 
            onUpdate={(data) => onUpdateCV({ ...cvData, volunteer_experience: data })} 
            onSave={(data) => onSave({ ...cvData, volunteer_experience: data }, 'Volunteer experience saved')} 
            isEditing={isEditing}
            onEdit={() => handleSectionEdit('volunteer_experience')}
            onClose={requestSectionCancel || handleSectionClose}
            onUnsavedChanges={onUnsavedChanges}
            registerIndividualItemEditing={registerIndividualItemEditing}
            unregisterIndividualItemEditing={unregisterIndividualItemEditing}
            requestIndividualItemCancel={requestIndividualItemCancel}
            isAnotherItemBeingEdited={isAnotherItemBeingEdited}
          />
        )
      default:
        return null
    }
  }

  return (
    <Box sx={{ flex: 1, overflow: 'auto', bgcolor: '#f5f5f5', p: 2 }}>
      <Paper
        sx={{
          width: '210mm',
          minHeight: '297mm',
          margin: '0 auto',
          bgcolor: 'white',
          boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
          p: 4,
          position: 'relative'
        }}
      >
        {safeSections
          .sort((a, b) => a.order - b.order)
          .filter(section => section.visible)
          .map((section) => (
            <Box key={section.id} sx={{ mb: 3 }}>
              {renderSection(section)}
            </Box>
          ))}
      </Paper>
    </Box>
  )
}

export default CVContentArea
