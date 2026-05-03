/**
 * Pure helpers to derive CVSection[] from CVData (order, emptiness).
 * Shared by the PDF editor hook, section management, and public read-only view.
 */

import {
  AVAILABLE_SECTIONS,
  getSectionsInDisplayOrder,
} from "../components/cv/constants";
import type { CVData, CVSection, CVSectionType } from "../types";

/** True if the section has no meaningful content for display/config purposes. */
export function isSectionEmpty(sectionId: string, cvData: CVData): boolean {
  const customItem = cvData.custom_sections?.find((s) => s.id === sectionId);
  if (customItem !== undefined) {
    return !customItem.content || customItem.content.trim() === "";
  }

  const data = cvData[sectionId as keyof CVData];
  if (!data) return true;

  if (Array.isArray(data)) {
    return data.length === 0;
  }

  if (typeof data === "object") {
    if (sectionId === "personal_info") {
      return false;
    }

    if (sectionId === "skills") {
      const skills = data as { technical?: Record<string, string[]> };
      const technical = skills.technical || {};
      return !Object.values(technical).some(
        (categorySkills) => Array.isArray(categorySkills) && categorySkills.length > 0,
      );
    }

    return Object.keys(data).length === 0;
  }

  return false;
}

/**
 * Build section list from CV data when section_config is absent: predefined
 * sections that have data (display order), then all custom_sections entries.
 */
export function buildCvSectionsFromData(
  cvData: CVData | null | undefined,
): CVSection[] {
  if (!cvData) return [];

  const sections: CVSection[] = [];
  let order = 0;

  const sectionsWithData = getSectionsInDisplayOrder(
    AVAILABLE_SECTIONS.filter((section) => {
      return !isSectionEmpty(section.id, cvData);
    }).map((s) => s.id),
  );

  sectionsWithData.forEach((sectionDef) => {
    sections.push({
      id: sectionDef.id,
      type: sectionDef.id as CVSectionType,
      title: sectionDef.name,
      visible: true,
      order: order++,
    });
  });

  const customSections = cvData.custom_sections ?? [];
  customSections.forEach((item) => {
    sections.push({
      id: item.id,
      type: "custom" as CVSectionType,
      title: item.title || "Section",
      visible: true,
      order: order++,
    });
  });

  return sections;
}
