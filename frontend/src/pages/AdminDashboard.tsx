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
  Divider,
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
  GetApp
} from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'
import { formatDate, formatDateTime } from '../utils/dateFormat'

// Types
interface SystemStats {
  total_users: number
  active_users: number
  clerk_users: number
  legacy_users: number
  total_cvs: number
  total_ai_sections: number
  total_job_descriptions: number
  users_last_7_days: number
  users_last_30_days: number
  cvs_last_7_days: number
  cvs_last_30_days: number
}

interface UserSummary {
  id: string
  clerk_id: string | null
  email: string
  is_active: boolean
  email_verified: boolean
  created_at: string
  updated_at: string
  last_login: string | null
  cv_count: number
  ai_sections_count: number
  is_clerk_user: boolean
}

interface UserDetail {
  id: string
  clerk_id: string | null
  email: string
  is_active: boolean
  email_verified: boolean
  created_at: string
  updated_at: string
  last_login: string | null
  cvs: Array<{
    id: string
    original_filename: string
    file_size: number
    file_type: string
    is_parsed: boolean
    created_at: string
    updated_at: string
  }>
  ai_sections_count: number
  job_descriptions_count: number
}

interface UserCV {
  id: string
  original_filename: string
  file_size: number
  file_type: string
  is_parsed: boolean
  parsing_status: string
  ai_sections_count: number
  job_descriptions_count: number
  created_at: string
  updated_at: string
}

const AdminDashboard: React.FC = () => {
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
  
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()

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
        <Tabs value={currentTab} onChange={(_, newValue) => setCurrentTab(newValue)}>
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
                        <Tooltip title="Contact User">
                          <IconButton 
                            size="small"
                            onClick={() => window.open(`mailto:${user.email}`, '_blank')}
                          >
                            <Email />
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
      <Dialog 
        open={userDetailOpen} 
        onClose={() => setUserDetailOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          User Details
          {selectedUser && (
            <Typography variant="body2" color="textSecondary">
              {selectedUser.email}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent>
          {selectedUser && (
            <Box>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="textSecondary">User ID</Typography>
                  <Typography variant="body2">{selectedUser.id}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="textSecondary">Clerk ID</Typography>
                  <Typography variant="body2">{selectedUser.clerk_id || 'N/A'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="textSecondary">Status</Typography>
                  <Chip
                    label={selectedUser.is_active ? 'Active' : 'Inactive'}
                    color={selectedUser.is_active ? 'success' : 'error'}
                    size="small"
                  />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="textSecondary">Email Verified</Typography>
                  <Chip
                    label={selectedUser.email_verified ? 'Verified' : 'Unverified'}
                    color={selectedUser.email_verified ? 'success' : 'warning'}
                    size="small"
                  />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="textSecondary">Created</Typography>
                  <Typography variant="body2">
                    {formatDateTime(selectedUser.created_at)}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="textSecondary">Last Login</Typography>
                  <Typography variant="body2">
                    {selectedUser.last_login 
                      ? formatDate(selectedUser.last_login)
                      : 'Never'
                    }
                  </Typography>
                </Grid>
              </Grid>

              <Divider sx={{ my: 2 }} />

              <Typography variant="h6" gutterBottom>Activity Summary</Typography>
              <Grid container spacing={2}>
                <Grid item xs={4}>
                  <Card variant="outlined">
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Typography variant="h4">{selectedUser.cvs.length}</Typography>
                      <Typography variant="body2" color="textSecondary">CVs</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={4}>
                  <Card variant="outlined">
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Typography variant="h4">{selectedUser.ai_sections_count}</Typography>
                      <Typography variant="body2" color="textSecondary">AI Sections</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={4}>
                  <Card variant="outlined">
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Typography variant="h4">{selectedUser.job_descriptions_count}</Typography>
                      <Typography variant="body2" color="textSecondary">Job Descriptions</Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUserDetailOpen(false)}>Close</Button>
          {selectedUser && (
            <Button
              variant="contained"
              startIcon={<Email />}
              onClick={() => window.open(`mailto:${selectedUser.email}`, '_blank')}
            >
              Contact User
            </Button>
          )}
        </DialogActions>
      </Dialog>

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
    </Container>
  )
}

export default AdminDashboard
