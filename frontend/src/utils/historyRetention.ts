/**
 * CV History Retention Policy
 *
 * Manages automatic cleanup of CV version history based on intelligent rules
 * that preserve important versions while cleaning up clutter.
 */

import { CVHistoryEntry, CVHistoryChangeType } from "../types";

export interface RetentionPolicy {
  /** Maximum total versions to keep */
  maxTotalVersions: number;

  /** Maximum automatic versions to keep */
  maxAutoVersions: number;

  /** Maximum age in days for automatic versions */
  maxAutoVersionAgeDays: number;

  /** Always preserve versions with these change types */
  preserveChangeTypes: CVHistoryChangeType[];

  /** Always preserve manually labeled versions */
  preserveLabeledVersions: boolean;

  /** Always preserve the initial version */
  preserveInitialVersion: boolean;

  /** Minimum versions to always keep regardless of age */
  minVersionsToKeep: number;
}

export const DEFAULT_RETENTION_POLICY: RetentionPolicy = {
  maxTotalVersions: 50, // Keep last 50 versions max
  maxAutoVersions: 30, // Keep last 30 auto versions max
  maxAutoVersionAgeDays: 30, // Auto versions older than 30 days can be cleaned
  preserveChangeTypes: [
    "initial_load", // Always keep the original
    "restore_point", // Always keep user-created restore points
    "before_ai_optimize", // Always keep pre-AI optimization snapshots
  ],
  preserveLabeledVersions: true, // Never delete versions with user labels
  preserveInitialVersion: true, // Never delete the very first version
  minVersionsToKeep: 10, // Always keep at least 10 versions
};

/**
 * Apply retention policy to a list of history entries
 * Returns the entries that should be kept
 */
export function applyRetentionPolicy(
  entries: CVHistoryEntry[],
  policy: RetentionPolicy = DEFAULT_RETENTION_POLICY,
): CVHistoryEntry[] {
  if (entries.length <= policy.minVersionsToKeep) {
    return entries; // Don't delete if we're under minimum
  }

  const now = new Date();
  const cutoffDate = new Date(
    now.getTime() - policy.maxAutoVersionAgeDays * 24 * 60 * 60 * 1000,
  );

  // Separate entries by preservation rules
  const preserved: CVHistoryEntry[] = [];
  const candidates: CVHistoryEntry[] = [];

  entries.forEach((entry) => {
    const shouldPreserve =
      // Always preserve initial version
      (policy.preserveInitialVersion && entry.isInitial) ||
      // Always preserve manually labeled versions
      (policy.preserveLabeledVersions && entry.label) ||
      // Always preserve specific change types
      policy.preserveChangeTypes.includes(entry.changeType) ||
      // Always preserve recent manual versions
      (!entry.isAutomatic && new Date(entry.timestamp) > cutoffDate);

    if (shouldPreserve) {
      preserved.push(entry);
    } else {
      candidates.push(entry);
    }
  });

  // Sort candidates by timestamp (newest first)
  candidates.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );

  // Calculate how many candidates we can keep
  const maxCandidates = Math.max(
    0,
    Math.min(
      policy.maxTotalVersions - preserved.length,
      policy.maxAutoVersions - preserved.filter((e) => e.isAutomatic).length,
    ),
  );

  // Keep the newest candidates up to the limit
  const keptCandidates = candidates.slice(0, maxCandidates);

  // Combine preserved and kept candidates
  const finalEntries = [...preserved, ...keptCandidates].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );

  // Ensure we always keep minimum versions
  if (finalEntries.length < policy.minVersionsToKeep) {
    // Add back the newest candidates to reach minimum
    const needed = policy.minVersionsToKeep - finalEntries.length;
    const additionalEntries = candidates
      .filter((entry) => !finalEntries.includes(entry))
      .slice(0, needed);

    finalEntries.push(...additionalEntries);
    finalEntries.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
  }

  return finalEntries;
}

/**
 * Get retention policy statistics
 */
export function getRetentionStats(
  entries: CVHistoryEntry[],
  policy: RetentionPolicy = DEFAULT_RETENTION_POLICY,
): {
  total: number;
  preserved: number;
  candidates: number;
  wouldDelete: number;
  nextCleanupIn: number | null;
} {
  const keptEntries = applyRetentionPolicy(entries, policy);
  const preserved = entries.filter(
    (entry) =>
      (policy.preserveInitialVersion && entry.isInitial) ||
      (policy.preserveLabeledVersions && entry.label) ||
      policy.preserveChangeTypes.includes(entry.changeType),
  ).length;

  // Calculate when next cleanup might happen (when oldest auto version expires)
  const autoEntries = entries.filter((e) => e.isAutomatic && !e.label);
  const oldestAuto =
    autoEntries.length > 0
      ? autoEntries.reduce((oldest, entry) =>
          new Date(entry.timestamp) < new Date(oldest.timestamp)
            ? entry
            : oldest,
        )
      : null;

  let nextCleanupIn: number | null = null;
  if (oldestAuto) {
    const cutoffDate =
      new Date().getTime() - policy.maxAutoVersionAgeDays * 24 * 60 * 60 * 1000;
    const oldestTime = new Date(oldestAuto.timestamp).getTime();
    if (oldestTime > cutoffDate) {
      nextCleanupIn = Math.ceil(
        (oldestTime - cutoffDate) / (24 * 60 * 60 * 1000),
      );
    }
  }

  return {
    total: entries.length,
    preserved,
    candidates: entries.length - preserved,
    wouldDelete: entries.length - keptEntries.length,
    nextCleanupIn,
  };
}
