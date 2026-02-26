/**
 * Quality suggestion ID helpers for scroll-to-card navigation.
 * Ensures consistent ID format between sidebar nav items and suggestion cards.
 * IDs must be safe for use in data attributes and document.querySelector() - no brackets, dots, etc.
 */

/** Professional summary quality suggestion ID for scroll-to-card navigation */
export const PROFESSIONAL_SUMMARY_QUALITY_ID = "quality-professional_summary";

/**
 * Replace CSS selector meta-characters so the result is safe for attribute selectors.
 * Used when building IDs that will be passed to document.querySelector().
 */
function sanitizeForSelector(str: string): string {
  return str.replace(/[\[\]\.]/g, '_');
}

/**
 * Build a data-quality-suggestion-id for scroll-to-card navigation.
 * Format: quality-{section}-{itemId}-{fieldPath}
 * For custom sections, itemId should equal section when backend doesn't provide it.
 * fieldPath is sanitized to avoid breaking document.querySelector() (brackets, dots).
 */
export function buildQualitySuggestionId(
  section: string,
  itemId: string,
  fieldPath: string
): string {
  const sanitizedPath = sanitizeForSelector(fieldPath);
  return `quality-${section}-${itemId}-${sanitizedPath}`;
}

/**
 * Build suggestion ID for custom section content.
 * CustomSectionSection uses sectionId for both section and itemId.
 */
export function buildCustomSectionSuggestionId(sectionId: string): string {
  return buildQualitySuggestionId(
    sectionId,
    sectionId,
    `custom_sections[${sectionId}].content`
  );
}
