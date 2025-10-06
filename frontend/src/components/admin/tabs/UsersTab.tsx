/**
 * UsersTab - Admin dashboard users tab component
 * 
 * This component displays user management interface with search, filtering,
 * and user action capabilities.
 * 
 * Key responsibilities:
 * - Display user search and filtering controls
 * - Show users table with actions
 * - Handle user management operations
 * - Integrate with user action dialogs
 * 
 * Usage context:
 * - Used in admin dashboard as the second tab
 * - Integrates with useAdminUsers and useUserActions hooks
 * - Uses UserActionsMenu and various dialogs
 */

import React from 'react'
import {
  Box,
  Paper,
  Grid,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  Typography
} from '@mui/material'
import {
  Search,
  Refresh,
  CheckCircle,
  SwitchAccount
} from '@mui/icons-material'
import { UserSummary } from '../../../types/admin'
import { formatDate, formatDateTime } from '../../../utils/dateFormat'
import UserActionsMenu from '../UserActionsMenu'
import UserDetailDialog from '../UserDetailDialog'
import UserActivitiesDialog from '../UserActivitiesDialog'
import UserErrorsDialog from '../UserErrorsDialog'
import UserCVsDialog from '../UserCVsDialog'
import ImpersonationDialog from '../ImpersonationDialog'

interface UsersTabProps {
  users: UserSummary[]
  loading: boolean
  error: string | null
  filters: {
    searchTerm: string
    clerkFilter: string
    activeFilter: string
  }
  onFiltersChange: (filters: Partial<{
    searchTerm: string
    clerkFilter: string
    activeFilter: string
  }>) => void
  onRefresh: () => void
  onToggleUserActive: (userId: string, currentStatus: boolean) => Promise<void>
  onLoadUserDetail: (userId: string) => Promise<void>
  onLoadUserCVs: (userId: string) => Promise<void>
  onLoadUserActivities: (userId: string, page?: number, limit?: number, activityType?: string) => Promise<void>
  onLoadUserErrors: (userId: string) => Promise<void>
  onStartImpersonation: (user: UserSummary) => void
  onContactUser: (email: string) => void
  actionLoading: string | null
  selectedUser: any
  userDetailOpen: boolean
  onUserDetailClose: () => void
  userCVs: any[]
  userCVsOpen: boolean
  onUserCVsClose: () => void
  userActivities: any[]
  activitiesOpen: boolean
  onActivitiesClose: () => void
  activitiesTotal: number
  activitiesPage: number
  activitiesLimit: number
  activityTypeFilter: string
  activitiesLoading: boolean
  selectedUserId: string
  onActivitiesPageChange: (page: number) => void
  onActivitiesLimitChange: (limit: number) => void
  onActivityTypeFilterChange: (filter: string) => void
  onClearUserActivities: (userId: string) => Promise<void>
  userErrors: any[]
  errorsOpen: boolean
  onErrorsClose: () => void
  impersonationDialogOpen: boolean
  onImpersonationDialogClose: () => void
  impersonationTarget: UserSummary | null
  impersonationJustification: string
  onImpersonationJustificationChange: (justification: string) => void
  onConfirmImpersonation: () => Promise<void>
}

const UsersTab: React.FC<UsersTabProps> = ({
  users,
  loading,
  error,
  filters,
  onFiltersChange,
  onRefresh,
  onToggleUserActive,
  onLoadUserDetail,
  onLoadUserCVs,
  onLoadUserActivities,
  onLoadUserErrors,
  onStartImpersonation,
  onContactUser,
  actionLoading,
  selectedUser,
  userDetailOpen,
  onUserDetailClose,
  userCVs,
  userCVsOpen,
  onUserCVsClose,
  userActivities,
  activitiesOpen,
  onActivitiesClose,
  activitiesTotal,
  activitiesPage,
  activitiesLimit,
  activityTypeFilter,
  activitiesLoading,
  selectedUserId,
  onActivitiesPageChange,
  onActivitiesLimitChange,
  onActivityTypeFilterChange,
  onClearUserActivities,
  userErrors,
  errorsOpen,
  onErrorsClose,
  impersonationDialogOpen,
  onImpersonationDialogClose,
  impersonationTarget,
  impersonationJustification,
  onImpersonationJustificationChange,
  onConfirmImpersonation
}) => {
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              placeholder="Search users..."
              value={filters.searchTerm}
              onChange={(e) => onFiltersChange({ searchTerm: e.target.value })}
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
                value={filters.clerkFilter}
                onChange={(e) => onFiltersChange({ clerkFilter: e.target.value })}
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
                value={filters.activeFilter}
                onChange={(e) => onFiltersChange({ activeFilter: e.target.value })}
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
              onClick={onRefresh}
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
                  <Box display="flex" gap={1} alignItems="center">
                    <Tooltip title="Impersonate User">
                      <IconButton 
                        size="small"
                        onClick={() => onStartImpersonation(user)}
                        disabled={actionLoading === user.id || !user.is_active}
                        color="warning"
                      >
                        <SwitchAccount />
                      </IconButton>
                    </Tooltip>
                    <UserActionsMenu
                      user={user}
                      actionLoading={actionLoading}
                      onViewDetails={onLoadUserDetail}
                      onViewCVs={onLoadUserCVs}
                      onToggleActive={onToggleUserActive}
                      onViewActivities={onLoadUserActivities}
                      onViewErrors={onLoadUserErrors}
                      onContactUser={onContactUser}
                    />
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Dialogs */}
      <UserDetailDialog
        open={userDetailOpen}
        onClose={onUserDetailClose}
        userDetail={selectedUser}
      />

      <UserCVsDialog
        open={userCVsOpen}
        onClose={onUserCVsClose}
        userCVs={userCVs}
      />

      <UserActivitiesDialog
        open={activitiesOpen}
        onClose={onActivitiesClose}
        activities={userActivities}
        activitiesTotal={activitiesTotal}
        activitiesPage={activitiesPage}
        activitiesLimit={activitiesLimit}
        activityTypeFilter={activityTypeFilter}
        activitiesLoading={activitiesLoading}
        selectedUserId={selectedUserId}
        onPageChange={onActivitiesPageChange}
        onLimitChange={onActivitiesLimitChange}
        onFilterChange={onActivityTypeFilterChange}
        formatDateTime={formatDateTime}
        onClearActivities={onClearUserActivities}
        userEmail={users.find(user => user.id === selectedUserId)?.email}
      />

      <UserErrorsDialog
        open={errorsOpen}
        onClose={onErrorsClose}
        errors={userErrors}
        formatDateTime={formatDateTime}
      />

      <ImpersonationDialog
        open={impersonationDialogOpen}
        onClose={onImpersonationDialogClose}
        target={impersonationTarget}
        justification={impersonationJustification}
        onJustificationChange={onImpersonationJustificationChange}
        onConfirm={onConfirmImpersonation}
        loading={actionLoading === impersonationTarget?.id}
      />
    </Box>
  )
}

export default UsersTab
