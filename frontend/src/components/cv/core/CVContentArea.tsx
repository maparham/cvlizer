/**
 * CV Content Area Component
 * 
 * This module renders the main PDF-style CV content area including:
 * - PDF-like paper layout with proper dimensions (A4 format)
 * - Dynamic section rendering based on visibility and order
 * - Integration with all CV section components (personal info, work experience, etc.)
 * - Real-time editing state management and individual item editing
 * - Context integration for CV data updates and saving
 */
import React from 'react'
import { Box, Paper } from '@mui/material'
import { CVSection } from '../types'
import { 
  PersonalInfo, 
  ProfessionalSummary, 
  WorkExperience, 
  Education, 
  Skills, 
  Certification, 
  Project, 
  Award, 
  Publication, 
  VolunteerExperience 
} from '../../../types/cv'
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
    
    // Check if another individual item is being edited in a DIFFERENT section
    const isAnotherItemBeingEdited = safeEditingIndividualItem !== null && safeEditingIndividualItem.sectionId !== section.type

    switch (section.type) {
      case 'personal_info':
        return (
          <PersonalInfoSection 
            data={cvData?.personal_info} 
            onUpdate={(data) => onUpdateCV({ ...cvData, personal_info: data as PersonalInfo })}
            onSave={(data) => onSave({ ...cvData, personal_info: data as PersonalInfo }, 'Personal information saved')}
            isEditing={isEditing}
            onEdit={() => handleSectionEdit('personal_info')}
            onClose={() => handleSectionClose()}
            onUnsavedChanges={onUnsavedChanges}
          />
        )
      case 'professional_summary':
        return (
          <ProfessionalSummarySection 
            data={cvData?.professional_summary} 
            onUpdate={(data) => onUpdateCV({ ...cvData, professional_summary: data as ProfessionalSummary })}
            onSave={(data) => onSave({ ...cvData, professional_summary: data as ProfessionalSummary }, 'Professional summary saved')}
            isEditing={isEditing}
            onEdit={() => handleSectionEdit('professional_summary')}
            onClose={() => handleSectionClose()}
            onUnsavedChanges={onUnsavedChanges}
          />
        )
      case 'work_experience':
        return (
          <WorkExperienceSection 
            data={cvData?.work_experience} 
            onUpdate={(data) => onUpdateCV({ ...cvData, work_experience: data as WorkExperience[] })}
            onSave={(data) => onSave({ ...cvData, work_experience: data as WorkExperience[] }, 'Work experience saved')}
            isEditing={isEditing}
            onEdit={() => handleSectionEdit('work_experience')}
            onClose={() => handleSectionClose()}
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
            onUpdate={(data) => onUpdateCV({ ...cvData, education: data as Education[] })}
            onSave={(data) => onSave({ ...cvData, education: data as Education[] }, 'Education saved')}
            isEditing={isEditing}
            onEdit={() => handleSectionEdit('education')}
            onClose={() => handleSectionClose()}
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
            onUpdate={(data) => onUpdateCV({ ...cvData, skills: data as Skills })}
            onSave={(data, message) => onSave({ ...cvData, skills: data as Skills }, message)}
            isEditing={isEditing}
            onEdit={() => handleSectionEdit('skills')}
            onClose={() => handleSectionClose()}
            onUnsavedChanges={onUnsavedChanges}
          />
        )
      case 'certifications':
        return (
          <CertificationsSection 
            data={cvData?.certifications || []} 
            onUpdate={(data) => onUpdateCV({ ...cvData, certifications: data as Certification[] })}
            onSave={(data) => onSave({ ...cvData, certifications: data as Certification[] }, 'Certifications saved')}
            isEditing={isEditing}
            onEdit={() => handleSectionEdit('certifications')}
            onClose={() => handleSectionClose()}
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
            onUpdate={(data) => onUpdateCV({ ...cvData, projects: data as Project[] })}
            onSave={(data) => onSave({ ...cvData, projects: data as Project[] }, 'Projects saved')}
            isEditing={isEditing}
            onEdit={() => handleSectionEdit('projects')}
            onClose={() => handleSectionClose()}
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
            onUpdate={(data) => onUpdateCV({ ...cvData, awards: data as Award[] })}
            onSave={(data) => onSave({ ...cvData, awards: data as Award[] }, 'Awards saved')}
            isEditing={isEditing}
            onEdit={() => handleSectionEdit('awards')}
            onClose={() => handleSectionClose()}
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
            onUpdate={(data) => onUpdateCV({ ...cvData, publications: data as Publication[] })}
            onSave={(data) => onSave({ ...cvData, publications: data as Publication[] }, 'Publications saved')}
            isEditing={isEditing}
            onEdit={() => handleSectionEdit('publications')}
            onClose={() => handleSectionClose()}
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
            onUpdate={(data) => onUpdateCV({ ...cvData, volunteer_experience: data as VolunteerExperience[] })}
            onSave={(data) => onSave({ ...cvData, volunteer_experience: data as VolunteerExperience[] }, 'Volunteer experience saved')}
            isEditing={isEditing}
            onEdit={() => handleSectionEdit('volunteer_experience')}
            onClose={() => handleSectionClose()}
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
