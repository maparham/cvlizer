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
  Alert,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  Stack,
  Tooltip,
  CardActions,
  Divider,
} from '@mui/material'
import {
  AccountCircle as AccountCircleIcon,
  Upload as UploadIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Create as CreateIcon,
  GetApp as DownloadIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Sort as SortIcon,
  Description as DocumentIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  HourglassEmpty as ProcessingIcon,
  EditNote as EditedIcon,
  ContentCopy as DuplicateIcon
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
  const [duplicating, setDuplicating] = useState(false)
  
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'parsed' | 'parsing' | 'error'>('all')
  const [sortBy, setSortBy] = useState<'name' | 'created' | 'modified'>('modified')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  
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
    deleteCV: deleteCVFromStore,
    duplicateCV: duplicateCVFromStore
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
    // Use the new is_imported field if available, otherwise fall back to file_size check
    return cv.is_imported ?? cv.file_size > 0
  }

  // Check if any CV has been edited
  const hasBeenEdited = (cv: CV) => {
    return cv.has_been_edited ?? false
  }

  // Check if an imported CV has been edited (for backward compatibility)
  const isImportedAndEdited = (cv: CV) => {
    return isUploadedCV(cv) && (cv.has_been_edited ?? false)
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

  const handleDuplicateCV = async (cv: CV) => {
    if (duplicating) return
    
    setDuplicating(true)
    try {
      await duplicateCVFromStore(cv.id)
      showSuccess('Success', `CV "${cv.original_filename}" duplicated successfully`)
    } catch (error) {
      showError('Error', 'Failed to duplicate CV')
      console.error('Error duplicating CV:', error)
    } finally {
      setDuplicating(false)
    }
  }


  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const day = date.getDate().toString().padStart(2, '0')
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const year = date.getFullYear()
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')
    return `${day}.${month}.${year} ${hours}:${minutes}`
  }

  // Filter and sort CVs
  const filteredAndSortedCVs = React.useMemo(() => {
    let filtered = cvs.filter((cv) => {
      // Search filter
      const matchesSearch = cv.original_filename.toLowerCase().includes(searchTerm.toLowerCase())
      
      // Status filter
      let matchesStatus = true
      if (filterStatus === 'parsed') {
        matchesStatus = cv.is_parsed && !cv.parse_error
      } else if (filterStatus === 'parsing') {
        matchesStatus = !cv.is_parsed && !cv.parse_error
      } else if (filterStatus === 'error') {
        matchesStatus = !!cv.parse_error
      }
      
      return matchesSearch && matchesStatus
    })

    // Sort
    filtered.sort((a, b) => {
      let comparison = 0
      
      if (sortBy === 'name') {
        comparison = a.original_filename.localeCompare(b.original_filename)
      } else if (sortBy === 'created') {
        comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      } else if (sortBy === 'modified') {
        comparison = new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime()
      }
      
      return sortOrder === 'asc' ? comparison : -comparison
    })

    return filtered
  }, [cvs, searchTerm, filterStatus, sortBy, sortOrder])

  // Get status counts for filter badges
  const statusCounts = React.useMemo(() => {
    const counts = {
      all: cvs.length,
      parsed: cvs.filter(cv => cv.is_parsed && !cv.parse_error).length,
      parsing: cvs.filter(cv => !cv.is_parsed && !cv.parse_error).length,
      error: cvs.filter(cv => !!cv.parse_error).length
    }
    return counts
  }, [cvs])

  // Get CV status icon and color
  const getCVStatusIcon = (cv: CV) => {
    if (cv.parse_error) {
      return <ErrorIcon color="error" fontSize="small" />
    } else if (cv.is_parsed) {
      return <CheckCircleIcon color="success" fontSize="small" />
    } else {
      return <ProcessingIcon color="warning" fontSize="small" />
    }
  }

  // Get sections count from parsed data (only visible sections)
  const getSectionCount = (cv: CV) => {
    if (!cv.parsed_data) return 0
    
    // Helper function to check if section has data
    const hasData = (sectionType: string) => {
      switch (sectionType) {
        case 'personal_info':
          return cv.parsed_data?.personal_info?.full_name
        case 'professional_summary':
          return cv.parsed_data?.professional_summary?.content
        case 'work_experience':
          return cv.parsed_data?.work_experience?.length
        case 'education':
          return cv.parsed_data?.education?.length
        case 'skills':
          return cv.parsed_data?.skills?.technical?.length || cv.parsed_data?.skills?.soft?.length
        case 'certifications':
          return cv.parsed_data?.certifications?.length
        case 'projects':
          return cv.parsed_data?.projects?.length
        case 'awards':
          return cv.parsed_data?.awards?.length
        case 'publications':
          return cv.parsed_data?.publications?.length
        case 'volunteer_experience':
          return cv.parsed_data?.volunteer_experience?.length
        default:
          return false
      }
    }
    
    // If there's no section config, fall back to counting all sections with data
    if (!cv.parsed_data.section_config?.sections) {
      let count = 0
      if (cv.parsed_data.personal_info?.full_name) count++
      if (cv.parsed_data.professional_summary?.content) count++
      if (cv.parsed_data.work_experience?.length) count++
      if (cv.parsed_data.education?.length) count++
      if (cv.parsed_data.skills?.technical?.length || cv.parsed_data.skills?.soft?.length) count++
      if (cv.parsed_data.certifications?.length) count++
      if (cv.parsed_data.projects?.length) count++
      if (cv.parsed_data.awards?.length) count++
      if (cv.parsed_data.publications?.length) count++
      if (cv.parsed_data.volunteer_experience?.length) count++
      return count
    }
    
    // Count only visible sections that have data
    return cv.parsed_data.section_config.sections
      .filter(section => section.visible && hasData(section.type))
      .length
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
            <MenuItem onClick={() => { navigate('/profile'); handleMenuClose(); }}>Profile</MenuItem>
            <MenuItem onClick={handleLogout}>Logout</MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Box>
            <Typography variant="h4" component="h1" sx={{ mb: 1 }}>
              My CVs
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Manage and optimize your CV collection
            </Typography>
          </Box>
          {/* Only show header buttons when there are CVs */}
          {cvs.length > 0 && (
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="contained"
                startIcon={<CreateIcon />}
                onClick={handleCreateBlankCV}
                disabled={creating}
                sx={{ 
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 600
                }}
              >
                {creating ? 'Creating...' : 'Create New CV'}
              </Button>
              <Button
                variant="outlined"
                startIcon={<UploadIcon />}
                onClick={() => setUploadOpen(true)}
                sx={{ 
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 600
                }}
              >
                Upload CV
              </Button>
            </Box>
          )}
        </Box>

        {/* Search and Filter Controls */}
        {cvs.length > 5 && (
          <Paper sx={{ p: 3, mb: 4, borderRadius: 2 }}>
            <Stack spacing={3}>
              {/* Search Bar */}
              <TextField
                fullWidth
                placeholder="Search CVs by name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon color="action" />
                    </InputAdornment>
                  ),
                }}
                sx={{ 
                  '& .MuiOutlinedInput-root': { 
                    borderRadius: 2 
                  } 
                }}
              />

              {/* Filter and Sort Controls */}
              <Stack direction="row" spacing={2} alignItems="center">
                {/* Status Filter Chips */}
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <FilterIcon color="action" fontSize="small" />
                  <Chip
                    label={`All (${statusCounts.all})`}
                    variant={filterStatus === 'all' ? 'filled' : 'outlined'}
                    onClick={() => setFilterStatus('all')}
                    color="primary"
                    size="small"
                  />
                  <Chip
                    label={`Ready (${statusCounts.parsed})`}
                    variant={filterStatus === 'parsed' ? 'filled' : 'outlined'}
                    onClick={() => setFilterStatus('parsed')}
                    color="success"
                    size="small"
                  />
                  <Chip
                    label={`Processing (${statusCounts.parsing})`}
                    variant={filterStatus === 'parsing' ? 'filled' : 'outlined'}
                    onClick={() => setFilterStatus('parsing')}
                    color="warning"
                    size="small"
                  />
                  {statusCounts.error > 0 && (
                    <Chip
                      label={`Errors (${statusCounts.error})`}
                      variant={filterStatus === 'error' ? 'filled' : 'outlined'}
                      onClick={() => setFilterStatus('error')}
                      color="error"
                      size="small"
                    />
                  )}
                </Box>

                <Divider orientation="vertical" flexItem />

                {/* Sort Controls */}
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <SortIcon color="action" fontSize="small" />
                  <FormControl size="small" sx={{ minWidth: 120 }}>
                    <InputLabel>Sort by</InputLabel>
                    <Select
                      value={sortBy}
                      label="Sort by"
                      onChange={(e) => setSortBy(e.target.value as 'name' | 'created' | 'modified')}
                    >
                      <MenuItem value="modified">Last Modified</MenuItem>
                      <MenuItem value="created">Date Created</MenuItem>
                      <MenuItem value="name">Name</MenuItem>
                    </Select>
                  </FormControl>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    sx={{ minWidth: 'auto', px: 1 }}
                  >
                    {sortOrder === 'asc' ? '↑' : '↓'}
                  </Button>
                </Box>
              </Stack>
            </Stack>
          </Paper>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <LinearProgress sx={{ width: 200 }} />
          </Box>
        ) : cvs.length === 0 ? (
          <Paper sx={{ 
            p: 6, 
            textAlign: 'center', 
            borderRadius: 3,
            background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)'
          }}>
            <DocumentIcon sx={{ fontSize: 80, color: 'primary.main', mb: 3 }} />
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
              Welcome to CV Optimizer
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 600, mx: 'auto' }}>
              Create professional CVs from scratch or upload existing ones to enhance them with AI-powered optimization. 
              Get started by creating your first CV or uploading an existing document.
            </Typography>
            <Stack direction="row" spacing={2} justifyContent="center">
              <Button
                variant="contained"
                size="large"
                startIcon={<CreateIcon />}
                onClick={handleCreateBlankCV}
                disabled={creating}
                sx={{ 
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 600,
                  px: 4,
                  py: 1.5
                }}
              >
                {creating ? 'Creating...' : 'Create New CV'}
              </Button>
              <Button
                variant="outlined"
                size="large"
                startIcon={<UploadIcon />}
                onClick={() => setUploadOpen(true)}
                sx={{ 
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 600,
                  px: 4,
                  py: 1.5
                }}
              >
                Upload Existing CV
              </Button>
            </Stack>
          </Paper>
        ) : filteredAndSortedCVs.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
            <SearchIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              No CVs match your search
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Try adjusting your search terms or filters
            </Typography>
          </Paper>
        ) : (
          <Grid container spacing={3}>
            {filteredAndSortedCVs.map((cv) => (
              <Grid item xs={12} sm={6} lg={4} key={cv.id}>
                <Card sx={{ 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column',
                  borderRadius: 3,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  transition: 'all 0.3s ease-in-out',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.15)'
                  }
                }}>
                  <CardContent sx={{ flexGrow: 1, pb: 1 }}>
                    {/* CV Header with Status */}
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
                      <Box sx={{ flexGrow: 1, mr: 1 }}>
                        <EditableTitle
                          title={cv.original_filename}
                          onSave={(newTitle) => handleTitleSave(cv, newTitle)}
                          variant="h6"
                          sx={{ 
                            mb: 1,
                            fontWeight: 600,
                            fontSize: '1.1rem',
                            lineHeight: 1.2
                          }}
                        />
                      </Box>
                      <Tooltip title={
                        cv.parse_error ? 'Parsing failed' : 
                        cv.is_parsed ? 'Ready to edit' : 'Processing'
                      }>
                        {getCVStatusIcon(cv)}
                      </Tooltip>
                    </Box>

                    {/* File Type and Metadata */}
                    <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                      {isUploadedCV(cv) && (
                        <Tooltip title="Download original file">
                          <Chip
                            label={cv.file_type.split('/')[1].toUpperCase()}
                            size="small"
                            color="primary"
                            variant="outlined"
                            icon={<DownloadIcon />}
                            clickable
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDownloadCV(cv)
                            }}
                            sx={{ borderRadius: 1.5 }}
                          />
                        </Tooltip>
                      )}
                      {hasBeenEdited(cv) && (
                        <Tooltip title="This CV has been modified">
                          <Chip
                            label="Modified"
                            size="small"
                            color="warning"
                            variant="outlined"
                            icon={<EditedIcon />}
                            sx={{ borderRadius: 1.5 }}
                          />
                        </Tooltip>
                      )}
                      {cv.is_parsed && (
                        <Chip
                          label={`${getSectionCount(cv)} sections`}
                          size="small"
                          variant="outlined"
                          sx={{ borderRadius: 1.5 }}
                        />
                      )}
                    </Stack>

                    {/* File Info */}
                    <Box sx={{ mb: 2 }}>
                      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                        <ScheduleIcon fontSize="small" color="action" />
                        <Typography variant="body2" color="text.secondary">
                          Created {formatDate(cv.created_at)}
                        </Typography>
                      </Stack>
                      {cv.updated_at && cv.updated_at !== cv.created_at && (
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <EditIcon fontSize="small" color="action" />
                          <Typography variant="body2" color="text.secondary">
                            Modified {formatDate(cv.updated_at)}
                          </Typography>
                        </Stack>
                      )}
                    </Box>

                    {/* Processing Status */}
                    {!cv.is_parsed && !cv.parse_error && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          AI is analyzing your CV...
                        </Typography>
                        <LinearProgress sx={{ borderRadius: 1 }} />
                      </Box>
                    )}

                    {/* Error State */}
                    {cv.parse_error && (
                      <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
                        <Typography variant="body2">
                          {cv.parse_error}
                        </Typography>
                      </Alert>
                    )}
                  </CardContent>

                  {/* Action Buttons */}
                  <CardActions sx={{ p: 2, pt: 0, justifyContent: 'space-between' }}>
                    <Button
                      size="medium"
                      variant="contained"
                      startIcon={<EditIcon />}
                      onClick={() => navigate(`/cv/${cv.id}`)}
                      disabled={!cv.is_parsed}
                      sx={{ 
                        borderRadius: 2,
                        textTransform: 'none',
                        fontWeight: 600,
                        flexGrow: 1,
                        mr: 1
                      }}
                    >
                      {cv.is_parsed ? 'Edit CV' : 'Processing...'}
                    </Button>
                    
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <Tooltip title="Duplicate CV">
                        <span>
                          <IconButton
                            size="small"
                            onClick={() => handleDuplicateCV(cv)}
                            disabled={duplicating || !cv.is_parsed}
                            sx={{ 
                              border: 1,
                              borderColor: 'divider',
                              '&:hover': {
                                borderColor: 'primary.main',
                                color: 'primary.main'
                              }
                            }}
                          >
                            <DuplicateIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                      
                      <Tooltip title="Delete CV">
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteClick(cv)}
                          sx={{ 
                            border: 1,
                            borderColor: 'divider',
                            '&:hover': {
                              borderColor: 'error.main',
                              color: 'error.main'
                            }
                          }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </CardActions>
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
      </Container>
    </Box>
  )
}

export default Dashboard
