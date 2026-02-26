/**
 * useQualityNavigation hook
 *
 * Extracts quality (proofread/coaching) navigation logic from SuggestionsSidebar.
 * Handles grouping issues by section, building nav item titles, and scroll-to-card click handling.
 */

import { useMemo, useCallback } from "react";
import type { CVQualityAnalysisData, Issue } from "../types/ai";
import type { CVData } from "../types/cv";
import {
  buildQualitySuggestionId,
  PROFESSIONAL_SUMMARY_QUALITY_ID,
} from "../utils/qualitySuggestionIds";
import {
  getSectionFromFieldPath,
  getQualityItemTitle,
} from "../utils/qualityTitleGenerators";

/** Navigable item for quality (proofread/coaching) results. */
export interface QualityNavItem {
  id: string;
  title: string;
  section: string;
  /** When set, scroll to [data-item-id]; otherwise scroll to [data-section]. */
  itemId: string | null;
}

export interface GroupedQualitySuggestions {
  professionalSummary: QualityNavItem[];
  personalInfo: QualityNavItem[];
  customSections: QualityNavItem[];
  workExperience: QualityNavItem[];
  education: QualityNavItem[];
  skills: QualityNavItem[];
}

function buildNavItemFromIssue(
  issue: Issue,
  cvData: CVData | null | undefined
): QualityNavItem | null {
  const fieldPath = issue.field_path;
  if (!fieldPath) return null;
  const section = getSectionFromFieldPath(fieldPath);
  if (section === "professional_summary" || section === "skills") return null;
  const itemId = issue.item_id ?? "";
  const isCustomSection = /^custom_sections\[/.test(fieldPath);
  const title = getQualityItemTitle(issue, cvData);
  const effectiveItemId = isCustomSection ? (itemId || section) : (itemId || "single");
  const id = buildQualitySuggestionId(section, effectiveItemId, fieldPath);
  return {
    id,
    title,
    section,
    itemId: isCustomSection ? null : (itemId || null),
  };
}

function groupIssuesIntoNavItems(
  issues: Issue[],
  cvData: CVData | null | undefined
): {
  personalInfo: QualityNavItem[];
  customSectionsBySectionId: Map<string, QualityNavItem[]>;
  workExperience: QualityNavItem[];
  education: QualityNavItem[];
} {
  const personalInfo: QualityNavItem[] = [];
  const customSectionsBySectionId = new Map<string, QualityNavItem[]>();
  const workExperience: QualityNavItem[] = [];
  const education: QualityNavItem[] = [];
  const isDev = process.env.NODE_ENV === "development";

  issues.forEach((issue) => {
    const navItem = buildNavItemFromIssue(issue, cvData);
    if (!navItem) {
      if (isDev) {
        console.debug(
          "[useQualityNavigation] Skipped issue (no nav item):",
          issue.field_path,
          getSectionFromFieldPath(issue.field_path ?? "")
        );
      }
      return;
    }
    const { section } = navItem;
    const isCustomSection = /^custom_sections\[/.test(issue.field_path ?? "");
    if (section === "personal_info") personalInfo.push(navItem);
    else if (section === "work_experience") workExperience.push(navItem);
    else if (section === "education") education.push(navItem);
    else if (isCustomSection) {
      const list = customSectionsBySectionId.get(section) ?? [];
      list.push(navItem);
      customSectionsBySectionId.set(section, list);
    }
  });

  return {
    personalInfo,
    customSectionsBySectionId,
    workExperience,
    education,
  };
}

export { getSectionFromFieldPath } from "../utils/qualityTitleGenerators";

/**
 * Total count of quality nav items (issues + professional summary + skills).
 * Matches the count shown in SuggestionsSidebar so the tab badge and list stay in sync.
 */
export function getTotalQualityIssueCount(
  qualityAnalysis: CVQualityAnalysisData | null,
  cvData: CVData | null | undefined
): number {
  const modeMatch =
    qualityAnalysis?.correction_mode === "proofread" ||
    qualityAnalysis?.correction_mode === "coaching";
  if (!qualityAnalysis || !modeMatch) return 0;

  const hasProfSummary = !!(
    qualityAnalysis.professional_summary?.html_diff ||
    qualityAnalysis.professional_summary?.suggested_text
  );
  const techCount = qualityAnalysis.skills?.technical?.length ?? 0;
  const softCount = qualityAnalysis.skills?.soft?.length ?? 0;
  const hasSkills = techCount + softCount > 0;

  const { personalInfo, customSectionsBySectionId, workExperience, education } =
    groupIssuesIntoNavItems(qualityAnalysis.issues ?? [], cvData);
  let customCount = 0;
  for (const list of customSectionsBySectionId.values()) customCount += list.length;

  return (
    (hasProfSummary ? 1 : 0) +
    (hasSkills ? 1 : 0) +
    personalInfo.length +
    customCount +
    workExperience.length +
    education.length
  );
}

/** Options for scroll-to behavior; isFallback true when scrolling to section/item instead of exact card. */
export type ScrollToElementOptions = { isFallback?: boolean };

export function useQualityNavigation(
  qualityAnalysis: CVQualityAnalysisData | null,
  cvData: CVData | null | undefined,
  scrollToElement: (targetElement: HTMLElement, options?: ScrollToElementOptions) => void
): {
  groupedSuggestions: GroupedQualitySuggestions;
  totalCount: number;
  qualityListTitle: string;
  handleItemClick: (item: QualityNavItem) => void;
} {
  const groupedSuggestions = useMemo((): GroupedQualitySuggestions => {
    const empty: GroupedQualitySuggestions = {
      professionalSummary: [],
      personalInfo: [],
      customSections: [],
      workExperience: [],
      education: [],
      skills: [],
    };
    const modeMatch =
      qualityAnalysis?.correction_mode === "proofread" ||
      qualityAnalysis?.correction_mode === "coaching";
    if (!qualityAnalysis || !modeMatch) return empty;

    const professionalSummary: QualityNavItem[] = [];
    const skills: QualityNavItem[] = [];

    if (
      qualityAnalysis.professional_summary?.html_diff ||
      qualityAnalysis.professional_summary?.suggested_text
    ) {
      professionalSummary.push({
        id: PROFESSIONAL_SUMMARY_QUALITY_ID,
        title: "Professional Summary",
        section: "professional_summary",
        itemId: null,
      });
    }

    const techCount = qualityAnalysis.skills?.technical?.length ?? 0;
    const softCount = qualityAnalysis.skills?.soft?.length ?? 0;
    if (techCount + softCount > 0) {
      skills.push({
        id: "quality-skills",
        title: `Skills (${techCount + softCount} issue${techCount + softCount !== 1 ? "s" : ""})`,
        section: "skills",
        itemId: null,
      });
    }

    const { personalInfo, customSectionsBySectionId, workExperience, education } =
      groupIssuesIntoNavItems(qualityAnalysis.issues ?? [], cvData);

    const customSections: QualityNavItem[] = [];
    for (const cs of cvData?.custom_sections ?? []) {
      customSections.push(...(customSectionsBySectionId.get(cs.id) ?? []));
    }

    return {
      personalInfo,
      customSections,
      workExperience,
      education,
      skills,
      professionalSummary,
    };
  }, [qualityAnalysis, cvData]);

  const totalCount =
    groupedSuggestions.professionalSummary.length +
    groupedSuggestions.personalInfo.length +
    groupedSuggestions.customSections.length +
    groupedSuggestions.workExperience.length +
    groupedSuggestions.education.length +
    groupedSuggestions.skills.length;

  const qualityListTitle =
    qualityAnalysis?.correction_mode === "coaching"
      ? "Writing style issues"
      : "Spelling and grammar issues";

  const isDev = process.env.NODE_ENV === "development";

  const handleItemClick = useCallback(
    (item: QualityNavItem) => {
      const cardSelector = `[data-quality-suggestion-id="${item.id}"]`;
      const cardElement = document.querySelector(cardSelector) as HTMLElement;
      if (cardElement) {
        try {
          scrollToElement(cardElement);
        } catch (err) {
          console.error("[useQualityNavigation] scrollToElement failed:", err);
          if (isDev) {
            console.debug("[useQualityNavigation] item:", item);
          }
        }
        return;
      }
      const fallbackSelector = item.itemId
        ? `[data-item-id="${item.itemId}"]`
        : `[data-section="${item.section}"]`;
      const targetElement = document.querySelector(fallbackSelector) as HTMLElement;
      if (!targetElement) {
        console.warn(
          `SuggestionsSidebar: Could not find ${cardSelector} or ${fallbackSelector} for "${item.title}".`
        );
        return;
      }
      try {
        scrollToElement(targetElement, { isFallback: true });
      } catch (err) {
        console.error("[useQualityNavigation] scrollToElement failed:", err);
        if (isDev) {
          console.debug("[useQualityNavigation] item:", item);
        }
      }
    },
    [scrollToElement]
  );

  return {
    groupedSuggestions,
    totalCount,
    qualityListTitle,
    handleItemClick,
  };
}
