/**
 * Canonical field paths for CV quality description fields.
 * Used for API field-retry and draft history keys; avoids magic strings.
 */

export const FIELD_PATHS = {
  WORK_EXPERIENCE_DESC: 'work_experience.description',
  EDUCATION_DESC: 'education.description',
} as const;

/**
 * Returns true if the field path refers to a description field (work experience,
 * education, or generic .description). Used to decide when to clear draft history.
 */
export function isDescriptionFieldPath(fieldPath: string): boolean {
  return (
    fieldPath.endsWith('.description') ||
    fieldPath === FIELD_PATHS.EDUCATION_DESC ||
    fieldPath === FIELD_PATHS.WORK_EXPERIENCE_DESC
  );
}

/**
 * Returns true if both paths are description-style paths (for matching issue to
 * dismissal request when backend may use different path formats).
 */
export function bothAreDescriptionField(a: string, b: string): boolean {
  const desc = (p: string) =>
    p.endsWith('.description') ||
    p === FIELD_PATHS.EDUCATION_DESC ||
    p === FIELD_PATHS.WORK_EXPERIENCE_DESC;
  return desc(a) && desc(b);
}
