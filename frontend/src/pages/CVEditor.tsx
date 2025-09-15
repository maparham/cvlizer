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
  Alert
} from '@mui/material'
import {
  ArrowBack as ArrowBackIcon,
  AccountCircle as AccountCircleIcon
} from '@mui/icons-material'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { CVEditorProvider } from '../contexts/CVEditorContext'
import { PDFCVEditor } from '../components/cv'
import { useCVStore } from '../stores/cvStore'
import { useNotifications } from '../stores/uiStore'
import { CVData } from '../types'

const CVEditor: React.FC = () => {
  const { cvId } = useParams()
  const navigate = useNavigate()
  const { logout } = useAuth()
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const { showSuccess, showError, showInfo, notifications, removeNotification } = useNotifications()
  
  // Use CV store instead of local state
  const {
    currentCV,
    loading,
    error,
    fetchCV,
    updateCV
  } = useCVStore()
  
  const cvData = useMemo(() => currentCV?.parsed_data, [currentCV])

  // Fetch CV data on component mount
  useEffect(() => {
    if (cvId) {
      fetchCV(cvId)
    }
  }, [cvId]) // Remove fetchCV from dependencies to prevent infinite loop
  
  // Show error notifications
  useEffect(() => {
    if (error) {
      showError('Error', error)
    }
  }, [error]) // Remove showError from dependencies to prevent infinite loop


  const handleSave = useCallback(async (updatedData?: CVData, message?: string) => {
    const dataToSave = updatedData || cvData
    if (!dataToSave || !cvId) return
    
    // Show immediate feedback that save is starting
    const savingNotificationId = showInfo('Saving...', 'Your changes are being saved.')
    
    try {
      await updateCV(cvId, { parsed_data: dataToSave })
      // Remove the saving notification and show success
      removeNotification(savingNotificationId)
      showSuccess('Success', message || 'CV saved successfully')
    } catch (error: any) {
      console.error('Error saving CV:', error)
      // Remove the saving notification and show error
      removeNotification(savingNotificationId)
      showError('Error', error?.response?.data?.message || 'Failed to save CV')
    }
  }, [cvId, cvData, updateCV, showInfo, showSuccess, showError, removeNotification])
  
  const handleUpdateCV = useCallback((data: CVData) => {
    // Update the local current CV state only
    // Don't trigger API calls unless explicitly saving
  }, [])

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

  if (loading && !currentCV) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <Typography>Loading CV...</Typography>
      </Box>
    )
  }

  if (!cvData || !currentCV) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <Typography>CV not found</Typography>
      </Box>
    )
  }

  return (
    <Box sx={{ flexGrow: 1, height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <AppBar 
        position="static" 
        sx={{ 
          backgroundColor: '#f5f5f5',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          color: '#333'
        }}
      >
        <Toolbar sx={{ minHeight: '48px !important', px: 2 }}>
          <IconButton
            edge="start"
            onClick={() => navigate('/dashboard')}
            sx={{ 
              mr: 2,
              color: '#666',
              '&:hover': {
                backgroundColor: 'rgba(0,0,0,0.04)'
              }
            }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Box sx={{ flexGrow: 1 }} />
          <IconButton
            size="medium"
            edge="end"
            aria-label="account of current user"
            aria-controls="menu-appbar"
            aria-haspopup="true"
            onClick={handleMenuOpen}
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
            onClose={handleMenuClose}
          >
            <MenuItem onClick={handleLogout}>Logout</MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Box sx={{ flex: 1, overflow: 'hidden' }}>
        <CVEditorProvider
          cvData={cvData}
          onUpdateCV={handleUpdateCV}
          onSave={handleSave}
        >
          <PDFCVEditor />
        </CVEditorProvider>
      </Box>

      {/* Notifications */}
      {notifications.map((notification) => (
        <Snackbar
          key={notification.id}
          open={true}
          autoHideDuration={notification.duration}
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
  )
}

export default CVEditor
