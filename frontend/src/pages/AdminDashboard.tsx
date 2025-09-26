/**
 * Admin Dashboard - Administrative Interface and User Management
 * 
 * This module provides a comprehensive administrative interface for managing users,
 * monitoring system statistics, and performing administrative actions such as
 * activity tracking.
 * 
 * Key responsibilities:
 * - Display system statistics and user overview data
 * - Provide user search, filtering, and management capabilities
 * - Monitor user activities and CV processing status
 * - Manage user error states and provide administrative actions
 * - Display detailed user information and CV data
 * 
 * Usage context:
 * - Accessible only to authenticated admin users
 * - Provides comprehensive user management functionality
 * - Integrates with backend admin API endpoints
 * 
 * Dependencies:
 * - Admin API services for user and system data
 * - Authentication utilities for admin verification
 * - UI components for data display and interaction
 */
import React, { useState, useEffect } from 'react'
import {
  Container,
  Paper,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Badge
} from '@mui/material'
import {
  Dashboard,
  People,
  Description,
  SmartToy,
  Search,
  Refresh,
  Visibility,
  TrendingUp,
  CheckCircle,
  ArrowBack,
  Block,
  CheckCircleOutline,
  Email,
  GetApp,
  SwitchAccount,
} from '@mui/icons-material'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useNotifications } from '../stores/uiStore'
import { useAuth } from '../contexts/AuthContext'
import { useImpersonation } from '../hooks/useImpersonation'
import api from '../services/api'
import { formatDate, formatDateTime } from '../utils/dateFormat'
import { SystemStats, UserSummary, UserDetail, UserCV } from '../types/admin'
import UserActivitiesDialog from '../components/admin/UserActivitiesDialog'
import UserErrorsDialog from '../components/admin/UserErrorsDialog'
import UserDetailDialog from '../components/admin/UserDetailDialog'
import { impersonationService, ImpersonationError } from '../services/impersonationService'


const AdminDashboard: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<SystemStats | null>(null)
  const [users, setUsers] = useState<UserSummary[]>([])
  const [currentTab, setCurrentTab] = useState(0)
  const [searchTerm, setSearchTerm] = useState('')
  const [clerkFilter, setClerkFilter] = useState('all')
  const [activeFilter, setActiveFilter] = useState('all')
  
  // New state for user support features
  const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null)
  const [userDetailOpen, setUserDetailOpen] = useState(false)
  const [userCVs, setUserCVs] = useState<UserCV[]>([])
  const [userCVsOpen, setUserCVsOpen] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  
  const [userActivities, setUserActivities] = useState<any[]>([])
  const [userErrors, setUserErrors] = useState<any[]>([])
  const [activitiesOpen, setActivitiesOpen] = useState(false)
  const [errorsOpen, setErrorsOpen] = useState(false)
  
  // Activity view pagination and filtering
  const [activitiesPage, setActivitiesPage] = useState(0)
  const [activitiesLimit, setActivitiesLimit] = useState(50)
  const [activitiesTotal, setActivitiesTotal] = useState(0)
  const [activitiesLoading, setActivitiesLoading] = useState(false)
  const [activityTypeFilter, setActivityTypeFilter] = useState<string>('')
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  
  // Impersonation state
  const [impersonationDialogOpen, setImpersonationDialogOpen] = useState(false)
  const [impersonationTarget, setImpersonationTarget] = useState<UserSummary | null>(null)
  const [impersonationJustification, setImpersonationJustification] = useState('')
  
  
  const { isAuthenticated } = useAuth()
  const { isImpersonating, forceStatusCheck } = useImpersonation()
  const navigate = useNavigate()
  const { showSuccess } = useNotifications()

  // Initialize tab from URL parameter
  useEffect(() => {
    const tabParam = searchParams.get('tab')
    if (tabParam === 'users') {
      setCurrentTab(1)
    } else if (tabParam === 'overview') {
      setCurrentTab(0)
    }
  }, [searchParams])

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }
    
    if (currentTab === 0) {
      loadStats()
    } else {
      loadUsers()
    }
  }, [isAuthenticated, currentTab, navigate])

  const loadStats = async () => {
    try {
      setLoading(true)
      const response = await api.get('/admin/stats')
      setStats(response.data)
      setError(null)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const loadUsers = async () => {
    try {
      const params = new URLSearchParams()
      if (searchTerm) params.append('search', searchTerm)
      if (clerkFilter !== 'all') params.append('clerk_only', clerkFilter === 'clerk' ? 'true' : 'false')
      if (activeFilter !== 'all') params.append('active_only', activeFilter === 'active' ? 'true' : 'false')
      
      const response = await api.get(`/admin/users?${params}`)
      setUsers(response.data)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load users')
    }
  }

  // New functions for user support features
  const loadUserDetail = async (userId: string) => {
    try {
      setActionLoading(userId)
      const response = await api.get(`/admin/users/${userId}`)
      setSelectedUser(response.data)
      setUserDetailOpen(true)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load user details')
    } finally {
      setActionLoading(null)
    }
  }

  const loadUserCVs = async (userId: string) => {
    try {
      setActionLoading(userId)
      const response = await api.get(`/admin/users/${userId}/cvs`)
      setUserCVs(response.data.cvs)
      setUserCVsOpen(true)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load user CVs')
    } finally {
      setActionLoading(null)
    }
  }

  const toggleUserActive = async (userId: string, currentStatus: boolean) => {
    try {
      setActionLoading(userId)
      await api.put(`/admin/users/${userId}/toggle-active`)
      
      // Update local state
      setUsers(users.map(user => 
        user.id === userId 
          ? { ...user, is_active: !currentStatus }
          : user
      ))
      
      if (selectedUser && selectedUser.id === userId) {
        setSelectedUser({ ...selectedUser, is_active: !currentStatus })
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update user status')
    } finally {
      setActionLoading(null)
    }
  }


  const loadUserActivities = async (userId: string, page: number = 0, limit: number = 50, activityType?: string) => {
    try {
      setActionLoading(userId)
      setActivitiesLoading(true)
      setSelectedUserId(userId)
      setActivitiesPage(page)
      setActivitiesLimit(limit)
      
      const params = new URLSearchParams()
      params.append('limit', limit.toString())
      params.append('offset', (page * limit).toString())
      if (activityType) {
        params.append('activity_type', activityType)
      }
      
      const response = await api.get(`/admin/users/${userId}/activities?${params.toString()}`)
      setUserActivities(response.data.activities)
      setActivitiesTotal(response.data.total || 0)
      setActivitiesOpen(true)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load user activities')
    } finally {
      setActionLoading(null)
      setActivitiesLoading(false)
    }
  }

  const clearUserActivities = async (userId: string) => {
    try {
      const response = await api.delete(`/admin/users/${userId}/activities`)
      showSuccess('Success', response.data.message)
      
      // Refresh the activities list
      if (selectedUserId === userId) {
        loadUserActivities(userId, activitiesPage, activitiesLimit, activityTypeFilter)
      }
      
      // Refresh the users list to update any activity counts
      loadUsers()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to clear user activities')
      throw err // Re-throw so the dialog can handle the error state
    }
  }

  const loadUserErrors = async (userId: string) => {
    try {
      setActionLoading(userId)
      const response = await api.get(`/admin/users/${userId}/errors`)
      setUserErrors(response.data.errors)
      setErrorsOpen(true)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load user errors')
    } finally {
      setActionLoading(null)
    }
  }


  const startImpersonation = async (user: UserSummary) => {
    setImpersonationTarget(user)
    setImpersonationDialogOpen(true)
  }

  const confirmImpersonation = async () => {
    if (!impersonationTarget) return

    try {
      setActionLoading(impersonationTarget.id)
      await impersonationService.startImpersonation({
        target_user_id: impersonationTarget.id,
        justification: impersonationJustification || undefined
      })
      
      setImpersonationDialogOpen(false)
      setImpersonationJustification('')
      showSuccess('Success', `Started impersonating ${impersonationTarget.email}`)
      
      // Force immediate status check to update the banner
      await forceStatusCheck()
      
      // Redirect to dashboard to start using the impersonated account
      navigate('/dashboard')
    } catch (error) {
      if (error instanceof ImpersonationError) {
        setError(error.message)
      } else {
        setError('Failed to start impersonation session')
      }
    } finally {
      setActionLoading(null)
    }
  }



  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  useEffect(() => {
    if (currentTab === 1) {
      loadUsers()
    }
  }, [currentTab, searchTerm, clerkFilter, activeFilter])

  if (!isAuthenticated || loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    )
  }

  // Handle admin access errors from backend
  if (error && error.includes('Admin access required')) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          Admin access required. You don't have permission to view this page.
        </Alert>
        <Button
          variant="contained"
          startIcon={<ArrowBack />}
          onClick={() => navigate('/dashboard')}
        >
          Back to Dashboard
        </Button>
      </Container>
    )
  }

  // Prevent access to admin dashboard during impersonation
  if (isImpersonating) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="warning" sx={{ mb: 2 }}>
          Admin dashboard is not available during impersonation. Please end the impersonation session to access admin features.
        </Alert>
        <Button
          variant="contained"
          startIcon={<ArrowBack />}
          onClick={() => navigate('/dashboard')}
        >
          Back to Dashboard
        </Button>
      </Container>
    )
  }

  const StatCard: React.FC<{
    title: string
    value: number
    icon: React.ReactNode
    color?: string
    trend?: { value: number; label: string }
  }> = ({ title, value, icon, color = 'primary', trend }) => (
    <Card>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography color="textSecondary" gutterBottom variant="h6">
              {title}
            </Typography>
            <Typography variant="h4" component="h2">
              {value.toLocaleString()}
            </Typography>
            {trend && (
              <Box display="flex" alignItems="center" mt={1}>
                <TrendingUp fontSize="small" color="success" />
                <Typography variant="body2" color="success.main" sx={{ ml: 0.5 }}>
                  {trend.value}% {trend.label}
                </Typography>
              </Box>
            )}
          </Box>
          <Box color={`${color}.main`} fontSize={40}>
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  )

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Admin Dashboard
        </Typography>
        <Box>
          <Button
            variant="outlined"
            startIcon={<ArrowBack />}
            onClick={() => navigate('/dashboard')}
            sx={{ mr: 2 }}
          >
            Back to Dashboard
          </Button>
          <Button
            variant="contained"
            startIcon={<Refresh />}
            onClick={() => currentTab === 0 ? loadStats() : loadUsers()}
            sx={{ mr: 1 }}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs 
          value={currentTab} 
          onChange={(_, newValue) => {
            setCurrentTab(newValue)
            // Update URL parameter
            const newSearchParams = new URLSearchParams(searchParams)
            if (newValue === 1) {
              newSearchParams.set('tab', 'users')
            } else {
              newSearchParams.set('tab', 'overview')
            }
            setSearchParams(newSearchParams)
          }}
        >
          <Tab icon={<Dashboard />} label="Overview" />
          <Tab icon={<People />} label="Users" />
        </Tabs>
      </Paper>

      {/* Overview Tab */}
      {currentTab === 0 && stats && (
        <Box>
          {/* Stats Grid */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Total Users"
                value={stats.total_users}
                icon={<People />}
                trend={{ value: Math.round((stats.users_last_7_days / stats.total_users) * 100), label: 'new this week' }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Active Users"
                value={stats.active_users}
                icon={<CheckCircle />}
                color="success"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Total CVs"
                value={stats.total_cvs}
                icon={<Description />}
                trend={{ value: Math.round((stats.cvs_last_7_days / stats.total_cvs) * 100), label: 'new this week' }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="AI Sections"
                value={stats.total_ai_sections}
                icon={<SmartToy />}
                color="secondary"
              />
            </Grid>
          </Grid>

          {/* Additional Stats */}
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    User Distribution
                  </Typography>
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography>Clerk Users</Typography>
                    <Typography variant="h6">{stats.clerk_users}</Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography>Legacy Users</Typography>
                    <Typography variant="h6">{stats.legacy_users}</Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between">
                    <Typography>Job Descriptions</Typography>
                    <Typography variant="h6">{stats.total_job_descriptions}</Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Recent Activity
                  </Typography>
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography>Users (7 days)</Typography>
                    <Typography variant="h6">{stats.users_last_7_days}</Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography>Users (30 days)</Typography>
                    <Typography variant="h6">{stats.users_last_30_days}</Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between">
                    <Typography>CVs (7 days)</Typography>
                    <Typography variant="h6">{stats.cvs_last_7_days}</Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* Users Tab */}
      {currentTab === 1 && (
        <Box>
          {/* Filters */}
          <Paper sx={{ p: 2, mb: 3 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <FormControl fullWidth>
                  <InputLabel>User Type</InputLabel>
                  <Select
                    value={clerkFilter}
                    onChange={(e) => setClerkFilter(e.target.value)}
                    label="User Type"
                  >
                    <MenuItem value="all">All Users</MenuItem>
                    <MenuItem value="clerk">Clerk Users</MenuItem>
                    <MenuItem value="legacy">Legacy Users</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={3}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={activeFilter}
                    onChange={(e) => setActiveFilter(e.target.value)}
                    label="Status"
                  >
                    <MenuItem value="all">All Status</MenuItem>
                    <MenuItem value="active">Active Only</MenuItem>
                    <MenuItem value="inactive">Inactive Only</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={2}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<Refresh />}
                  onClick={loadUsers}
                >
                  Refresh
                </Button>
              </Grid>
            </Grid>
          </Paper>

          {/* Users Table */}
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Email</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>CVs</TableCell>
                  <TableCell>AI Sections</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <Box display="flex" alignItems="center">
                        <Typography variant="body2">{user.email}</Typography>
                        {user.email_verified && (
                          <Tooltip title="Email Verified">
                            <CheckCircle color="success" fontSize="small" sx={{ ml: 1 }} />
                          </Tooltip>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={user.is_clerk_user ? 'Clerk' : 'Legacy'}
                        color={user.is_clerk_user ? 'primary' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={user.is_active ? 'Active' : 'Inactive'}
                        color={user.is_active ? 'success' : 'error'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{user.cv_count}</TableCell>
                    <TableCell>{user.ai_sections_count}</TableCell>
                    <TableCell>
                      {formatDate(user.created_at)}
                    </TableCell>
                    <TableCell>
                      <Box display="flex" gap={1}>
                        <Tooltip title="View Details">
                          <IconButton 
                            size="small"
                            onClick={() => loadUserDetail(user.id)}
                            disabled={actionLoading === user.id}
                          >
                            {actionLoading === user.id ? <CircularProgress size={16} /> : <Visibility />}
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="View CVs">
                          <IconButton 
                            size="small"
                            onClick={() => loadUserCVs(user.id)}
                            disabled={actionLoading === user.id}
                          >
                            <Description />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={user.is_active ? 'Deactivate User' : 'Activate User'}>
                          <IconButton 
                            size="small"
                            onClick={() => toggleUserActive(user.id, user.is_active)}
                            disabled={actionLoading === user.id}
                            color={user.is_active ? 'error' : 'success'}
                          >
                            {user.is_active ? <Block /> : <CheckCircleOutline />}
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="View Activities">
                          <IconButton 
                            size="small"
                            onClick={() => loadUserActivities(user.id)}
                            disabled={actionLoading === user.id}
                          >
                            <TrendingUp />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="View Errors">
                          <IconButton 
                            size="small"
                            onClick={() => loadUserErrors(user.id)}
                            disabled={actionLoading === user.id}
                            color="error"
                          >
                            <Block />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Contact User">
                          <IconButton 
                            size="small"
                            onClick={() => window.open(`mailto:${user.email}`, '_blank')}
                          >
                            <Email />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Impersonate User">
                          <IconButton 
                            size="small"
                            onClick={() => startImpersonation(user)}
                            disabled={actionLoading === user.id || !user.is_active}
                            color="warning"
                          >
                            <SwitchAccount />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* User Detail Dialog */}
      <UserDetailDialog
        open={userDetailOpen}
        onClose={() => setUserDetailOpen(false)}
        userDetail={selectedUser}
      />

      {/* User CVs Dialog */}
      <Dialog 
        open={userCVsOpen} 
        onClose={() => setUserCVsOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          User CVs
          {userCVs.length > 0 && (
            <Typography variant="body2" color="textSecondary">
              {userCVs.length} CV(s) found
            </Typography>
          )}
        </DialogTitle>
        <DialogContent>
          {userCVs.length === 0 ? (
            <Typography variant="body2" color="textSecondary" sx={{ textAlign: 'center', py: 4 }}>
              No CVs found for this user
            </Typography>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Filename</TableCell>
                    <TableCell>Size</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>AI Sections</TableCell>
                    <TableCell>Job Descriptions</TableCell>
                    <TableCell>Created</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {userCVs.map((cv) => (
                    <TableRow key={cv.id}>
                      <TableCell>
                        <Typography variant="body2" noWrap>
                          {cv.original_filename}
                        </Typography>
                      </TableCell>
                      <TableCell>{formatFileSize(cv.file_size)}</TableCell>
                      <TableCell>
                        <Chip label={cv.file_type} size="small" />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={cv.is_parsed ? 'Parsed' : 'Processing'}
                          color={cv.is_parsed ? 'success' : 'warning'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Badge badgeContent={cv.ai_sections_count} color="primary">
                          <SmartToy />
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge badgeContent={cv.job_descriptions_count} color="secondary">
                          <Description />
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {formatDate(cv.created_at)}
                      </TableCell>
                      <TableCell>
                        <Box display="flex" gap={1}>
                          <Tooltip title="View CV">
                            <IconButton size="small">
                              <Visibility />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Download">
                            <IconButton size="small">
                              <GetApp />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUserCVsOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* User Activities Dialog */}
      <UserActivitiesDialog
        open={activitiesOpen}
        onClose={() => setActivitiesOpen(false)}
        activities={userActivities}
        activitiesTotal={activitiesTotal}
        activitiesPage={activitiesPage}
        activitiesLimit={activitiesLimit}
        activityTypeFilter={activityTypeFilter}
        activitiesLoading={activitiesLoading}
        selectedUserId={selectedUserId}
        onPageChange={(page) => {
          setActivitiesPage(page)
          if (selectedUserId) {
            loadUserActivities(selectedUserId, page, activitiesLimit, activityTypeFilter)
          }
        }}
        onLimitChange={(limit) => {
          setActivitiesLimit(limit)
          if (selectedUserId) {
            loadUserActivities(selectedUserId, 0, limit, activityTypeFilter)
          }
        }}
        onFilterChange={(filter) => {
          setActivityTypeFilter(filter)
          if (selectedUserId) {
            loadUserActivities(selectedUserId, 0, activitiesLimit, filter)
          }
        }}
        formatDateTime={formatDateTime}
        onClearActivities={clearUserActivities}
        userEmail={users.find(user => user.id === selectedUserId)?.email}
      />

      {/* User Errors Dialog */}
      <UserErrorsDialog
        open={errorsOpen}
        onClose={() => setErrorsOpen(false)}
        errors={userErrors}
        formatDateTime={formatDateTime}
      />

      {/* Impersonation Confirmation Dialog */}
      <Dialog 
        open={impersonationDialogOpen} 
        onClose={() => setImpersonationDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Confirm User Impersonation
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 2 }}>
            <Alert severity="warning">
              You are about to impersonate user <strong>{impersonationTarget?.email}</strong>. 
              This action will be logged for audit purposes. The session will automatically 
              expire in 30 minutes.
            </Alert>
          </Box>
          
          <TextField
            fullWidth
            label="Justification (optional)"
            placeholder="Reason for impersonation..."
            value={impersonationJustification}
            onChange={(e) => setImpersonationJustification(e.target.value)}
            multiline
            rows={3}
            variant="outlined"
            sx={{ mt: 2 }}
          />
          
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            During impersonation:
          </Typography>
          <Box component="ul" sx={{ mt: 1, pl: 2 }}>
            <Typography component="li" variant="body2" color="text.secondary">
              You will see the application as this user
            </Typography>
            <Typography component="li" variant="body2" color="text.secondary">
              A banner will indicate you are impersonating
            </Typography>
            <Typography component="li" variant="body2" color="text.secondary">
              Admin functions will be disabled
            </Typography>
            <Typography component="li" variant="body2" color="text.secondary">
              All actions will be attributed to the target user
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => {
              setImpersonationDialogOpen(false)
              setImpersonationJustification('')
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={confirmImpersonation}
            variant="contained"
            color="warning"
            disabled={!impersonationTarget || actionLoading === impersonationTarget?.id}
            startIcon={actionLoading === impersonationTarget?.id ? <CircularProgress size={16} /> : <SwitchAccount />}
          >
            {actionLoading === impersonationTarget?.id ? 'Starting...' : 'Start Impersonation'}
          </Button>
        </DialogActions>
      </Dialog>

    </Container>
  )
}

export default AdminDashboard
