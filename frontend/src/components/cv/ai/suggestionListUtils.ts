/**
 * Shared helpers for suggestion sidebar lists (job-fit and quality).
 */

/** True if any group after fromIndex has length > 0. Used to decide showDivider after a group. */
export function hasNonEmptyGroupsAfter<T>(groups: T[][], fromIndex: number): boolean {
  return groups.slice(fromIndex + 1).some((g) => g.length > 0);
}
