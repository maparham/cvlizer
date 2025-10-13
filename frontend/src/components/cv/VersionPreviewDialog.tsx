/**
 * Version Preview Dialog Component
 *
 * This component provides a dialog for previewing CV version changes
 * with semantic diff viewing and restore options.
 */

import React, { useMemo, useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
  Tabs,
  Tab
} from '@mui/material'
import {
  Close as CloseIcon,
  Restore as RestoreIcon,
  History as HistoryIcon,
  CompareArrows as CompareArrowsIcon
} from '@mui/icons-material'

import { CVHistoryEntry } from '../../types'
import SimpleCVDiffViewer from './SimpleCVDiffViewer'

interface VersionPreviewDialogProps {
  open: boolean
  onClose: () => void
  selectedVersion: CVHistoryEntry | null
  originalVersion: CVHistoryEntry | null
  versionNumber?: number
  cvId: string
  onRestore?: (_version: CVHistoryEntry) => void
  loading?: boolean
}

const VersionPreviewDialog: React.FC<VersionPreviewDialogProps> = ({
  open,
  onClose,
  selectedVersion,
  originalVersion,
  versionNumber,
  cvId,
  onRestore,
  loading = false
}) => {
  const [selectedTab, setSelectedTab] = useState(0)

  // Reset tab when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedTab(0)
    }
  }, [open])

  const handleRestore = () => {
    if (selectedVersion && onRestore) {
      onRestore(selectedVersion)
    }
  }

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setSelectedTab(newValue)
  }

  const isOriginalVersion = selectedVersion ? originalVersion?.id === selectedVersion.id : false
  const canRestore = selectedVersion && !isOriginalVersion && onRestore
  const hasOriginalVersion = selectedVersion && !!originalVersion && !isOriginalVersion

  // Generate simplified title based on changes from original
  const diffTitle = useMemo(() => {
    if (!selectedVersion) return ""
    return isOriginalVersion ? "Original Version" : "Changes from Original"
  }, [isOriginalVersion, selectedVersion])

  return (
    <Dialog
      open={open && !!selectedVersion}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: { height: '80vh' }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="h6">
              {versionNumber ? `#${versionNumber} ` : ''}{diffTitle}
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 0 }}>
        {/* Diff View */}
        {!isOriginalVersion ? (
          <>
            {/* Tabs for dual diff view when original version exists */}
            {hasOriginalVersion && (
              <Tabs
                value={selectedTab}
                onChange={handleTabChange}
                sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
              >
                <Tab
                  icon={<CompareArrowsIcon />}
                  label="From Previous"
                  iconPosition="start"
                />
                <Tab
                  icon={<HistoryIcon />}
                  label="From Original"
                  iconPosition="start"
                />
              </Tabs>
            )}

            {/* Diff Content */}
            <Box sx={{ p: hasOriginalVersion ? 0 : 2 }}>
              {hasOriginalVersion ? (
                <>
                  {/* Tab 0: Diff from Previous Version */}
                  {selectedTab === 0 && (
                    <SimpleCVDiffViewer
                      oldVersion={null} // Backend will find previous version
                      newVersion={selectedVersion}
                      cvId={cvId}
                      title="Changes from Previous Version"
                      forcePrevious={true} // Force comparison to previous version
                    />
                  )}

                  {/* Tab 1: Diff from Original Version */}
                  {selectedTab === 1 && (
                    <SimpleCVDiffViewer
                      oldVersion={originalVersion}
                      newVersion={selectedVersion}
                      cvId={cvId}
                      title="Changes from Original Version"
                    />
                  )}
                </>
              ) : (
                <SimpleCVDiffViewer
                  oldVersion={null} // Backend will handle comparison logic
                  newVersion={selectedVersion}
                  cvId={cvId}
                  title="Changes from Previous Version"
                />
              )}
            </Box>
          </>
        ) : (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              This is the original version
            </Typography>
            <Typography variant="body2" color="text.secondary">
              No changes to display
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>
          Close
        </Button>
        {canRestore && (
          <Button
            onClick={handleRestore}
            variant="contained"
            color="warning"
            startIcon={<RestoreIcon />}
            disabled={loading}
          >
            {selectedVersion.isInitial ? 'Reset to Original' : 'Restore This Version'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}

export default VersionPreviewDialog
