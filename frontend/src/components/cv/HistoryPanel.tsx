/**
 * History Panel Component
 * 
 * This component provides the UI for CV version history including:
 * - Timeline view of all snapshots
 * - Version comparison and preview
 * - Restore functionality
 * - Manual snapshot creation
 * - History management (delete, clear)
 */

import React, { useState, useMemo } from 'react'
import {
  Box,
  Drawer,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Tooltip,
  Alert,
  CircularProgress
} from '@mui/material'
import {
  Close as CloseIcon,
  History as HistoryIcon,
  Restore as RestoreIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  CompareArrows as CompareArrowsIcon
} from '@mui/icons-material'

import { 
  CVHistoryEntry, 
  HistoryPanelProps,
  CreateSnapshotOptions,
  HistoryStats
} from '../../types'
import { formatRelativeTime, formatDateTimeWithSeconds, formatDateGroupHeader } from '../../utils/dateFormat'
import { getErrorDisplayMessage } from '../../utils/errorHandling'
import LoadingState from '../common/LoadingState'

const DRAWER_WIDTH = 400

interface HistoryPanelState {
  createSnapshotDialog: boolean
  restoreConfirmDialog: boolean
  deleteConfirmDialog: boolean
  selectedEntry: CVHistoryEntry | null
  snapshotLabel: string
  snapshotDescription: string
  loading: boolean
  error: string | null
}

interface ExtendedHistoryPanelProps extends HistoryPanelProps {
  historyEntries: CVHistoryEntry[]
  historyStats: HistoryStats
  onDeleteEntry?: (entry: CVHistoryEntry) => Promise<void>
  loading?: boolean
}

const HistoryPanel: React.FC<ExtendedHistoryPanelProps> = ({
  isOpen,
  onClose,
  onPreviewVersion,
  onRestoreVersion,
  onCreateSnapshot,
  historyEntries,
  historyStats,
  onDeleteEntry,
  loading: externalLoading = false
}) => {
  const [state, setState] = useState<HistoryPanelState>({
    createSnapshotDialog: false,
    restoreConfirmDialog: false,
    deleteConfirmDialog: false,
    selectedEntry: null,
    snapshotLabel: '',
    snapshotDescription: '',
    loading: false,
    error: null
  })

  // History data is passed as props

  const updateState = (updates: Partial<HistoryPanelState>) => {
    setState(prev => ({ ...prev, ...updates }))
  }

  // Group entries by date for better organization
  const groupedEntries = useMemo(() => {
    const groups: { [key: string]: CVHistoryEntry[] } = {}
    
    historyEntries.forEach(entry => {
      const date = new Date(entry.timestamp).toDateString()
      if (!groups[date]) {
        groups[date] = []
      }
      groups[date].push(entry)
    })

    return Object.entries(groups).sort(([a], [b]) => 
      new Date(b).getTime() - new Date(a).getTime()
    )
  }, [historyEntries])

  // Find the oldest entry (first version) to disable its diff button
  const oldestEntry = useMemo(() => {
    if (historyEntries.length === 0) return null
    return historyEntries.reduce((oldest, current) => 
      new Date(current.timestamp) < new Date(oldest.timestamp) ? current : oldest
    )
  }, [historyEntries])

  const handleCreateSnapshot = async () => {
    updateState({ loading: true, error: null })
    
    try {
      const options: CreateSnapshotOptions = {
        changeType: 'restore_point',
        description: state.snapshotDescription || 'Manual snapshot',
        label: state.snapshotLabel || undefined,
        force: true
      }
      
      await onCreateSnapshot(options)
      updateState({ 
        createSnapshotDialog: false,
        snapshotLabel: '',
        snapshotDescription: '',
        loading: false
      })
    } catch (error) {
      updateState({ 
        loading: false,
        error: getErrorDisplayMessage(error)
      })
    }
  }

  const handleRestoreVersion = async () => {
    if (!state.selectedEntry) return
    
    updateState({ loading: true, error: null })
    
    try {
      await onRestoreVersion(state.selectedEntry)
      updateState({ 
        restoreConfirmDialog: false,
        selectedEntry: null,
        loading: false
      })
    } catch (error) {
      updateState({ 
        loading: false,
        error: getErrorDisplayMessage(error)
      })
    }
  }

  const handlePreviewClick = (entry: CVHistoryEntry) => {
    if (onPreviewVersion) {
      onPreviewVersion(entry)
    }
  }

  const handleDeleteClick = (entry: CVHistoryEntry) => {
    updateState({ 
      selectedEntry: entry,
      deleteConfirmDialog: true
    })
  }

  const handleConfirmDelete = async () => {
    if (!state.selectedEntry) return
    
    updateState({ loading: true, error: null })
    
    try {
      // Use the onDeleteEntry prop if provided, otherwise use a default implementation
      if (onDeleteEntry) {
        await onDeleteEntry(state.selectedEntry)
      }
      
      updateState({ 
        deleteConfirmDialog: false,
        selectedEntry: null,
        loading: false
      })
    } catch (error) {
      updateState({ 
        loading: false,
        error: getErrorDisplayMessage(error)
      })
    }
  }




  return (
    <Drawer
      anchor="right"
      open={isOpen}
      onClose={onClose}
      variant="temporary"
      sx={{
        '& .MuiDrawer-paper': {
          width: DRAWER_WIDTH,
          boxSizing: 'border-box'
        }
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Header */}
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <HistoryIcon />
              <Typography variant="h6">Your CV's Evolution</Typography>
            </Box>
            <IconButton onClick={onClose} size="small">
              <CloseIcon />
            </IconButton>
          </Box>

        </Box>

        {/* Error Display */}
        {state.error && (
          <Box sx={{ px: 2, pb: 1 }}>
            <Alert 
              severity="error" 
              onClose={() => updateState({ error: null })}
              sx={{ mb: 1 }}
            >
              {state.error}
            </Alert>
          </Box>
        )}

        {/* Retention Policy Info */}
        <Box sx={{ px: 2, pb: 1 }}>
          <Typography variant="caption" color="text.secondary">
            Only the most recent 50 versions are kept. The original version is always preserved.
          </Typography>
        </Box>

        {/* History List */}
        <Box sx={{ flex: 1, overflow: 'auto' }}>
          {(state.loading || externalLoading) ? (
            <LoadingState message="Loading history..." />
          ) : historyEntries.length === 0 ? (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <HistoryIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
              <Typography variant="body2" color="text.secondary">
                No version history yet
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Versions will appear here as you edit your CV
              </Typography>
            </Box>
          ) : (
            <>
              {/* Add New Version Entry */}
              <List dense>
                <ListItem
                  button
                  onClick={() => updateState({ createSnapshotDialog: true })}
                  disabled={state.loading}
                  sx={{
                    borderLeft: 3,
                    borderColor: 'primary.main',
                    bgcolor: 'primary.50',
                    mb: 1,
                    mx: 1,
                    borderRadius: 1,
                    '&:hover': {
                      bgcolor: 'primary.100'
                    },
                    '&:disabled': {
                      bgcolor: 'grey.100'
                    }
                  }}
                >
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <AddIcon color="primary" />
                        <Typography variant="body2" sx={{ fontWeight: 500, color: 'primary.main' }}>
                          Save Current Version
                        </Typography>
                      </Box>
                    }
                    secondary={
                      <Typography variant="caption" color="text.secondary">
                        Create a snapshot of your current CV state
                      </Typography>
                    }
                  />
                </ListItem>
              </List>
              
              {/* Actual History Entries */}
              {groupedEntries.map(([date, entries]) => (
              <Box key={date}>
                <Box sx={{ px: 2, py: 1, bgcolor: 'grey.50' }}>
                  <Typography variant="caption" color="text.secondary" fontWeight="medium">
                    {formatDateGroupHeader(date)}
                  </Typography>
                </Box>
                
                <List dense>
                  {entries.map((entry, index) => (
                    <ListItem
                      key={entry.id}
                      sx={{
                        borderLeft: 3,
                        borderColor: entry.isInitial ? 'success.main' : entry.isAutomatic ? 'grey.300' : 'primary.main',
                        bgcolor: index === 0 ? 'action.hover' : entry.isInitial ? 'success.50' : 'transparent',
                        '&:hover': {
                          bgcolor: 'action.hover'
                        }
                      }}
                    >
                      <ListItemText
                        primary={
                          <React.Fragment>
                            <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, mr: 1 }}>
                              <Typography 
                                component="span" 
                                variant="body2" 
                                fontWeight={index === 0 ? 'bold' : 'normal'}
                              >
                                #{historyEntries.length - index} {entry.label || entry.description}
                              </Typography>
                            </Box>
                            {index === 0 && (
                              <Chip size="small" label="Current" color="success" />
                            )}
                            {entry.isInitial && (
                              <Chip size="small" label="Original" color="warning" variant="filled" />
                            )}
                          </React.Fragment>
                        }
                        secondary={
                          <React.Fragment>
                            <Tooltip title={formatDateTimeWithSeconds(entry.timestamp)}>
                              <Typography component="span" variant="caption" color="text.secondary" sx={{ cursor: 'help' }}>
                                {formatRelativeTime(entry.timestamp)}
                              </Typography>
                            </Tooltip>
                            {entry.label && (
                              <Typography component="span" variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                {entry.description}
                              </Typography>
                            )}
                          </React.Fragment>
                        }
                      />
                      
                      <ListItemSecondaryAction>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          {/* Delete Button - Not visible for current version or initial version */}
                          {index > 0 && !entry.isInitial && (
                            <Tooltip title={`Delete this version${entry.label ? ` (${entry.label})` : ''}`}>
                              <span>
                                <IconButton
                                  size="small"
                                  onClick={() => handleDeleteClick(entry)}
                                  disabled={state.loading}
                                  color="error"
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </span>
                            </Tooltip>
                          )}

                          {/* Diff Button - Disabled for first version */}
                          <Tooltip title={
                            oldestEntry?.id === entry.id 
                              ? "No previous version to compare against" 
                              : "Show diff from previous version"
                          }>
                            <span>
                              <IconButton
                                size="small"
                                onClick={() => handlePreviewClick(entry)}
                                disabled={state.loading || oldestEntry?.id === entry.id}
                              >
                                <CompareArrowsIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>

                          {/* Restore Button - Not visible for current version */}
                          {index > 0 && (
                            <Tooltip title={entry.isInitial ? "Reset to original version" : "Restore this version"}>
                              <span>
                                <IconButton
                                  size="small"
                                  onClick={() => updateState({ 
                                    selectedEntry: entry,
                                    restoreConfirmDialog: true
                                  })}
                                  disabled={state.loading}
                                  color={entry.isInitial ? "warning" : "default"}
                                >
                                  <RestoreIcon fontSize="small" />
                                </IconButton>
                              </span>
                            </Tooltip>
                          )}
                        </Box>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              </Box>
            ))}
            </>
          )}
        </Box>

        {/* Loading overlay */}
        {state.loading && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              bgcolor: 'rgba(255, 255, 255, 0.8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000
            }}
          >
            <CircularProgress />
          </Box>
        )}
      </Box>


      {/* Create Snapshot Dialog */}
      <Dialog
        open={state.createSnapshotDialog}
        onClose={() => updateState({ createSnapshotDialog: false })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Save Current Version</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Version Label (optional)"
            fullWidth
            variant="outlined"
            value={state.snapshotLabel}
            onChange={(e) => updateState({ snapshotLabel: e.target.value })}
            placeholder="e.g., Before applying to Google"
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Description (optional)"
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            value={state.snapshotDescription}
            onChange={(e) => updateState({ snapshotDescription: e.target.value })}
            placeholder="Describe what changes you made..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => updateState({ createSnapshotDialog: false })}>
            Cancel
          </Button>
          <Button 
            onClick={handleCreateSnapshot}
            variant="contained"
            disabled={state.loading}
          >
            Save Version
          </Button>
        </DialogActions>
      </Dialog>

      {/* Restore Confirmation Dialog */}
      <Dialog
        open={state.restoreConfirmDialog}
        onClose={() => updateState({ restoreConfirmDialog: false })}
      >
        <DialogTitle>
          {state.selectedEntry?.isInitial ? "Reset to Original Version?" : "Restore Version?"}
        </DialogTitle>
        <DialogContent>
          <Alert severity={state.selectedEntry?.isInitial ? "info" : "warning"} sx={{ mb: 2 }}>
            {state.selectedEntry?.isInitial ? (
              "This will reset your CV back to its original state when it was first uploaded. A backup of your current version will be created automatically."
            ) : (
              "This will replace your current CV with the selected version. A backup of your current version will be created automatically."
            )}
          </Alert>
          {state.selectedEntry && (
            <Box>
              <Typography variant="body2" gutterBottom>
                <strong>{state.selectedEntry.isInitial ? "Resetting to:" : "Restoring to:"}</strong> {state.selectedEntry.label || state.selectedEntry.description}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Created {formatRelativeTime(state.selectedEntry.timestamp)}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => updateState({ restoreConfirmDialog: false })}>
            Cancel
          </Button>
          <Button 
            onClick={handleRestoreVersion}
            color={state.selectedEntry?.isInitial ? "warning" : "warning"}
            variant="contained"
            disabled={state.loading}
          >
            {state.selectedEntry?.isInitial ? "Reset to Original" : "Restore Version"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={state.deleteConfirmDialog}
        onClose={() => updateState({ deleteConfirmDialog: false })}
      >
        <DialogTitle>Delete Version?</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            This action cannot be undone. The version will be permanently deleted.
          </Alert>
          {state.selectedEntry && (
            <Box>
              <Typography variant="body2" gutterBottom>
                <strong>Deleting:</strong> {state.selectedEntry.label || state.selectedEntry.description}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Created {formatRelativeTime(state.selectedEntry.timestamp)}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => updateState({ deleteConfirmDialog: false })}>
            Cancel
          </Button>
          <Button 
            onClick={handleConfirmDelete}
            color="error"
            variant="contained"
            disabled={state.loading}
          >
            Delete Version
          </Button>
        </DialogActions>
      </Dialog>

    </Drawer>
  )
}

export default HistoryPanel


