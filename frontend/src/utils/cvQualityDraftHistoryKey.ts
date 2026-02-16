/**
 * Draft history key for CV quality field_draft_histories.
 *
 * Must stay in sync with backend get_draft_history_key() in
 * backend/src/api/ai/quality_analysis_helpers.py.
 */

/**
 * Normalize itemId by stripping work_/edu_ prefix so it matches backend-stored keys.
 * Frontend section ids use work_<uuid> / edu_<uuid>; draft history keys use the raw uuid.
 */
function normalizeItemId(itemId: string): string {
  if (itemId.startsWith('work_') && itemId.length > 5) return itemId.slice(5);
  if (itemId.startsWith('edu_') && itemId.length > 4) return itemId.slice(4);
  return itemId;
}

/**
 * True if fieldPath refers to a work_experience description field.
 * Accepts both dot notation (work_experience.<id>.description) and bracket
 * notation (work_experience[0].description) to match backend AI output.
 */
function isWorkExperienceDescriptionPath(fieldPath: string): boolean {
  return (
    (fieldPath.startsWith('work_experience.') ||
      fieldPath.startsWith('work_experience[')) &&
    fieldPath.endsWith('.description')
  );
}

/**
 * True if fieldPath refers to an education description field.
 * Accepts both dot notation (education.<id>.description) and bracket
 * notation (education[0].description) to match backend AI output.
 */
function isEducationDescriptionPath(fieldPath: string): boolean {
  return (
    (fieldPath.startsWith('education.') ||
      fieldPath.startsWith('education[')) &&
    fieldPath.endsWith('.description')
  );
}

/**
 * Return the field_draft_histories key for a given fieldPath and itemId.
 * For work_experience/education description fields (including bracket notation
 * e.g. work_experience[0].description), the key is work_experience.<id>.description
 * or education.<id>.description. Otherwise the key is fieldPath as-is.
 */
export function getDraftHistoryKey(fieldPath: string, itemId: string | null): string {
  const idForKey = itemId ? normalizeItemId(itemId) : null;
  if (idForKey && isWorkExperienceDescriptionPath(fieldPath)) {
    return `work_experience.${idForKey}.description`;
  }
  if (idForKey && isEducationDescriptionPath(fieldPath)) {
    return `education.${idForKey}.description`;
  }
  return fieldPath;
}
