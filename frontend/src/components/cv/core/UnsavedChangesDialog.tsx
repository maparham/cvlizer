import React from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  List,
  ListItem,
  ListItemText,
  ListItemIcon
} from '@mui/material'
import {
  Warning as WarningIcon,
  Edit as EditIcon
} from '@mui/icons-material'

interface UnsavedChangesDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  pendingChanges: Map<string, any>
}

const UnsavedChangesDialog: React.FC<UnsavedChangesDialogProps> = ({
  open,
  onClose,
  onConfirm,
  pendingChanges
}) => {
  const getSectionDisplayName = (sectionId: string): string => {
    const sectionNames: Record<string, string> = {
      'personal_info': 'Personal Information',
      'professional_summary': 'Professional Summary',
      'work_experience': 'Work Experience',
      'education': 'Education',
      'skills': 'Skills',
      'certifications': 'Certifications',
      'projects': 'Projects',
      'awards': 'Awards',
      'publications': 'Publications',
      'volunteer_experience': 'Volunteer Experience'
    }
    return sectionNames[sectionId] || sectionId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  const getChangedSections = (): string[] => {
    return Array.from((pendingChanges || new Map()).keys())
  }

  const changedSections = getChangedSections()

  if (changedSections.length === 0) {
    return null
  }


  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      disableEscapeKeyDown
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <WarningIcon color="warning" />
        Unsaved Changes
      </DialogTitle>
      
      <DialogContent>
        <Typography variant="body1" sx={{ mb: 2 }}>
          You have unsaved changes in the following sections:
        </Typography>
        
        <Box sx={{ maxHeight: 200, overflow: 'auto' }}>
          <List dense>
            {changedSections.map((sectionId) => (
              <ListItem key={sectionId} sx={{ px: 0 }}>
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <EditIcon fontSize="small" color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary={getSectionDisplayName(sectionId)}
                  secondary="Has pending changes"
                />
              </ListItem>
            ))}
          </List>
        </Box>
        
        <Typography variant="body2" sx={{ mt: 2, color: 'text.secondary' }}>
          If you leave now, your changes will be lost. Are you sure you want to continue?
        </Typography>
      </DialogContent>
      
      <DialogActions>
        <Button
          onClick={onClose}
          color="primary"
        >
          Stay
        </Button>
        <Button
          onClick={onConfirm}
          color="error"
          variant="contained"
        >
          Discard Changes
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default UnsavedChangesDialog
