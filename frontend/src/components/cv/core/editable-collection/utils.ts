/**
 * Utility functions for IndividualItemSection component
 */
import { CVValidationService } from "../../../../services/cvValidationService";

/**
 * Maps section titles to their corresponding section IDs
 */
export const getSectionId = (title: string): string => {
  const sectionIdMap: Record<string, string> = {
    "Awards & Recognition": "awards",
    Certifications: "certifications",
    Education: "education",
    Projects: "projects",
    Publications: "publications",
    "Volunteer Experience": "volunteer_experience",
    "Work Experience": "work_experience",
  };
  return sectionIdMap[title] || title.toLowerCase().replace(/\s+/g, "_");
};

/**
 * Converts plural section titles to singular form
 */
export const getSingularTitle = (pluralTitle: string): string => {
  const titleMap: Record<string, string> = {
    "Work Experience": "Work Experience",
    Education: "Education",
    Projects: "Project",
    Awards: "Award",
    "Awards & Recognition": "Award",
    Certifications: "Certification",
    Publications: "Publication",
    "Volunteer Experience": "Volunteer Experience",
    Skills: "Skill",
  };

  return titleMap[pluralTitle] || pluralTitle.slice(0, -1);
};

/**
 * Parses date string to Date object for comparison
 * Handles various date formats (YYYY-MM-DD, YYYY-MM, YYYY)
 */
export const parseDate = (dateStr: string): Date => {
  if (!dateStr) return new Date(0); // Treat empty dates as oldest

  // Handle various date formats (YYYY-MM-DD, YYYY-MM, YYYY)
  const cleanDate = dateStr.replace(/[^\d-]/g, ""); // Remove non-date characters

  if (cleanDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return new Date(cleanDate);
  } else if (cleanDate.match(/^\d{4}-\d{2}$/)) {
    return new Date(`${cleanDate}-01`);
  } else if (cleanDate.match(/^\d{4}$/)) {
    return new Date(`${cleanDate}-01-01`);
  }

  const date = new Date(cleanDate);
  return isNaN(date.getTime()) ? new Date(0) : date;
};

/**
 * Validates if all required fields in an item are filled
 * Uses centralized validation service for consistency
 */
export const validateItem = <T>(
  item: T | null,
  requiredFields: (keyof T)[],
  sectionTitle?: string,
  fieldConstraints?: Partial<Record<keyof T, { minLength?: number }>>,
): boolean => {
  return CVValidationService.validateItem(
    item,
    requiredFields,
    sectionTitle || "",
    fieldConstraints,
  );
};

/**
 * Sorts items by a date field
 */
export const sortItemsByDate = <T>(
  items: T[],
  field: keyof T,
  direction: "asc" | "desc",
): T[] => {
  return [...items].sort((a, b) => {
    const dateA = parseDate(String(a[field] || ""));
    const dateB = parseDate(String(b[field] || ""));

    const comparison = dateA.getTime() - dateB.getTime();
    return direction === "asc" ? comparison : -comparison;
  });
};

/**
 * Checks if an item has unsaved changes compared to the original
 * Uses centralized validation service for consistency
 */
export const hasUnsavedChanges = <T>(
  editData: T | null,
  originalItem: T | null,
  isNewItem: boolean,
): boolean => {
  if (!editData) return false;

  if (isNewItem) {
    // For new items, check if the form has any non-empty values
    return Object.values(editData).some(
      (value) => value !== undefined && value !== null && value !== "",
    );
  } else {
    // For existing items, use centralized validation service
    return CVValidationService.hasUnsavedChanges(editData, originalItem);
  }
};

/**
 * Reorders an array by moving an item from one index to another
 */
export const reorderItems = <T>(
  items: T[],
  sourceIndex: number,
  destinationIndex: number,
): T[] => {
  const newItems = [...items];
  const [reorderedItem] = newItems.splice(sourceIndex, 1);
  newItems.splice(destinationIndex, 0, reorderedItem);
  return newItems;
};

/**
 * Moves an item up in the array (decreases index by 1)
 */
export const moveItemUp = <T>(items: T[], index: number): T[] => {
  if (index === 0) return items; // Already at top
  return reorderItems(items, index, index - 1);
};

/**
 * Moves an item down in the array (increases index by 1)
 */
export const moveItemDown = <T>(items: T[], index: number): T[] => {
  if (index === items.length - 1) return items; // Already at bottom
  return reorderItems(items, index, index + 1);
};
