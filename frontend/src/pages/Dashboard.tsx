import React, { useState, useEffect } from 'react'
import {
  Container,
  Typography,
  Button,
  Box,
  Card,
  CardContent,
  Grid,
  AppBar,
  Toolbar,
  IconButton,
  Menu,
  MenuItem,
  Paper,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  LinearProgress,
  Snackbar,
  Alert
} from '@mui/material'
import {
  AccountCircle as AccountCircleIcon,
  Upload as UploadIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Create as CreateIcon,
  GetApp as DownloadIcon
} from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { CVUpload, EditableTitle } from '../components/cv'
import { useCVStore } from '../stores/cvStore'
import { useNotifications } from '../stores/uiStore'
import { cvApi } from '../services/api'
import { CV } from '../types'

const Dashboard: React.FC = () => {
  const [uploadOpen, setUploadOpen] = useState(false)
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [cvToDelete, setCvToDelete] = useState<CV | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [creating, setCreating] = useState(false)
  
  const { logout } = useAuth()
  const navigate = useNavigate()
  const { showSuccess, showError, notifications, removeNotification } = useNotifications()
  
  // Use CV store instead of local state
  const {
    cvs,
    loading,
    error,
    // hasUnparsedCVs,
    fetchCVs,
    createTemporaryCV,
    updateCVTitle,
    deleteCV: deleteCVFromStore
  } = useCVStore()

  // Fetch CVs on component mount
  useEffect(() => {
    fetchCVs()
  }, []) // Empty dependency array - only run once on mount

  // Show error notifications
  useEffect(() => {
    if (error) {
      showError('Error', error)
    }
  }, [error]) // Remove showError from dependencies to prevent infinite loop

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

  const handleDeleteClick = (cv: CV) => {
    setCvToDelete(cv)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!cvToDelete) return

    setDeleting(true)
    try {
      await deleteCVFromStore(cvToDelete.id)
      showSuccess('Success', `${cvToDelete.original_filename} deleted successfully`)
      setDeleteDialogOpen(false)
      setCvToDelete(null)
    } catch (error) {
      showError('Error', 'Failed to delete CV')
      console.error('Error deleting CV:', error)
    } finally {
      setDeleting(false)
    }
  }

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false)
    setCvToDelete(null)
  }

  const handleCreateBlankCV = () => {
    setCreating(true)
    try {
      createTemporaryCV()
      navigate(`/cv/new`)
    } catch (error) {
      showError('Error', 'Failed to create new CV')
      console.error('Error creating temporary CV:', error)
    } finally {
      setCreating(false)
    }
  }

  const handleTitleSave = async (cv: CV, newTitle: string) => {
    try {
      await updateCVTitle(cv.id, newTitle)
      showSuccess('Success', 'CV title updated successfully')
    } catch (error: any) {
      const errorMessage = error?.response?.data?.detail || 'Failed to update CV title'
      showError('Error', errorMessage)
      console.error('Error updating CV title:', error)
    }
  }

  // Check if CV was uploaded (has file) vs created from scratch
  const isUploadedCV = (cv: CV) => {
    // For uploaded CVs, file_size should be > 0
    // file_path might be undefined in some cases, so we check file_size as primary indicator
    return cv.file_size > 0
  }

  const handleDownloadCV = async (cv: CV) => {
    try {
      await cvApi.downloadCV(cv.id, cv.original_filename)
      showSuccess('Success', 'CV download started')
    } catch (error) {
      showError('Error', 'Failed to download CV')
      console.error('Error downloading CV:', error)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            CV Optimizer
          </Typography>
          <IconButton
            size="large"
            edge="end"
            aria-label="account of current user"
            aria-controls="menu-appbar"
            aria-haspopup="true"
            onClick={handleMenuOpen}
            color="inherit"
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

      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Typography variant="h4" component="h1">
            My CVs
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="contained"
              startIcon={<CreateIcon />}
              onClick={handleCreateBlankCV}
              disabled={creating}
            >
              {creating ? 'Creating...' : 'Create New CV'}
            </Button>
            <Button
              variant="outlined"
              startIcon={<UploadIcon />}
              onClick={() => setUploadOpen(true)}
            >
              Upload CV
            </Button>
          </Box>
        </Box>

        {loading ? (
          <Typography>Loading...</Typography>
        ) : cvs.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <CreateIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              No CVs created yet
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Create a new CV from scratch or upload an existing one to get started
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
              <Button
                variant="contained"
                startIcon={<CreateIcon />}
                onClick={handleCreateBlankCV}
                disabled={creating}
              >
                {creating ? 'Creating...' : 'Create New CV'}
              </Button>
              <Button
                variant="outlined"
                startIcon={<UploadIcon />}
                onClick={() => setUploadOpen(true)}
              >
                Upload CV
              </Button>
            </Box>
          </Paper>
        ) : (
          <Grid container spacing={3}>
            {cvs.map((cv) => (
              <Grid item xs={12} md={6} lg={4} key={cv.id}>
                <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <CardContent sx={{ flexGrow: 1 }}>
                    <EditableTitle
                      title={cv.original_filename}
                      onSave={(newTitle) => handleTitleSave(cv, newTitle)}
                      variant="h6"
                      sx={{ mb: 2 }}
                    />
                    <Box sx={{ mb: 2 }}>
                      {isUploadedCV(cv) && (
                        <Chip
                          label={cv.file_type.split('/')[1].toUpperCase()}
                          size="small"
                          color="primary"
                          variant="outlined"
                          icon={<DownloadIcon />}
                          clickable
                          onClick={(e) => {
                            e.stopPropagation() // Prevent card click from interfering
                            handleDownloadCV(cv)
                          }}
                          title="Download original file"
                        />
                      )}
                      {!cv.is_parsed && !cv.parse_error && (
                        <Chip
                          label="Parsing..."
                          size="small"
                          color="warning"
                          variant="outlined"
                          sx={{ ml: isUploadedCV(cv) ? 1 : 0 }}
                        />
                      )}
                      {cv.parse_error && (
                        <Chip
                          label="Parse Error"
                          size="small"
                          color="error"
                          variant="outlined"
                          sx={{ ml: isUploadedCV(cv) ? 1 : 0 }}
                        />
                      )}
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        {isUploadedCV(cv) ? `${formatFileSize(cv.file_size)} • ` : ''}
                        {formatDate(cv.created_at)}
                      </Typography>
                    </Box>
                    {!cv.is_parsed && !cv.parse_error && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          AI is parsing your CV...
                        </Typography>
                        <LinearProgress />
                      </Box>
                    )}
                    {cv.parse_error && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" color="error">
                          Parsing failed: {cv.parse_error}
                        </Typography>
                      </Box>
                    )}
                  </CardContent>
                  <Box sx={{ p: 2, pt: 0 }}>
                    <Button
                      size="small"
                      startIcon={<EditIcon />}
                      onClick={() => navigate(`/cv/${cv.id}`)}
                      disabled={!cv.is_parsed}
                      sx={{ mr: 1 }}
                    >
                      {cv.is_parsed ? 'Edit' : 'Parsing...'}
                    </Button>
                    <Button
                      size="small"
                      color="error"
                      startIcon={<DeleteIcon />}
                      onClick={() => handleDeleteClick(cv)}
                    >
                      Delete
                    </Button>
                  </Box>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

        <CVUpload
          open={uploadOpen}
          onClose={() => setUploadOpen(false)}
          onSuccess={() => {
            setUploadOpen(false)
            showSuccess('Success', 'CV uploaded successfully and is being parsed')
            // The CV store already adds the new CV to the list, no need to fetch
            // The store will handle polling for parsing updates automatically
          }}
        />

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={deleteDialogOpen}
          onClose={handleDeleteCancel}
          aria-labelledby="delete-dialog-title"
          aria-describedby="delete-dialog-description"
        >
          <DialogTitle id="delete-dialog-title">
            Delete CV
          </DialogTitle>
          <DialogContent>
            <DialogContentText id="delete-dialog-description">
              Are you sure you want to delete "{cvToDelete?.original_filename}"? This action cannot be undone.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleDeleteCancel} disabled={deleting}>
              Cancel
            </Button>
            <Button 
              onClick={handleDeleteConfirm} 
              color="error" 
              autoFocus
              disabled={deleting}
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogActions>
        </Dialog>

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
      </Container>
    </Box>
  )
}

export default Dashboard
