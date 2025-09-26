/**
 * Personal Information Section Component
 * 
 * This module renders and manages the personal information section of a CV including:
 * - Contact details (name, email, phone, location)
 * - Social media links (LinkedIn, GitHub, website)
 * - Location autocomplete functionality
 * - Form validation and editing states
 */
import React from 'react'
import { Box, TextField, InputAdornment, Typography } from '@mui/material'
import { GitHub as GitHubIcon, LinkedIn as LinkedInIcon, Language as WebsiteIcon } from '@mui/icons-material'
import { SectionProps } from '../../../types'
import SimpleFormSection from '../core/SimpleFormSection'
import LocationAutocomplete from '../ui/LocationAutocomplete'

const PersonalInfoSection: React.FC<SectionProps> = ({ data, onUpdate, onSave, isEditing, onEdit, onClose, onUnsavedChanges }) => {
  const renderForm = (editData: any, updateData: (field: string, value: any) => void, onSave: () => void, onCancel: () => void) => (
    <Box>
      <TextField
        fullWidth
        variant="standard"
        value={editData.full_name || ''}
        onChange={(e) => updateData('full_name', e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            if (editData.full_name?.trim()) {
              onSave()
            }
          } else if (e.key === 'Escape') {
            // Let global escape handler manage this
            onCancel()
          }
        }}
        error={!editData.full_name?.trim()}
        helperText={!editData.full_name?.trim() ? "Full name is required" : ""}
        data-testid="personal-info-full-name-input"
        sx={{ 
          '& .MuiInputBase-input': { 
            fontSize: '2rem', 
            fontWeight: 'bold',
            color: '#1976d2'
          }
        }}
        placeholder="Your Name *"
      />
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2, mt: 2 }}>
        <TextField
          variant="standard"
          value={editData.email || ''}
          onChange={(e) => updateData('email', e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              if (editData.email?.trim()) {
                onSave()
              }
            } else if (e.key === 'Escape') {
              e.preventDefault()
              onCancel()
            }
          }}
          error={!editData.email?.trim()}
          helperText={!editData.email?.trim() ? "Email is required" : ""}
          placeholder="Email *"
          data-testid="personal-info-email-input"
          sx={{ 
            minWidth: 200,
            '& .MuiInputBase-input': {
            }
          }}
          InputProps={{
            startAdornment: <InputAdornment position="start">📧</InputAdornment>
          }}
        />
        <TextField
          variant="standard"
          value={editData.phone || ''}
          onChange={(e) => updateData('phone', e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              onSave()
            } else if (e.key === 'Escape') {
              e.preventDefault()
              onCancel()
            }
          }}
          error={false}
          helperText=""
          placeholder="Phone"
          data-testid="personal-info-phone-input"
          sx={{ 
            minWidth: 200,
            '& .MuiInputBase-input': {
            }
          }}
          InputProps={{
            startAdornment: <InputAdornment position="start">📞</InputAdornment>
          }}
        />
        <LocationAutocomplete
          value={editData.location || ''}
          onChange={(value) => updateData('location', value)}
          onSave={onSave}
          onCancel={onCancel}
          error={!editData.location?.trim()}
          helperText={!editData.location?.trim() ? "Location is required" : ""}
          placeholder="Location *"
          fullWidth={false}
          sx={{ minWidth: 200 }}
        />
      </Box>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2 }}>
        <TextField
          variant="standard"
          value={editData.linkedin_url || ''}
          onChange={(e) => updateData('linkedin_url', e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              onSave()
            } else if (e.key === 'Escape') {
              e.preventDefault()
              onCancel()
            }
          }}
          placeholder="LinkedIn URL"
          sx={{ 
            minWidth: 200,
            '& .MuiInputBase-input': {
            }
          }}
          InputProps={{
            startAdornment: <InputAdornment position="start"><LinkedInIcon /></InputAdornment>
          }}
        />
        <TextField
          variant="standard"
          value={editData.github_url || ''}
          onChange={(e) => updateData('github_url', e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              onSave()
            } else if (e.key === 'Escape') {
              e.preventDefault()
              onCancel()
            }
          }}
          placeholder="GitHub URL"
          sx={{ 
            minWidth: 200,
            '& .MuiInputBase-input': {
            }
          }}
          InputProps={{
            startAdornment: <InputAdornment position="start"><GitHubIcon /></InputAdornment>
          }}
        />
        <TextField
          variant="standard"
          value={editData.website_url || ''}
          onChange={(e) => updateData('website_url', e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              onSave()
            } else if (e.key === 'Escape') {
              e.preventDefault()
              onCancel()
            }
          }}
          placeholder="Website URL"
          sx={{ 
            minWidth: 200,
            '& .MuiInputBase-input': {
            }
          }}
          InputProps={{
            startAdornment: <InputAdornment position="start"><WebsiteIcon /></InputAdornment>
          }}
        />
      </Box>
    </Box>
  )

  const renderDisplay = (data: any) => (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 2, color: '#1976d2' }}>
        {data.full_name || 'Your Name'}
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2 }}>
        {data.email && (
          <Typography variant="body1" sx={{ color: '#666' }}>
            📧 {data.email}
          </Typography>
        )}
        {data.phone && (
          <Typography variant="body1" sx={{ color: '#666' }}>
            📞 {data.phone}
          </Typography>
        )}
        {data.location && (
          <Typography variant="body1" sx={{ color: '#666' }}>
            📍 {data.location}
          </Typography>
        )}
      </Box>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2 }}>
        {data.linkedin_url && (
          <Typography variant="body1" sx={{ color: '#1976d2' }}>
            <LinkedInIcon sx={{ mr: 0.5, verticalAlign: 'middle' }} /> <a href={data.linkedin_url} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>
              LinkedIn
            </a>
          </Typography>
        )}
        {data.github_url && (
          <Typography variant="body1" sx={{ color: '#1976d2' }}>
            <GitHubIcon sx={{ mr: 0.5, verticalAlign: 'middle' }} /> <a href={data.github_url} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>
              GitHub
            </a>
          </Typography>
        )}
        {data.website_url && (
          <Typography variant="body1" sx={{ color: '#1976d2' }}>
            <WebsiteIcon sx={{ mr: 0.5, verticalAlign: 'middle' }} /> <a href={data.website_url} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>
              Website
            </a>
          </Typography>
        )}
      </Box>
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
      onUnsavedChanges={onUnsavedChanges}
      title="Personal Information"
      sectionId="personal_info"
      requiredFields={['full_name', 'email', 'location']}
      renderForm={renderForm}
      renderDisplay={renderDisplay}
      autoSaveMessage="Personal information auto-saved"
    />
  )
}

export default PersonalInfoSection
