/**
 * CV History Service
 *
 * This service manages CV version history including:
 * - Creating and managing snapshots
 * - Local storage persistence
 * - History cleanup and optimization
 * - Diff generation between versions
 */

import {
  CVData,
  CVHistoryEntry,
  CVHistoryState,
  CVHistoryConfig,
  CreateSnapshotOptions,
  HistoryStats,
  HistoryDiff,
  DEFAULT_HISTORY_CONFIG,
  HISTORY_STORAGE_KEYS,
} from "../types";

export class CVHistoryService {
  private config: CVHistoryConfig;

  constructor(config: Partial<CVHistoryConfig> = {}) {
    this.config = { ...DEFAULT_HISTORY_CONFIG, ...config };
  }

  /**
   * Create a new history snapshot
   */
  createSnapshot(
    cvId: string,
    cvData: CVData,
    options: CreateSnapshotOptions,
  ): CVHistoryEntry {
    const now = new Date().toISOString();
    const serializedData = JSON.stringify(cvData);
    const dataSize = new Blob([serializedData]).size;

    // Check if snapshot is too large
    if (dataSize > this.config.maxSnapshotSize) {
      throw new Error(
        `Snapshot too large: ${dataSize} bytes exceeds limit of ${this.config.maxSnapshotSize} bytes`,
      );
    }

    const entry: CVHistoryEntry = {
      id: this.generateEntryId(),
      timestamp: now,
      cvData: structuredClone(cvData), // Deep clone to prevent mutations
      changeType: options.changeType,
      description:
        options.description || this.generateDescription(options.changeType),
      isAutomatic:
        options.changeType !== "manual_save" &&
        options.changeType !== "restore_point",
      isInitial: options.changeType === "initial_load",
      label: options.label,
      dataSize,
    };

    // Get current history state
    const historyState = this.getHistoryState(cvId);

    // Check if we should skip this snapshot (too recent)
    if (!options.force && this.shouldSkipSnapshot(historyState, entry)) {
      throw new Error("Snapshot skipped: too recent");
    }

    // Add to history
    historyState.entries.unshift(entry); // Add to beginning (newest first)
    historyState.currentEntryId = entry.id;

    // Cleanup old entries
    this.cleanupHistory(historyState);

    // Save to localStorage
    this.saveHistoryState(cvId, historyState);

    return entry;
  }

  /**
   * Get history state for a CV
   */
  getHistoryState(cvId: string): CVHistoryState {
    try {
      const stored = localStorage.getItem(HISTORY_STORAGE_KEYS.ENTRIES(cvId));
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          entries: parsed.entries || [],
          currentEntryId: parsed.currentEntryId || null,
          maxEntries:
            this.config.maxAutoSnapshots + this.config.maxManualSnapshots,
          enabled: true,
          lastCleanup: parsed.lastCleanup || new Date().toISOString(),
          ...parsed,
        };
      }
    } catch (error) {
      // Failed to load history state
    }

    // Return default state
    return {
      entries: [],
      currentEntryId: null,
      maxEntries: this.config.maxAutoSnapshots + this.config.maxManualSnapshots,
      enabled: true,
      lastCleanup: new Date().toISOString(),
    };
  }

  /**
   * Save history state to localStorage
   */
  private saveHistoryState(cvId: string, state: CVHistoryState): void {
    try {
      localStorage.setItem(
        HISTORY_STORAGE_KEYS.ENTRIES(cvId),
        JSON.stringify(state),
      );
    } catch (error) {
      // If localStorage is full, try cleanup and retry
      this.emergencyCleanup(cvId, state);
    }
  }

  /**
   * Get a specific history entry
   */
  getHistoryEntry(cvId: string, entryId: string): CVHistoryEntry | null {
    const state = this.getHistoryState(cvId);
    return state.entries.find((entry) => entry.id === entryId) || null;
  }

  /**
   * Get all history entries for a CV
   */
  getHistoryEntries(cvId: string): CVHistoryEntry[] {
    return this.getHistoryState(cvId).entries;
  }

  /**
   * Delete a specific history entry
   */
  deleteHistoryEntry(cvId: string, entryId: string): boolean {
    const state = this.getHistoryState(cvId);
    const initialLength = state.entries.length;

    state.entries = state.entries.filter((entry) => entry.id !== entryId);

    if (state.currentEntryId === entryId) {
      state.currentEntryId = state.entries[0]?.id || null;
    }

    if (state.entries.length !== initialLength) {
      this.saveHistoryState(cvId, state);
      return true;
    }

    return false;
  }

  /**
   * Clear all history for a CV
   */
  clearHistory(cvId: string): void {
    localStorage.removeItem(HISTORY_STORAGE_KEYS.ENTRIES(cvId));
    localStorage.removeItem(HISTORY_STORAGE_KEYS.STATE(cvId));
  }

  /**
   * Get history statistics
   */
  getHistoryStats(cvId: string): HistoryStats {
    const entries = this.getHistoryEntries(cvId);

    const autoSnapshots = entries.filter((e) => e.isAutomatic).length;
    const manualSnapshots = entries.filter((e) => !e.isAutomatic).length;
    const totalStorageUsed = entries.reduce(
      (sum, entry) => sum + entry.dataSize,
      0,
    );

    return {
      totalEntries: entries.length,
      autoSnapshots,
      manualSnapshots,
      totalStorageUsed,
      oldestEntry:
        entries.length > 0 ? entries[entries.length - 1].timestamp : null,
      newestEntry: entries.length > 0 ? entries[0].timestamp : null,
    };
  }

  /**
   * Generate a diff between two history entries
   */
  generateDiff(
    fromEntry: CVHistoryEntry,
    toEntry: CVHistoryEntry,
  ): HistoryDiff {
    const changes = {
      added: [] as string[],
      modified: [] as Array<{ section: string; changes: string[] }>,
      removed: [] as string[],
    };

    // Compare each section
    const fromData = fromEntry.cvData;
    const toData = toEntry.cvData;

    // Check for changes in each section
    const sections = [
      "personal_info",
      "custom_sections",
      "work_experience",
      "education",
      "skills",
      "certifications",
      "projects",
      "awards",
      "publications",
      "volunteer_experience",
    ] as const;

    sections.forEach((section) => {
      const fromSection = fromData[section];
      const toSection = toData[section];

      if (!fromSection && toSection) {
        changes.added.push(this.getSectionDisplayName(section));
      } else if (fromSection && !toSection) {
        changes.removed.push(this.getSectionDisplayName(section));
      } else if (fromSection && toSection) {
        const sectionChanges = this.compareSections(fromSection, toSection);
        if (sectionChanges.length > 0) {
          changes.modified.push({
            section: this.getSectionDisplayName(section),
            changes: sectionChanges,
          });
        }
      }
    });

    // Create the result object first
    const result = {
      added: changes.added,
      modified: changes.modified,
      removed: changes.removed,
      summary: "", // Will be set below
    };

    // Generate summary
    result.summary = this.generateDiffSummary(result);

    return result;
  }

  /**
   * Check if a snapshot should be skipped due to timing
   */
  private shouldSkipSnapshot(
    state: CVHistoryState,
    newEntry: CVHistoryEntry,
  ): boolean {
    if (state.entries.length === 0) return false;

    const lastEntry = state.entries[0];
    const timeDiff =
      new Date(newEntry.timestamp).getTime() -
      new Date(lastEntry.timestamp).getTime();

    return timeDiff < this.config.minSnapshotInterval;
  }

  /**
   * Clean up old history entries based on limits
   */
  private cleanupHistory(state: CVHistoryState): void {
    const autoEntries = state.entries.filter((e) => e.isAutomatic);
    const manualEntries = state.entries.filter((e) => !e.isAutomatic);

    // Keep only the most recent entries within limits
    const keepAuto = autoEntries.slice(0, this.config.maxAutoSnapshots);
    const keepManual = manualEntries.slice(0, this.config.maxManualSnapshots);

    // Combine and sort by timestamp
    state.entries = [...keepAuto, ...keepManual].sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );

    state.lastCleanup = new Date().toISOString();
  }

  /**
   * Emergency cleanup when localStorage is full
   */
  private emergencyCleanup(cvId: string, state: CVHistoryState): void {
    // Keep only the most recent 5 entries
    state.entries = state.entries.slice(0, 5);

    try {
      this.saveHistoryState(cvId, state);
    } catch (error) {
      // Emergency cleanup failed
    }
  }

  /**
   * Generate a unique entry ID
   */
  private generateEntryId(): string {
    return `hist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate a description for a change type
   */
  private generateDescription(changeType: string): string {
    const descriptions = {
      manual_save: "Manual save",
      auto_save: "Automatic save",
      section_edit: "Section edited",
      bulk_change: "Multiple sections changed",
      initial_load: "CV loaded",
      before_ai_optimize: "Before AI optimization",
      restore_point: "Restore point created",
    };

    return (
      descriptions[changeType as keyof typeof descriptions] || "CV updated"
    );
  }

  /**
   * Get display name for a section
   */
  private getSectionDisplayName(section: string): string {
    const names = {
      personal_info: "Personal Information",
      custom_sections: "Custom sections",
      work_experience: "Work Experience",
      education: "Education",
      skills: "Skills",
      certifications: "Certifications",
      projects: "Projects",
      awards: "Awards",
      publications: "Publications",
      volunteer_experience: "Volunteer Experience",
    };

    return names[section as keyof typeof names] || section;
  }

  /**
   * Compare two sections and return list of changes
   */
  private compareSections(fromSection: any, toSection: any): string[] {
    const changes: string[] = [];

    // Simple comparison - could be enhanced with deep diff
    const fromStr = JSON.stringify(fromSection);
    const toStr = JSON.stringify(toSection);

    if (fromStr !== toStr) {
      if (Array.isArray(fromSection) && Array.isArray(toSection)) {
        if (fromSection.length !== toSection.length) {
          changes.push(
            `Changed from ${fromSection.length} to ${toSection.length} items`,
          );
        } else {
          changes.push("Content modified");
        }
      } else {
        changes.push("Content modified");
      }
    }

    return changes;
  }

  /**
   * Generate a human-readable summary of changes
   */
  private generateDiffSummary(changes: HistoryDiff): string {
    const parts: string[] = [];

    if (changes.added.length > 0) {
      parts.push(`Added ${changes.added.join(", ")}`);
    }

    if (changes.modified.length > 0) {
      parts.push(
        `Modified ${changes.modified.map((m) => m.section).join(", ")}`,
      );
    }

    if (changes.removed.length > 0) {
      parts.push(`Removed ${changes.removed.join(", ")}`);
    }

    return parts.length > 0 ? parts.join("; ") : "No changes detected";
  }
}

// Export a default instance
export const cvHistoryService = new CVHistoryService();
