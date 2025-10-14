/**
 * ID Generation Utilities
 *
 * Provides stable, unique ID generation for CV data items.
 * Uses crypto.randomUUID() when available, falls back to timestamp + random.
 */

/**
 * Generate a stable, unique ID for CV data items
 */
export const generateId = (): string => {
  // Use crypto.randomUUID() if available (modern browsers)
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  // Fallback: timestamp + random string
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 15);
  return `${timestamp}_${randomPart}`;
};

/**
 * Generate a prefixed ID for specific CV section types
 */
export const generateSectionId = (sectionType: string): string => {
  const prefix = getSectionPrefix(sectionType);
  return `${prefix}_${generateId()}`;
};

/**
 * Get section-specific ID prefix for better organization
 */
function getSectionPrefix(sectionType: string): string {
  const prefixes: Record<string, string> = {
    work_experience: "work",
    education: "edu",
    projects: "proj",
    certifications: "cert",
    awards: "award",
    publications: "pub",
    volunteer_experience: "vol",
    skills: "skill",
  };

  return prefixes[sectionType] || "item";
}

/**
 * Generate a deterministic ID for diff comparison
 * Uses stable, non-editable fields to create consistent IDs for the same content
 */
export const generateDeterministicId = (
  item: any,
  sectionType: string,
  index: number,
): string => {
  const prefix = getSectionPrefix(sectionType);

  // Create a deterministic hash based on stable fields only
  let contentHash = "";

  if (sectionType === "work_experience" && item.company && item.start_date) {
    // Use company + start_date (stable identifiers)
    contentHash = `${item.company}_${item.start_date}`
      .replace(/[^a-zA-Z0-9]/g, "_")
      .toLowerCase();
  } else if (
    sectionType === "education" &&
    item.institution &&
    item.start_date
  ) {
    // Use institution + start_date (stable identifiers)
    contentHash = `${item.institution}_${item.start_date}`
      .replace(/[^a-zA-Z0-9]/g, "_")
      .toLowerCase();
  } else if (sectionType === "projects" && item.name) {
    // Use name (stable identifier)
    contentHash = `${item.name}`.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
  } else if (
    sectionType === "certifications" &&
    item.name &&
    item.issuer &&
    item.date
  ) {
    // Use name + issuer + date (stable identifiers)
    contentHash = `${item.name}_${item.issuer}_${item.date}`
      .replace(/[^a-zA-Z0-9]/g, "_")
      .toLowerCase();
  } else if (sectionType === "awards" && item.name && item.date) {
    // Use name + date (stable identifiers)
    contentHash = `${item.name}_${item.date}`
      .replace(/[^a-zA-Z0-9]/g, "_")
      .toLowerCase();
  } else if (sectionType === "publications" && item.title && item.date) {
    // Use title + date (stable identifiers)
    const date = item.date;
    contentHash = `${item.title}_${date}`
      .replace(/[^a-zA-Z0-9]/g, "_")
      .toLowerCase();
  } else if (
    sectionType === "volunteer_experience" &&
    item.organization &&
    item.start_date
  ) {
    // Use organization + start_date (stable identifiers)
    contentHash = `${item.organization}_${item.start_date}`
      .replace(/[^a-zA-Z0-9]/g, "_")
      .toLowerCase();
  } else if (sectionType === "languages" && item.language && item.proficiency) {
    // Use language + proficiency (stable identifiers)
    contentHash = `${item.language}_${item.proficiency}`
      .replace(/[^a-zA-Z0-9]/g, "_")
      .toLowerCase();
  } else {
    // Fallback: use index for items without stable identifiers
    contentHash = `item_${index}`;
  }

  // Truncate if too long
  if (contentHash.length > 50) {
    contentHash = contentHash.substring(0, 50);
  }

  return `${prefix}_${contentHash}`;
};

/**
 * Ensure an object has an ID, generating one if missing
 */
export const ensureId = <T extends { id?: string }>(
  item: T,
  sectionType?: string,
): T & { id: string } => {
  if (item.id) {
    return item as T & { id: string };
  }

  const newId = sectionType ? generateSectionId(sectionType) : generateId();

  return {
    ...item,
    id: newId,
  };
};

/**
 * Ensure all items in an array have IDs
 */
export const ensureArrayItemsHaveIds = <T extends { id?: string }>(
  items: T[],
  sectionType?: string,
): Array<T & { id: string }> => {
  return items.map((item) => ensureId(item, sectionType));
};

/**
 * Ensure all items in an array have deterministic IDs for diff comparison
 * Always regenerates IDs to ensure consistency between versions
 */
export const ensureArrayItemsHaveDeterministicIds = <T extends { id?: string }>(
  items: T[],
  sectionType: string,
): Array<T & { id: string }> => {
  return items.map((item, index) => {
    // Always generate deterministic ID, even if one exists
    // This ensures both old and new data get the same IDs
    return {
      ...item,
      id: generateDeterministicId(item, sectionType, index),
    };
  });
};
