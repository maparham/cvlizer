import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  AppBar,
  Toolbar,
  IconButton,
  Menu,
  MenuItem,
  Typography,
  Box,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button
} from '@mui/material'
import {
  ArrowBack as ArrowBackIcon,
  AccountCircle as AccountCircleIcon,
  PictureAsPdf as PictureAsPdfIcon
} from '@mui/icons-material'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { cvApi } from '../services/api'
import { CVEditorProvider, useCVEditor } from '../contexts/CVEditorContext'
import { PDFCVEditor } from '../components/cv'
import { SaveWithValidationErrors } from '../components/cv/SaveWithValidationErrors'
import { InitialValidation } from '../components/cv/InitialValidation'
import { ErrorBoundary } from '../components/common'
import { useCVStore } from '../stores/cvStore'
import { useNotifications } from '../stores/uiStore'
import { CVData } from '../types'
import { parseValidationErrors } from '../utils/validationUtils'

// Component that handles back navigation with edit state checks
const CVEditorHeader: React.FC<{ 
  onLogout: () => void,
  onMenuOpen: (event: React.MouseEvent<HTMLElement>) => void,
  onMenuClose: () => void,
  anchorEl: null | HTMLElement,
  onExport: () => void,
  isAdmin: boolean
}> = ({ onLogout, onMenuOpen, onMenuClose, anchorEl, onExport, isAdmin }) => {
  const navigate = useNavigate()
  const { editingSection, editingIndividualItem, hasUnsavedChanges } = useCVEditor()
  const [showBackDialog, setShowBackDialog] = useState(false)

  const handleBackClick = () => {
    // Check if any section is in edit mode or has unsaved changes
    if (editingSection || editingIndividualItem || hasUnsavedChanges) {
      setShowBackDialog(true)
    } else {
      navigate('/dashboard')
    }
  }

  const handleBackDialogClose = () => {
    setShowBackDialog(false)
  }

  const handleBackDialogConfirm = () => {
    setShowBackDialog(false)
    navigate('/dashboard')
  }

  return (
    <>
      <AppBar 
        position="static" 
        sx={{ 
          backgroundColor: '#f5f5f5',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          color: '#333'
        }}
      >
        <Toolbar sx={{ minHeight: '48px !important', px: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <IconButton
              edge="start"
              onClick={handleBackClick}
              data-testid="cv-editor-back-button"
              sx={{ 
                mr: 1,
                color: '#666',
                '&:hover': {
                  backgroundColor: 'rgba(0,0,0,0.04)'
                }
              }}
            >
              <ArrowBackIcon />
            </IconButton>
            <Typography 
              variant="body2" 
              sx={{ 
                color: '#666',
                fontSize: '0.875rem',
                mr: 2
              }}
            >
              Dashboard
            </Typography>
          </Box>
          <Box sx={{ flexGrow: 1 }} />
          <Button
            variant="outlined"
            size="small"
            startIcon={<PictureAsPdfIcon />}
            onClick={onExport}
            sx={{
              mr: 1,
              textTransform: 'none',
              borderColor: '#ccc',
              color: '#444',
              '&:hover': { backgroundColor: 'rgba(0,0,0,0.04)' }
            }}
          >
            Export
          </Button>
          <IconButton
            size="medium"
            edge="end"
            aria-label="account of current user"
            aria-controls="menu-appbar"
            aria-haspopup="true"
            onClick={onMenuOpen}
            data-testid="cv-editor-user-menu-button"
            sx={{
              color: '#666',
              '&:hover': {
                backgroundColor: 'rgba(0,0,0,0.04)'
              }
            }}
          >
            <AccountCircleIcon />
          </IconButton>
          <Menu
            id="menu-appbar"
            anchorEl={anchorEl}
            anchorOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            keepMounted
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            open={Boolean(anchorEl)}
            onClose={onMenuClose}
          >
            <MenuItem onClick={() => { onExport(); onMenuClose(); }}>Export as PDF</MenuItem>
            {isAdmin && (
              <MenuItem onClick={() => { navigate('/admin'); onMenuClose(); }}>Admin</MenuItem>
            )}
            <MenuItem onClick={onLogout}>Logout</MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      {/* Back navigation confirmation dialog */}
      <Dialog
        open={showBackDialog}
        onClose={handleBackDialogClose}
        aria-labelledby="back-dialog-title"
        aria-describedby="back-dialog-description"
        data-testid="unsaved-changes-dialog"
      >
        <DialogTitle id="back-dialog-title">
          Unsaved Changes
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="back-dialog-description">
            You have unsaved changes that will be lost if you go back. Are you sure you want to continue?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleBackDialogClose} data-testid="unsaved-changes-stay-button">Stay</Button>
          <Button onClick={handleBackDialogConfirm} color="error" autoFocus data-testid="unsaved-changes-leave-button">Leave</Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

// Inner component that has access to CVEditor context and can clear unsaved changes
const CVEditorContent: React.FC<{
  cvId: string | undefined
  activeCV: any
  onLogout: () => void
  onMenuOpen: (event: React.MouseEvent<HTMLElement>) => void
  onMenuClose: () => void
  anchorEl: null | HTMLElement
  onTitleSave: (title: string) => Promise<void>
  isAdmin: boolean
}> = ({ cvId, activeCV, onLogout, onMenuOpen, onMenuClose, anchorEl, onTitleSave, isAdmin }) => {
  const { showError } = useNotifications()

  const handleExport = async () => {
    try {
      if (!cvId || cvId === 'new') {
        showError('Export Unavailable', 'Please save your CV before exporting.')
        return
      }
      await cvApi.exportCVAsPDF(cvId)
    } catch (e) {
      showError('Export Failed', 'Could not open PDF export in a new tab.')
    }
  }
  return (
    <>
      <CVEditorHeader
        onLogout={onLogout}
        onMenuOpen={onMenuOpen}
        onMenuClose={onMenuClose}
        anchorEl={anchorEl}
        onExport={handleExport}
        isAdmin={isAdmin}
      />
      <PDFCVEditor 
        title={activeCV?.original_filename || 'Untitled CV'}
        onTitleSave={onTitleSave}
        cvId={cvId !== 'new' ? cvId : undefined}
      />
    </>
  )
}


const CVEditor: React.FC = () => {
  const { cvId } = useParams()
  const navigate = useNavigate()
  const { logout, isAdmin } = useAuth()
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const { showSuccess, showError, showValidationError, showInfo, notifications, removeNotification } = useNotifications()
  
  
  // Use CV store instead of local state
  const {
    currentCV,
    temporaryCV,
    loading,
    error,
    fetchCV,
    updateCV,
    updateCVTitle,
    saveTemporaryCV,
    setCurrentCV,
    setTemporaryCV,
    createSnapshotOnUserAction
  } = useCVStore()
  
  // Determine if this is a new/temporary CV
  const isNewCV = cvId === 'new'
  
  // Get CV data from either current CV or temporary CV
  const activeCV = isNewCV ? temporaryCV : currentCV
  const cvData = useMemo(() => activeCV?.parsed_data, [activeCV])

  // Fetch CV data on component mount (only for existing CVs)
  useEffect(() => {
    if (cvId && cvId !== 'new') {
      fetchCV(cvId)
    } else if (isNewCV && !temporaryCV) {
      // If we're on the new CV route but no temporary CV exists, redirect to dashboard
      navigate('/dashboard')
    }
  }, [cvId, isNewCV, temporaryCV, navigate]) // Only depend on cvId to prevent infinite loops
  
  // Show error notifications (but skip validation errors as they're handled separately)
  useEffect(() => {
    if (error && !error.includes('CV validation failed:')) {
      showError('Error', error)
    }
  }, [error]) // Remove showError from dependencies to prevent infinite loop


  const handleSave = useCallback(async (updatedData?: CVData, message?: string) => {
    const dataToSave = updatedData || cvData
    if (!dataToSave) return
    
    // Show immediate feedback that save is starting
    const savingNotificationId = showInfo('Saving...', 'Your changes are being saved.')
    
    try {
      if (isNewCV) {
        // Save temporary CV to the backend for the first time
        const savedCV = await saveTemporaryCV({ parsed_data: dataToSave })
        // Remove the saving notification and show success
        removeNotification(savingNotificationId)
        showSuccess('Success', message || 'CV created and saved successfully')
        // Navigate to the saved CV's URL
        navigate(`/cv/${savedCV.id}`, { replace: true })
      } else {
        // Update existing CV
        if (!cvId) return
        
        await updateCV(cvId, { parsed_data: dataToSave })
        
        // Create snapshot for user-initiated changes (when message is provided)
        // or when we can detect actual changes through diff comparison
        let shouldCreateSnapshot = false
        
        if (message) {
          // If a message is provided, this is a user-initiated change (add, edit, delete, reorder)
          shouldCreateSnapshot = true
        } else {
          // For saves without explicit messages, always create snapshot for now
          // Backend diff computation will determine if there are actual changes
          shouldCreateSnapshot = true
        }
        
        if (shouldCreateSnapshot) {
          try {
            await createSnapshotOnUserAction(cvId, dataToSave, 'manual_save', message)
          } catch (error) {
            // Snapshot creation failed
          }
        }
        
        // Remove the saving notification and show success
        removeNotification(savingNotificationId)
        showSuccess('Success', message || 'CV saved successfully')
        
        // Clear unsaved changes after successful save
        // We'll dispatch a custom event that the context can listen to
        window.dispatchEvent(new CustomEvent('cv-saved'))
      }
    } catch (error: any) {
      // Remove the saving notification
      removeNotification(savingNotificationId)
      
      const errorMessage = error?.message || error?.response?.data?.message || 'Failed to save CV'
      
      // Dispatch error event for validation error handler
      window.dispatchEvent(new CustomEvent('cv-save-error', { detail: error }))
      
      // Check if this is a validation error
      const validationErrors = parseValidationErrors(errorMessage)
      if (validationErrors.length > 0) {
        // For validation errors, show a persistent notification
        showValidationError('Validation Error', 'Please fix the highlighted fields and try saving again.')
      } else {
        // For other errors, show normal error notification
        showError('Error', errorMessage)
      }
    }
  }, [cvId, cvData, isNewCV, updateCV, saveTemporaryCV, createSnapshotOnUserAction, showInfo, showSuccess, showError, removeNotification, navigate])
  
  const handleUpdateCV = useCallback((data: CVData) => {
    // Update the local CV state in the store
    if (isNewCV && temporaryCV) {
      // Update temporary CV
      const updatedTemporaryCV = {
        ...temporaryCV,
        parsed_data: data
      }
      setTemporaryCV(updatedTemporaryCV)
    } else if (currentCV) {
      // Update existing CV
      const updatedCV = {
        ...currentCV,
        parsed_data: data
      }
      setCurrentCV(updatedCV)
    }
  }, [isNewCV, temporaryCV, currentCV, setCurrentCV, setTemporaryCV])

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
  }

  const handleLogout = () => {
    logout()
    navigate('/')
    handleMenuClose()
  }

  const handleTitleSave = async (newTitle: string) => {
    if (isNewCV) {
      // For temporary CVs, just update the local state
      if (temporaryCV) {
        const updatedTemporaryCV = {
          ...temporaryCV,
          original_filename: newTitle
        }
        setTemporaryCV(updatedTemporaryCV)
        showSuccess('Success', 'Title updated (will be saved when you save the CV)')
      }
    } else {
      // For existing CVs, save to backend
      if (!cvId) {
        showError('Error', 'Cannot update title: CV ID not found')
        return
      }
      
      try {
        await updateCVTitle(cvId, newTitle)
        showSuccess('Success', 'CV title updated successfully')
      } catch (error: any) {
        const errorMessage = error?.response?.data?.detail || 'Failed to update CV title'
        showError('Error', errorMessage)
      }
    }
  }

  if (loading && !activeCV) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <Typography>Loading CV...</Typography>
      </Box>
    )
  }

  if (!cvData || !activeCV) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <Typography>CV not found</Typography>
      </Box>
    )
  }

  return (
    <ErrorBoundary>
      <Box sx={{ flexGrow: 1, height: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ flex: 1, overflow: 'hidden' }}>
          <CVEditorProvider
            cvData={cvData}
            onUpdateCV={handleUpdateCV}
            onSave={handleSave}
          >
            <SaveWithValidationErrors onSaveError={() => {}}>
              <InitialValidation>
                <CVEditorContent
                  cvId={cvId}
                  activeCV={activeCV}
                  onLogout={handleLogout}
                  onMenuOpen={handleMenuOpen}
                  onMenuClose={handleMenuClose}
                  anchorEl={anchorEl}
                  onTitleSave={handleTitleSave}
                  isAdmin={isAdmin}
                />
              </InitialValidation>
            </SaveWithValidationErrors>
          </CVEditorProvider>
        </Box>

      {/* Notifications */}
      {notifications.map((notification) => (
        <Snackbar
          key={notification.id}
          open={true}
          autoHideDuration={notification.persistent ? null : notification.duration}
          onClose={() => removeNotification(notification.id)}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
          sx={{ mt: 0 }} // Directly below app bar
        >
          <Alert
            onClose={() => removeNotification(notification.id)}
            severity={notification.type}
            sx={{ width: '100%' }}
          >
            <strong>{notification.title}</strong>
            {notification.message && (
              <Box component="div" sx={{ mt: 0.5 }}>
                {notification.message}
              </Box>
            )}
          </Alert>
        </Snackbar>
      ))}
      </Box>
    </ErrorBoundary>
  )
}

export default CVEditor
