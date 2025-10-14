/**
 * Backend CV History Service
 *
 * This service manages CV version history using the backend API instead of localStorage.
 * Provides better persistence, cross-device sync, and data safety.
 */

import {
  CVData,
  CVHistoryEntry,
  CreateSnapshotOptions,
  HistoryStats,
} from "../types";

// Backend diff response types
export interface TextDiffData {
  inline_diff?: string;
  word_diff: string[];
  old_text: string;
  new_text: string;
  stats: {
    additions: number;
    deletions: number;
    total_changes: number;
  };
}

export interface DiffChange {
  type: string;
  section: string;
  description: string;
  details: string[];
  text_diff?: TextDiffData;
  icon: string;
  color: string;
}

export interface CVDiffResult {
  changes: DiffChange[];
  summary: string;
  total_changes: number;
}
import api from "./api";
import {
  applyRetentionPolicy,
  DEFAULT_RETENTION_POLICY,
  RetentionPolicy,
} from "../utils/historyRetention";

export class BackendCVHistoryService {
  private retentionPolicy: RetentionPolicy;

  constructor(retentionPolicy: RetentionPolicy = DEFAULT_RETENTION_POLICY) {
    this.retentionPolicy = retentionPolicy;
  }

  /**
   * Create a new history snapshot with automatic cleanup
   */
  async createSnapshot(
    cvId: string,
    cvData: CVData,
    options: CreateSnapshotOptions,
  ): Promise<CVHistoryEntry> {
    try {
      const response = await api.post(`/api/cvs/${cvId}/history`, {
        cv_data: cvData,
        change_type: options.changeType,
        description: options.description,
        label: options.label,
        is_automatic:
          options.changeType !== "manual_save" &&
          options.changeType !== "restore_point",
        is_initial: options.changeType === "initial_load",
      });

      const newEntry = response.data;

      // Apply automatic cleanup after creating new snapshot
      await this.performAutomaticCleanup(cvId);

      return newEntry;
    } catch (error: any) {
      // If the API is not available yet, create a mock entry to prevent crashes
      if (
        error.response?.status === 404 ||
        error.response?.status === 500 ||
        error.code === "ERR_NETWORK"
      ) {
        return {
          id: `mock_${Date.now()}`,
          timestamp: new Date().toISOString(),
          cvData: cvData,
          changeType: options.changeType,
          description: options.description || "Snapshot created",
          isAutomatic:
            options.changeType !== "manual_save" &&
            options.changeType !== "restore_point",
          isInitial: options.changeType === "initial_load",
          label: options.label,
          dataSize: JSON.stringify(cvData).length,
        };
      }
      throw error;
    }
  }

  /**
   * Get all history entries for a CV
   */
  async getHistoryEntries(cvId: string): Promise<CVHistoryEntry[]> {
    try {
      const response = await api.get(`/api/cvs/${cvId}/history`);
      return response.data || [];
    } catch (error: any) {
      // If the endpoint doesn't exist yet (404), return empty array
      if (error.response?.status === 404 || error.response?.status === 500) {
        return [];
      }
      return [];
    }
  }

  /**
   * Get a specific history entry
   */
  async getHistoryEntry(
    cvId: string,
    entryId: string,
  ): Promise<CVHistoryEntry | null> {
    try {
      const response = await api.get(`/api/cvs/${cvId}/history/${entryId}`);
      return response.data;
    } catch (error) {
      return null;
    }
  }

  /**
   * Delete a specific history entry
   */
  async deleteHistoryEntry(cvId: string, entryId: string): Promise<boolean> {
    try {
      await api.delete(`/api/cvs/${cvId}/history/${entryId}`);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Perform automatic cleanup based on retention policy
   */
  private async performAutomaticCleanup(cvId: string): Promise<void> {
    try {
      const allEntries = await this.getHistoryEntries(cvId);
      const entriesToKeep = applyRetentionPolicy(
        allEntries,
        this.retentionPolicy,
      );

      // If no cleanup needed, return early
      if (entriesToKeep.length === allEntries.length) {
        return;
      }

      // Find entries to delete
      const entryIdsToKeep = new Set(entriesToKeep.map((e) => e.id));
      const entriesToDelete = allEntries.filter(
        (e) => !entryIdsToKeep.has(e.id),
      );

      // Delete entries that exceed retention policy
      for (const entry of entriesToDelete) {
        try {
          await this.deleteHistoryEntry(cvId, entry.id);
        } catch (error) {
          // Continue with other deletions even if one fails
        }
      }

      if (entriesToDelete.length > 0) {
        // Cleanup completed above
      }
    } catch (error) {
      // Don't throw - cleanup failure shouldn't break snapshot creation
    }
  }

  /**
   * Get history statistics
   */
  async getHistoryStats(cvId: string): Promise<HistoryStats> {
    try {
      const response = await api.get(`/api/cvs/${cvId}/history-stats`);
      return response.data;
    } catch (error) {
      return {
        totalEntries: 0,
        autoSnapshots: 0,
        manualSnapshots: 0,
        totalStorageUsed: 0,
        oldestEntry: null,
        newestEntry: null,
      };
    }
  }

  /**
   * Restore CV to a previous version
   */
  async restoreVersion(cvId: string, entryId: string): Promise<any> {
    const response = await api.post(`/api/cvs/${cvId}/restore/${entryId}`, {});

    return response.data;
  }

  /**
   * Generate a diff between two history entries
   * Note: This is a client-side implementation since the backend doesn't provide diff yet
   */
  generateDiff(fromEntry: CVHistoryEntry, toEntry: CVHistoryEntry) {
    const changes = {
      added: [] as string[],
      modified: [] as Array<{ section: string; changes: string[] }>,
      removed: [] as string[],
    };

    // Compare each section
    const fromData = fromEntry.cvData;
    const toData = toEntry.cvData;

    const sections = [
      "personal_info",
      "professional_summary",
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

    // Generate summary
    const summary = this.generateDiffSummary(changes);

    return {
      added: changes.added,
      modified: changes.modified,
      removed: changes.removed,
      summary,
    };
  }

  /**
   * Migrate existing localStorage history to backend
   */
  async migrateFromLocalStorage(cvId: string): Promise<number> {
    try {
      // Get localStorage history
      const localStorageKey = `cv_history_${cvId}`;
      const storedData = localStorage.getItem(localStorageKey);

      if (!storedData) {
        return 0;
      }

      const localHistory = JSON.parse(storedData);
      const entries = localHistory.entries || [];

      if (entries.length === 0) {
        return 0;
      }

      // Migrate each entry
      let migratedCount = 0;
      for (const entry of entries) {
        try {
          await this.createSnapshot(cvId, entry.cvData, {
            changeType: entry.changeType,
            description: entry.description,
            label: entry.label,
            force: true,
          });
          migratedCount++;
        } catch (error) {
          // Skip failed entries during migration
        }
      }

      // Clear localStorage after successful migration
      if (migratedCount > 0) {
        localStorage.removeItem(localStorageKey);
        localStorage.removeItem(`cv_history_state_${cvId}`);
      }

      return migratedCount;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Get display name for a section
   */
  private getSectionDisplayName(section: string): string {
    const names = {
      personal_info: "Personal Information",
      professional_summary: "Professional Summary",
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
  private generateDiffSummary(changes: any): string {
    const parts: string[] = [];

    if (changes.added.length > 0) {
      parts.push(`Added ${changes.added.join(", ")}`);
    }

    if (changes.modified.length > 0) {
      parts.push(
        `Modified ${changes.modified.map((m: any) => m.section).join(", ")}`,
      );
    }

    if (changes.removed.length > 0) {
      parts.push(`Removed ${changes.removed.join(", ")}`);
    }

    return parts.length > 0 ? parts.join("; ") : "No changes detected";
  }

  /**
   * Get semantic diff between two CV versions using backend computation
   */
  async getDiff(
    cvId: string,
    entryId: string,
    compareToId?: string,
    forcePrevious?: boolean,
  ): Promise<CVDiffResult> {
    try {
      const params = new URLSearchParams();
      if (compareToId) {
        params.append("compare_to", compareToId);
      }
      if (forcePrevious) {
        params.append("force_previous", "true");
      }

      const queryString = params.toString();
      const url = `/api/cvs/${cvId}/history/${entryId}/diff${queryString ? `?${queryString}` : ""}`;

      const response = await api.get(url);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to compute diff: ${error}`);
    }
  }
}

// Export a default instance
export const backendHistoryService = new BackendCVHistoryService();
