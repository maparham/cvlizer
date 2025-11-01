/**
 * Duplicate Checking Utilities
 *
 * Functions for detecting duplicate entries in CV sections.
 */

export const checkForDuplicates = (
  items: any[],
  fields: string[],
): { hasDuplicates: boolean; duplicates: number[] } => {
  const duplicates: number[] = [];
  const seen = new Set<string>();

  items.forEach((item, index) => {
    const key = fields.map((field) => item[field] || "").join("|");
    if (seen.has(key)) {
      duplicates.push(index);
    } else {
      seen.add(key);
    }
  });

  return {
    hasDuplicates: duplicates.length > 0,
    duplicates,
  };
};
