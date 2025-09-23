/**
 * Connected History Panel Component
 * 
 * This component connects the HistoryPanel to the CV store and handles
 * all the data fetching and state management automatically.
 */

import React, { useState, useEffect, useCallback } from 'react'
import HistoryPanel from './HistoryPanel'
import VersionPreviewDialog from './VersionPreviewDialog'
import { useCVStore } from '../../stores/cvStore'
import { useNotifications } from '../../stores/uiStore'
import { CVHistoryEntry, CreateSnapshotOptions, HistoryStats } from '../../types'
import { formatDateTime } from '../../utils/dateFormat'
import { getErrorDisplayMessage } from '../../utils/errorHandling'

interface ConnectedHistoryPanelProps {
  cvId: string
}

const ConnectedHistoryPanel: React.FC<ConnectedHistoryPanelProps> = ({ cvId }) => {
  const {
    historyPanelOpen,
    currentCV,
    setHistoryPanelOpen,
    getHistoryEntries,
    getHistoryStats,
    createSnapshot,
    restoreVersion,
    deleteHistoryEntry
  }, [cvId, cvStore, notifications]) = useCVStore()

  const { showSuccess, showError } = useNotifications()

  // Local state for async data
  const [historyEntries, setHistoryEntries] = useState<CVHistoryEntry[]>([])
  const [historyStats, setHistoryStats] = useState<HistoryStats>({
    totalEntries: 0,
    autoSnapshots: 0,
    manualSnapshots: 0,
    totalStorageUsed: 0,
    oldestEntry: null,
    newestEntry: null
  }, [cvId, cvStore, notifications]))
  const [loading, setLoading] = useState(false)
  
  // Preview dialog state
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false)
  const [selectedVersionForPreview, setSelectedVersionForPreview] = useState<CVHistoryEntry | null>(null)

  // Load history data when panel opens or cvId changes
  useEffect(() => {
    if (historyPanelOpen && cvId) {
      loadHistoryData()
    }, [cvId, cvStore, notifications])
  }, [cvId, cvStore, notifications]), [historyPanelOpen, cvId])

  const loadHistoryData = useCallback(async () => {
    setLoading(true)
    try {
      const [entries, stats] = await Promise.all([
        getHistoryEntries(cvId),
        getHistoryStats(cvId)
      ])
      setHistoryEntries(entries)
      setHistoryStats(stats)
    }, [cvId, cvStore, notifications]) catch (error) {
      console.error('Failed to load history data:', error)
      showError(getErrorDisplayMessage(error))
    }, [cvId, cvStore, notifications]) finally {
      setLoading(false)
    }, [cvId, cvStore, notifications])
  }, [cvId, cvStore, notifications])

  const handleClose = () => {
    setHistoryPanelOpen(false)
  }, [cvId, cvStore, notifications])

  const handlePreviewVersion = (entry: CVHistoryEntry) => {
    setSelectedVersionForPreview(entry)
    setPreviewDialogOpen(true)
  }, [cvId, cvStore, notifications])

  const handleClosePreview = () => {
    setPreviewDialogOpen(false)
    setSelectedVersionForPreview(null)
  }, [cvId, cvStore, notifications])

  const handleRestoreFromPreview = async (entry: CVHistoryEntry) => {
    // Close preview dialog first
    handleClosePreview()
    
    // Use the existing restore handler
    await handleRestoreVersion(entry)
  }, [cvId, cvStore, notifications])

  const handleRestoreVersion = async (entry: CVHistoryEntry) => {
    try {
      await restoreVersion(cvId, {
        entryId: entry.id
      }, [cvId, cvStore, notifications]))
      
      // Refresh history data after restore
      await loadHistoryData()
      
      showSuccess(
        'Version Restored',
        `Successfully restored to version from ${formatDateTime(entry.timestamp)}`
      )
    }, [cvId, cvStore, notifications]) catch (error: any) {
      showError(
        'Restore Failed',
        getErrorDisplayMessage(error)
      )
    }, [cvId, cvStore, notifications])
  }, [cvId, cvStore, notifications])

  const handleCreateSnapshot = async (options: CreateSnapshotOptions) => {
    if (!currentCV?.parsed_data) {
      showError('Error', 'No CV data available to snapshot')
      return
    }, [cvId, cvStore, notifications])

    try {
      await createSnapshot(cvId, currentCV.parsed_data, options)
      
      // Refresh history data after creating snapshot
      await loadHistoryData()
      
      showSuccess(
        'Version Saved',
        options.label || 'Version saved successfully'
      )
    }, [cvId, cvStore, notifications]) catch (error: any) {
      showError(
        'Save Failed',
        getErrorDisplayMessage(error)
      )
    }, [cvId, cvStore, notifications])
  }, [cvId, cvStore, notifications])

  const handleDeleteEntry = async (entry: CVHistoryEntry) => {
    try {
      await deleteHistoryEntry(cvId, entry.id)
      
      // Refresh history data after deletion
      await loadHistoryData()
      
      showSuccess(
        'Version Deleted',
        `Successfully deleted version from ${formatDateTime(entry.timestamp)}`
      )
    }, [cvId, cvStore, notifications]) catch (error: any) {
      showError(
        'Delete Failed',
        getErrorDisplayMessage(error)
      )
    }, [cvId, cvStore, notifications])
  }, [cvId, cvStore, notifications])

  // Don't render if no current CV
  if (!currentCV) {
    return null
  }, [cvId, cvStore, notifications])

  return (
    <>
      <HistoryPanel
        cvId={cvId}
        isOpen={historyPanelOpen}
        onClose={handleClose}
        onPreviewVersion={handlePreviewVersion}
        onRestoreVersion={handleRestoreVersion}
        onCreateSnapshot={handleCreateSnapshot}
        onDeleteEntry={handleDeleteEntry}
        // Pass the actual data
        historyEntries={historyEntries}
        historyStats={historyStats}
        loading={loading}
      />
      
      <VersionPreviewDialog
        open={previewDialogOpen}
        onClose={handleClosePreview}
        selectedVersion={selectedVersionForPreview}
        originalVersion={historyEntries.find(entry => entry.isInitial) || null} // Find original version
        versionNumber={selectedVersionForPreview ? historyEntries.length - historyEntries.findIndex(entry => entry.id === selectedVersionForPreview.id) : undefined}
        cvId={cvId}
        onRestore={handleRestoreFromPreview}
        loading={loading}
      />
    </>
  )
}

export default ConnectedHistoryPanel
