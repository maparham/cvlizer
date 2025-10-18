/**
 * Connected History Panel Component
 *
 * This component connects the HistoryPanel to the CV store and handles
 * all the data fetching and state management automatically.
 */

import React, { useState, useEffect, useCallback } from "react";
import HistoryPanel from "./HistoryPanel";
import VersionPreviewDialog from "./VersionPreviewDialog";
import { useCVStore } from "../../stores/cvStore";
import { useNotifications } from "../../packages/notifications";
import {
  CVHistoryEntry,
  CreateSnapshotOptions,
  HistoryStats,
} from "../../types";
import { formatDateTime } from "../../utils/dateFormat";
import { getErrorDisplayMessage } from "../../utils/errorHandling";

interface ConnectedHistoryPanelProps {
  cvId: string;
}

const ConnectedHistoryPanel: React.FC<ConnectedHistoryPanelProps> = ({
  cvId,
}) => {
  const {
    historyPanelOpen,
    currentCV,
    setHistoryPanelOpen,
    getHistoryEntries,
    getHistoryStats,
    createSnapshot,
    restoreVersion,
    deleteHistoryEntry,
  } = useCVStore();

  const { showSuccess, showError } = useNotifications();

  // Local state for async data
  const [historyEntries, setHistoryEntries] = useState<CVHistoryEntry[]>([]);
  const [historyStats, setHistoryStats] = useState<HistoryStats>({
    totalEntries: 0,
    autoSnapshots: 0,
    manualSnapshots: 0,
    totalStorageUsed: 0,
    oldestEntry: null,
    newestEntry: null,
  });
  const [loading, setLoading] = useState(false);

  // Preview dialog state
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [selectedVersionForPreview, setSelectedVersionForPreview] =
    useState<CVHistoryEntry | null>(null);

  // Define loadHistoryData function
  const loadHistoryData = useCallback(async () => {
    setLoading(true);
    try {
      const [entries, stats] = await Promise.all([
        getHistoryEntries(cvId),
        getHistoryStats(cvId),
      ]);
      setHistoryEntries(entries);
      setHistoryStats(stats);
    } catch (error) {
      showError(getErrorDisplayMessage(error));
    } finally {
      setLoading(false);
    }
  }, [cvId, getHistoryEntries, getHistoryStats, showError]);

  // Load history data when panel opens or cvId changes
  useEffect(() => {
    if (historyPanelOpen && cvId) {
      loadHistoryData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historyPanelOpen, cvId]);

  const handleClose = () => {
    setHistoryPanelOpen(false);
  };

  const handlePreviewVersion = (entry: CVHistoryEntry) => {
    setSelectedVersionForPreview(entry);
    setPreviewDialogOpen(true);
  };

  const handleClosePreview = () => {
    setPreviewDialogOpen(false);
    setSelectedVersionForPreview(null);
  };

  const handleRestoreFromPreview = async (entry: CVHistoryEntry) => {
    // Close preview dialog first
    handleClosePreview();

    // Use the existing restore handler
    await handleRestoreVersion(entry);
  };

  const handleRestoreVersion = async (entry: CVHistoryEntry) => {
    try {
      await restoreVersion(cvId, {
        entryId: entry.id,
      });

      // Refresh history data after restore
      await loadHistoryData();

      showSuccess(
        "Version Restored",
        `Successfully restored to version from ${formatDateTime(entry.timestamp)}`,
      );
    } catch (error: unknown) {
      showError("Restore Failed", getErrorDisplayMessage(error));
    }
  };

  const handleCreateSnapshot = async (options: CreateSnapshotOptions) => {
    if (!currentCV?.parsed_data) {
      showError("Error", "No CV data available to snapshot");
      return;
    }

    try {
      await createSnapshot(cvId, currentCV.parsed_data, options);

      // Refresh history data after creating snapshot
      await loadHistoryData();

      showSuccess(
        "Version Saved",
        options.label || "Version saved successfully",
      );
    } catch (error: unknown) {
      showError("Save Failed", getErrorDisplayMessage(error));
    }
  };

  const handleDeleteEntry = async (entry: CVHistoryEntry) => {
    try {
      await deleteHistoryEntry(cvId, entry.id);

      // Refresh history data after deletion
      await loadHistoryData();

      showSuccess(
        "Version Deleted",
        `Successfully deleted version from ${formatDateTime(entry.timestamp)}`,
      );
    } catch (error: unknown) {
      showError("Delete Failed", getErrorDisplayMessage(error));
    }
  };

  // Don't render if no current CV
  if (!currentCV) {
    return null;
  }

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
        originalVersion={
          historyEntries.find((entry) => entry.isInitial) || null
        } // Find original version
        versionNumber={
          selectedVersionForPreview
            ? historyEntries.length -
              historyEntries.findIndex(
                (entry) => entry.id === selectedVersionForPreview.id,
              )
            : undefined
        }
        cvId={cvId}
        onRestore={handleRestoreFromPreview}
        loading={loading}
      />
    </>
  );
};

export default ConnectedHistoryPanel;
