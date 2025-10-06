/**
 * AIUsageTab - Admin dashboard AI usage tab component
 * 
 * This component displays AI usage statistics, charts, and management tools.
 * Shows usage data, charts, top users, and logs with filtering capabilities.
 * 
 * Key responsibilities:
 * - Display AI usage statistics and charts
 * - Show date range controls and filters
 * - Display top users and usage logs
 * - Handle export and delete operations
 * 
 * Usage context:
 * - Used in admin dashboard as the third tab
 * - Integrates with useAIUsageData hook
 * - Uses various AI usage components
 */

import React from 'react'
import {
  Box,
  Paper,
  Grid,
  Typography,
  Button,
  Alert,
  CircularProgress
} from '@mui/material'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { Refresh, Delete, GetApp } from '@mui/icons-material'
import dayjs from 'dayjs'
import { 
  SystemAIStats, 
  UserAIUsage, 
  OperationAIUsage, 
  TimelineData, 
  PaginatedAIUsageLogs, 
  AIUsageFilters 
} from '../../../types/admin'
import AIUsageStatsCards from '../AIUsageStatsCards'
import AIUsageTimelineChart from '../AIUsageTimelineChart'
import AIOperationBreakdownChart from '../AIOperationBreakdownChart'
import AITopUsersTable from '../AITopUsersTable'
import AIUsageLogsTable from '../AIUsageLogsTable'
import DeleteConfirmationDialog from '../DeleteConfirmationDialog'

interface AIUsageTabProps {
  aiStats: SystemAIStats | null
  aiUserUsage: UserAIUsage[]
  aiOperationUsage: OperationAIUsage[]
  aiTimeline: TimelineData[]
  aiLogs: PaginatedAIUsageLogs | null
  loading: boolean
  error: string | null
  dateRange: { start: string; end: string }
  granularity: 'day' | 'week' | 'month' | 'hour'
  filters: AIUsageFilters
  logsPage: number
  logsLimit: number
  onDateRangeChange: (start: string, end: string) => void
  onGranularityChange: (granularity: 'day' | 'week' | 'month' | 'hour') => void
  onFilterChange: (filters: Partial<AIUsageFilters>) => void
  onClearAllFilters: () => void
  onRefresh: () => void
  onUserClick: (userId: string) => void
  onPaginationChange: (page: number, rowsPerPage: number) => void
  onExportLogs: () => Promise<void>
  onExportAllLogs: () => Promise<void>
  onDeleteAllLogs: () => Promise<void>
  deleteAllDialogOpen: boolean
  onDeleteAllDialogClose: () => void
  onDeleteAllDialogOpen: () => void
  isDeleting: boolean
}

const AIUsageTab: React.FC<AIUsageTabProps> = ({
  aiStats,
  aiUserUsage,
  aiOperationUsage,
  aiTimeline,
  aiLogs,
  loading,
  error,
  dateRange,
  granularity,
  filters,
  onDateRangeChange,
  onGranularityChange,
  onFilterChange,
  onClearAllFilters,
  onRefresh,
  onUserClick,
  onPaginationChange,
  onExportLogs,
  onExportAllLogs,
  onDeleteAllLogs,
  deleteAllDialogOpen,
  onDeleteAllDialogClose,
  onDeleteAllDialogOpen,
  isDeleting
}) => {
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box>
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Date Range Controls */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={3}>
              <DatePicker
                label="Start Date"
                value={dayjs(dateRange.start)}
                onChange={(date) => {
                  if (date) {
                    onDateRangeChange(dayjs(date).format('YYYY-MM-DD'), dateRange.end)
                  }
                }}
                slotProps={{ textField: { fullWidth: true } }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <DatePicker
                label="End Date"
                value={dayjs(dateRange.end)}
                onChange={(date) => {
                  if (date) {
                    onDateRangeChange(dateRange.start, dayjs(date).format('YYYY-MM-DD'))
                  }
                }}
                slotProps={{ textField: { fullWidth: true } }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<Refresh />}
                onClick={onRefresh}
                disabled={loading}
              >
                Refresh
              </Button>
            </Grid>
          </Grid>
        </Paper>

        {/* AI Usage Actions */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">
              AI Usage Data Management
            </Typography>
            <Box display="flex" gap={1}>
              <Button
                variant="outlined"
                color="error"
                startIcon={<Delete />}
                onClick={onDeleteAllDialogOpen}
                disabled={loading || isDeleting}
                size="small"
              >
                Delete All Data
              </Button>
              <Button
                variant="outlined"
                startIcon={<GetApp />}
                onClick={onExportAllLogs}
                disabled={loading}
                size="small"
              >
                Export All Data
              </Button>
            </Box>
          </Box>
        </Paper>

        {/* AI Usage Statistics Cards */}
        <AIUsageStatsCards stats={aiStats} loading={loading} />

        {/* Charts Row */}
        <Grid container spacing={3} sx={{ mt: 2 }}>
          <Grid item xs={12} lg={8}>
            <AIUsageTimelineChart 
              data={aiTimeline} 
              loading={loading} 
              granularity={granularity}
              onGranularityChange={onGranularityChange}
            />
          </Grid>
          <Grid item xs={12} lg={4}>
            <AIOperationBreakdownChart 
              data={aiOperationUsage} 
              loading={loading}
            />
          </Grid>
        </Grid>

        {/* Top Users Table */}
        <Box sx={{ mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            Top AI Users
          </Typography>
          <AITopUsersTable 
            users={aiUserUsage} 
            loading={loading}
            onUserClick={onUserClick}
          />
        </Box>

        {/* AI Usage Logs Table */}
        <Box sx={{ mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            AI Usage Logs
          </Typography>
          
          {filters.user_id && (
            <Alert 
              severity="info" 
              sx={{ mb: 2 }}
              action={
                <Button 
                  color="inherit" 
                  size="small" 
                  onClick={() => onFilterChange({ user_id: undefined })}
                >
                  Clear User Filter
                </Button>
              }
            >
              Showing logs for user: {aiUserUsage.find(u => u.user_id === filters.user_id)?.email || filters.user_id}
            </Alert>
          )}
          
          <AIUsageLogsTable
            data={aiLogs}
            loading={loading}
            filters={filters}
            onFilterChange={onFilterChange}
            onPaginationChange={onPaginationChange}
            onRefresh={onRefresh}
            onClearAllFilters={onClearAllFilters}
            onExport={onExportLogs}
            availableUsers={aiUserUsage.map(user => ({
              user_id: user.user_id,
              email: user.email
            }))}
          />
        </Box>

        {/* Delete Confirmation Dialog */}
        <DeleteConfirmationDialog
          open={deleteAllDialogOpen}
          onClose={onDeleteAllDialogClose}
          onConfirm={onDeleteAllLogs}
          loading={loading || isDeleting}
          title="Delete All AI Usage Data"
          message="This will permanently delete ALL AI usage logs from the system. This action cannot be undone!"
          confirmText="DELETE ALL"
        />
      </Box>
    </LocalizationProvider>
  )
}

export default AIUsageTab
