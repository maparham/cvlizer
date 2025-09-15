import React, { useState } from 'react'
import { Box, Typography, Chip } from '@mui/material'
import { SectionProps } from '../types'
import SimpleFormSection from '../core/SimpleFormSection'
import SkillsAutocomplete from '../ui/SkillsAutocomplete'

const SkillsSection: React.FC<SectionProps> = ({ data, onUpdate, onSave, isEditing, onEdit, onClose }) => {
  const [newTechnicalSkill, setNewTechnicalSkill] = useState('')
  const [newSoftSkill, setNewSoftSkill] = useState('')

  const renderForm = (editData: any, updateData: (field: string, value: any) => void) => {
    const addTechnicalSkill = () => {
      if (newTechnicalSkill.trim()) {
        const updatedData = {
          ...editData,
          technical: [...(editData.technical || []), newTechnicalSkill.trim()]
        }
        updateData('technical', updatedData.technical)
        onSave?.(updatedData, 'Technical skill added')
        setNewTechnicalSkill('')
      }
    }

    const addSoftSkill = () => {
      if (newSoftSkill.trim()) {
        const updatedData = {
          ...editData,
          soft: [...(editData.soft || []), newSoftSkill.trim()]
        }
        updateData('soft', updatedData.soft)
        onSave?.(updatedData, 'Soft skill added')
        setNewSoftSkill('')
      }
    }

    const addTechnicalSkillDirect = (skill: string) => {
      const updatedData = {
        ...editData,
        technical: [...(editData.technical || []), skill]
      }
      updateData('technical', updatedData.technical)
      onSave?.(updatedData, 'Technical skill added')
    }

    const addSoftSkillDirect = (skill: string) => {
      const updatedData = {
        ...editData,
        soft: [...(editData.soft || []), skill]
      }
      updateData('soft', updatedData.soft)
      onSave?.(updatedData, 'Soft skill added')
    }

    const removeTechnicalSkill = (index: number) => {
      const updatedData = {
        ...editData,
        technical: (editData.technical || []).filter((_: any, i: number) => i !== index)
      }
      updateData('technical', updatedData.technical)
      onSave?.(updatedData, 'Technical skill removed')
    }

    const removeSoftSkill = (index: number) => {
      const updatedData = {
        ...editData,
        soft: (editData.soft || []).filter((_: any, i: number) => i !== index)
      }
      updateData('soft', updatedData.soft)
      onSave?.(updatedData, 'Soft skill removed')
    }

    return (
      <Box>
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
            Technical Skills
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
            {(editData.technical || []).map((skill: string, index: number) => (
              <Chip
                key={index}
                label={skill}
                onDelete={() => removeTechnicalSkill(index)}
                sx={{
                  bgcolor: '#e3f2fd',
                  color: '#1976d2'
                }}
              />
            ))}
          </Box>
          <SkillsAutocomplete
            value={newTechnicalSkill}
            onChange={setNewTechnicalSkill}
            onAdd={addTechnicalSkill}
            onAddDirect={addTechnicalSkillDirect}
            placeholder="Add technical skill"
            skillType="technical"
            existingSkills={editData.technical || []}
          />
        </Box>

        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
            Soft Skills
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
            {(editData.soft || []).map((skill: string, index: number) => (
              <Chip
                key={index}
                label={skill}
                onDelete={() => removeSoftSkill(index)}
                sx={{
                  bgcolor: '#f3e5f5',
                  color: '#7b1fa2'
                }}
              />
            ))}
          </Box>
          <SkillsAutocomplete
            value={newSoftSkill}
            onChange={setNewSoftSkill}
            onAdd={addSoftSkill}
            onAddDirect={addSoftSkillDirect}
            placeholder="Add soft skill"
            skillType="soft"
            existingSkills={editData.soft || []}
          />
        </Box>
      </Box>
    )
  }

  const renderDisplay = (data: any) => (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
      {data.technical?.map((skill: string, index: number) => (
        <Chip
          key={index}
          label={skill}
          sx={{
            bgcolor: '#e3f2fd',
            color: '#1976d2'
          }}
        />
      ))}
      {data.soft?.map((skill: string, index: number) => (
        <Chip
          key={`soft-${index}`}
          label={skill}
          sx={{
            bgcolor: '#f3e5f5',
            color: '#7b1fa2'
          }}
        />
      ))}
    </Box>
  )

  return (
    <SimpleFormSection
      data={data}
      onUpdate={onUpdate}
      onSave={onSave}
      isEditing={isEditing}
      onEdit={onEdit}
      onClose={onClose}
      onUnsavedChanges={undefined} // Skills auto-save immediately, no unsaved changes tracking needed
      title="Skills"
      sectionId="skills"
      requiredFields={[]} // Skills are optional
      renderForm={renderForm}
      renderDisplay={renderDisplay}
      autoSaveMessage="Skills auto-saved"
      autoSaveMode={true} // Hide save/cancel buttons for Skills section
    />
  )
}

export default SkillsSection
