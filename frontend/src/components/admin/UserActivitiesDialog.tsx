/**
 * User Activities Dialog Component
 * 
 * This component displays user activities in a paginated dialog with filtering options.
 * It provides a scalable interface for viewing user activity logs with proper pagination
 * and filtering capabilities.
 */
import React, { useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Chip,
  CircularProgress,
  Button,
  Pagination,
  Alert,
  IconButton,
  Tooltip
} from '@mui/material'
import { DeleteSweep } from '@mui/icons-material'

interface UserActivity {
  id: string
  activity_type: string
  action: string
  description: string
  page_url: string
  timestamp: string
}

interface UserActivitiesDialogProps {
  open: boolean
  onClose: () => void
  activities: UserActivity[]
  activitiesTotal: number
  activitiesPage: number
  activitiesLimit: number
  activityTypeFilter: string
  activitiesLoading: boolean
  selectedUserId: string
  onPageChange: (page: number) => void
  onLimitChange: (limit: number) => void
  onFilterChange: (filter: string) => void
  formatDateTime: (date: string) => string
  onClearActivities?: (userId: string) => Promise<void>
  userEmail?: string
}

const UserActivitiesDialog: React.FC<UserActivitiesDialogProps> = ({
  open,
  onClose,
  activities,
  activitiesTotal,
  activitiesPage,
  activitiesLimit,
  activityTypeFilter,
  activitiesLoading,
  selectedUserId,
  onPageChange,
  onLimitChange,
  onFilterChange,
  formatDateTime,
  onClearActivities,
  userEmail
}) => {
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false)
  const [clearing, setClearing] = useState(false)

  const handleClearActivities = async () => {
    if (!onClearActivities || !selectedUserId) return

    try {
      setClearing(true)
      await onClearActivities(selectedUserId)
      setClearConfirmOpen(false)
    } catch (error) {
      // Error handling is done in the parent component
    } finally {
      setClearing(false)
    }
  }

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        style: { maxHeight: '90vh' },
        sx: {
          height: '90vh',
          display: 'flex',
          flexDirection: 'column'
        }
      }}
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="h6">User Activities</Typography>
            {userEmail && (
              <Typography variant="body2" color="textSecondary">
                {userEmail}
              </Typography>
            )}
            {activitiesTotal > 0 && (
              <Typography variant="body2" color="textSecondary">
                {activitiesTotal} total activities found (Page {activitiesPage + 1} of {Math.max(1, Math.ceil(activitiesTotal / activitiesLimit))})
              </Typography>
            )}
          </Box>
          {onClearActivities && activitiesTotal > 0 && (
            <Tooltip title="Clear Activity Log">
              <IconButton 
                onClick={() => setClearConfirmOpen(true)}
                disabled={clearing}
                color="error"
                size="small"
              >
                {clearing ? <CircularProgress size={20} /> : <DeleteSweep />}
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </DialogTitle>
      <DialogContent sx={{ 
        flex: 1, 
        overflow: 'hidden', 
        display: 'flex', 
        flexDirection: 'column',
        pt: 3, 
        position: 'relative' 
      }}>
        {/* Filter Controls and Top Pagination */}
        <Box sx={{ mb: 2, display: 'flex', gap: 2, alignItems: 'flex-start', pt: 1, flexWrap: 'wrap' }}>
          <FormControl size="small" sx={{ minWidth: 150, mt: 0.5 }}>
            <InputLabel id="activity-type-label" shrink>Activity Type</InputLabel>
            <Select
              labelId="activity-type-label"
              value={activityTypeFilter}
              onChange={(e) => onFilterChange(e.target.value)}
              label="Activity Type"
            >
              <MenuItem value="">All Types</MenuItem>
              <MenuItem value="page_view">Page View</MenuItem>
              <MenuItem value="user_action">User Action</MenuItem>
              <MenuItem value="api_call">API Call</MenuItem>
              <MenuItem value="error">Error</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 100, mt: 0.5 }}>
            <InputLabel id="per-page-label" shrink>Per Page</InputLabel>
            <Select
              labelId="per-page-label"
              value={activitiesLimit}
              onChange={(e) => onLimitChange(Number(e.target.value))}
              label="Per Page"
            >
              <MenuItem value={25}>25</MenuItem>
              <MenuItem value={50}>50</MenuItem>
              <MenuItem value={100}>100</MenuItem>
              <MenuItem value={200}>200</MenuItem>
            </Select>
          </FormControl>
          
          {/* Top Pagination - Only show if there are multiple pages */}
          {Math.ceil(activitiesTotal / activitiesLimit) > 1 && (
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 2,
              ml: 'auto',
              mt: 0.5
            }}>
              <Typography variant="body2" color="textSecondary">
                Page {activitiesPage + 1} of {Math.ceil(activitiesTotal / activitiesLimit)}
              </Typography>
              <Pagination
                count={Math.ceil(activitiesTotal / activitiesLimit)}
                page={activitiesPage + 1}
                onChange={(_, page) => onPageChange(page - 1)}
                color="primary"
                showFirstButton
                showLastButton
                size="small"
              />
            </Box>
          )}
        </Box>

        {activitiesLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : activities.length === 0 ? (
          <Typography variant="body2" color="textSecondary" sx={{ textAlign: 'center', py: 4 }}>
            No activities found for this user
          </Typography>
        ) : (
          <>
            <TableContainer sx={{ flex: 1, overflow: 'auto' }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Type</TableCell>
                    <TableCell>Action</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell>Page</TableCell>
                    <TableCell>Timestamp</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {activities.map((activity) => (
                    <TableRow key={activity.id}>
                      <TableCell>
                        <Chip label={activity.activity_type} size="small" />
                      </TableCell>
                      <TableCell>{activity.action}</TableCell>
                      <TableCell>
                        <Typography variant="body2" noWrap>
                          {activity.description || 'N/A'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" noWrap>
                          {activity.page_url || 'N/A'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {formatDateTime(activity.timestamp)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            
            {/* Bottom Pagination - Sticky at bottom */}
            <Box sx={{ 
              position: 'sticky',
              bottom: 0,
              backgroundColor: 'background.paper',
              borderTop: '1px solid #e0e0e0',
              mt: 2,
              pt: 2,
              pb: 1,
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 2
            }}>
              <Typography variant="body2" color="textSecondary">
                Showing {activitiesPage * activitiesLimit + 1}-{Math.min((activitiesPage + 1) * activitiesLimit, activitiesTotal)} of {activitiesTotal} activities
              </Typography>
              {Math.ceil(activitiesTotal / activitiesLimit) > 1 && (
                <Pagination
                  count={Math.ceil(activitiesTotal / activitiesLimit)}
                  page={activitiesPage + 1}
                  onChange={(_, page) => onPageChange(page - 1)}
                  color="primary"
                  showFirstButton
                  showLastButton
                  size="small"
                />
              )}
            </Box>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>

      {/* Clear Activities Confirmation Dialog */}
      <Dialog 
        open={clearConfirmOpen} 
        onClose={() => setClearConfirmOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Clear Activity Log
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 2 }}>
            <Alert severity="warning">
              You are about to permanently delete all activity logs for user <strong>{userEmail}</strong>. 
              This action cannot be undone and will remove all historical activity data for this user.
            </Alert>
          </Box>
          
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            This will delete:
          </Typography>
          <Box component="ul" sx={{ mt: 1, pl: 2 }}>
            <Typography component="li" variant="body2" color="text.secondary">
              All page views and user interactions
            </Typography>
            <Typography component="li" variant="body2" color="text.secondary">
              All API call logs and error records
            </Typography>
            <Typography component="li" variant="body2" color="text.secondary">
              All session tracking data
            </Typography>
            <Typography component="li" variant="body2" color="text.secondary">
              All debugging and support information
            </Typography>
          </Box>
          
          <Typography variant="body2" color="error.main" sx={{ mt: 2, fontWeight: 'bold' }}>
            This action is irreversible. Are you sure you want to proceed?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setClearConfirmOpen(false)}
            disabled={clearing}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleClearActivities}
            variant="contained"
            color="error"
            disabled={clearing}
            startIcon={clearing ? <CircularProgress size={16} /> : <DeleteSweep />}
          >
            {clearing ? 'Clearing...' : 'Clear Activity Log'}
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  )
}

export default UserActivitiesDialog
