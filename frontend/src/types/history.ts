/**
 * History System Types
 *
 * This module defines types for the CV history and version management system.
 * Supports automatic snapshots, manual saves, and version restoration.
 */

import { CVData } from "./cv";

export interface CVHistoryEntry {
  /** Unique identifier for this history entry */
  id: string;

  /** Timestamp when this version was created */
  timestamp: string;

  /** The CV data at this point in time */
  cvData: CVData;

  /** Type of change that triggered this snapshot */
  changeType: CVHistoryChangeType;

  /** Human-readable description of the change */
  description: string;

  /** Whether this was an automatic or manual snapshot */
  isAutomatic: boolean;

  /** Whether this is the initial version (undeletable) */
  isInitial: boolean;

  /** Optional user-provided label for this version */
  label?: string;

  /** Size of the serialized data (for storage management) */
  dataSize: number;
}

export type CVHistoryChangeType =
  | "manual_save" // User explicitly saved
  | "auto_save" // Automatic save triggered
  | "section_edit" // Major section edit completed
  | "bulk_change" // Multiple sections changed
  | "initial_load" // CV first loaded/created
  | "before_ai_optimize" // Before AI optimization
  | "restore_point"; // User-created restore point

export interface CVHistoryState {
  /** All history entries for the current CV, ordered by timestamp (newest first) */
  entries: CVHistoryEntry[];

  /** Currently selected/active history entry ID */
  currentEntryId: string | null;

  /** Maximum number of history entries to keep */
  maxEntries: number;

  /** Whether history tracking is enabled */
  enabled: boolean;

  /** Last time automatic cleanup was performed */
  lastCleanup: string;
}

export interface CVHistoryConfig {
  /** Maximum number of automatic snapshots to keep */
  maxAutoSnapshots: number;

  /** Maximum number of manual snapshots to keep */
  maxManualSnapshots: number;

  /** Interval in milliseconds for automatic snapshots */
  autoSnapshotInterval: number;

  /** Minimum time between snapshots to avoid spam */
  minSnapshotInterval: number;

  /** Maximum data size per snapshot in bytes */
  maxSnapshotSize: number;

  /** Whether to compress snapshot data */
  compressSnapshots: boolean;
}

export interface CreateSnapshotOptions {
  /** Type of change that triggered this snapshot */
  changeType: CVHistoryChangeType;

  /** Custom description for the snapshot */
  description?: string;

  /** User-provided label */
  label?: string;

  /** Force creation even if recent snapshot exists */
  force?: boolean;
}

export interface RestoreVersionOptions {
  /** ID of the history entry to restore */
  entryId: string;
}

export interface HistoryStats {
  /** Total number of history entries */
  totalEntries: number;

  /** Number of automatic snapshots */
  autoSnapshots: number;

  /** Number of manual snapshots */
  manualSnapshots: number;

  /** Total storage used by history in bytes */
  totalStorageUsed: number;

  /** Oldest entry timestamp */
  oldestEntry: string | null;

  /** Newest entry timestamp */
  newestEntry: string | null;
}

export interface HistoryPanelProps {
  /** Current CV ID */
  cvId: string;

  /** Whether the history panel is open */
  isOpen: boolean;

  /** Callback when panel should be closed */
  onClose: () => void;

  /** Callback when a version is selected for preview */
  onPreviewVersion?: (entry: CVHistoryEntry) => void;

  /** Callback when a version is restored */
  onRestoreVersion: (entry: CVHistoryEntry) => Promise<void>;

  /** Callback when a manual snapshot is created */
  onCreateSnapshot: (options: CreateSnapshotOptions) => Promise<void>;
}

export interface HistoryDiff {
  /** Sections that were added */
  added: string[];

  /** Sections that were modified */
  modified: Array<{
    section: string;
    changes: string[];
  }>;

  /** Sections that were removed */
  removed: string[];

  /** Summary of all changes */
  summary: string;
}

// Default configuration - now managed by retention policy
export const DEFAULT_HISTORY_CONFIG: CVHistoryConfig = {
  maxAutoSnapshots: 30, // Managed by retention policy
  maxManualSnapshots: 50, // Managed by retention policy
  autoSnapshotInterval: 60000, // 1 minute
  minSnapshotInterval: 10000, // 10 seconds
  maxSnapshotSize: 1024 * 1024, // 1MB
  compressSnapshots: false, // Keep simple for now
};

// Storage keys for localStorage
export const HISTORY_STORAGE_KEYS = {
  ENTRIES: (cvId: string) => `cv_history_${cvId}`,
  CONFIG: "cv_history_config",
  STATE: (cvId: string) => `cv_history_state_${cvId}`,
} as const;
