/**
 * useJobFitNavigation hook
 *
 * Extracts job-fit suggestion navigation logic from SuggestionsSidebar.
 * Handles grouping suggestions by section, building nav item titles, and scroll-to-item click handling.
 */

import { useMemo, useCallback } from "react";
import type { CVData, WorkExperience, Education } from "../types/cv";
import type {
  AllSuggestionsResponse,
  SkillSuggestion,
  ProfessionalSummarySuggestion,
  ItemDescriptionSuggestion,
} from "../types/ai";
import type { ScrollToElementOptions } from "../utils/scrollToElement";

/** Navigable item for job-fit suggestions. */
export interface JobFitNavItem {
  id: string;
  title: string;
  section: string;
  type: "why_good_fit" | "skill" | "summary" | "work_experience" | "education";
}

export interface GroupedJobFitSuggestions {
  whyGoodFit: JobFitNavItem[];
  skills: JobFitNavItem[];
  professionalSummary: JobFitNavItem[];
  workExperience: JobFitNavItem[];
  education: JobFitNavItem[];
}

export function useJobFitNavigation(
  allSuggestions: AllSuggestionsResponse | null,
  cvData: CVData | null | undefined,
  scrollToElement: (targetElement: HTMLElement, options?: ScrollToElementOptions) => void
): {
  groupedSuggestions: GroupedJobFitSuggestions;
  totalCount: number;
  handleItemClick: (item: JobFitNavItem) => void;
} {
  // Helper function to get shortened title for a suggestion
  const getSuggestionTitle = useCallback(
    (
      suggestion:
        | SkillSuggestion
        | ProfessionalSummarySuggestion
        | ItemDescriptionSuggestion,
      type: "skill" | "summary" | "work_experience" | "education"
    ): string => {
      switch (type) {
        case "skill": {
          const skillSuggestion = suggestion as SkillSuggestion;
          return `Add ${skillSuggestion.skill}`;
        }
        case "summary":
          return "Improve Professional Summary";
        case "work_experience": {
          const itemSuggestion = suggestion as ItemDescriptionSuggestion;
          // Find the work experience item in cvData
          if (
            cvData?.work_experience &&
            Array.isArray(cvData.work_experience) &&
            cvData.work_experience.length > 0
          ) {
            const workExp = cvData.work_experience.find(
              (item: WorkExperience) => item.id === itemSuggestion.id
            );
            if (workExp) {
              const position = workExp.position || "Position";
              const company = workExp.company || "Company";
              return `Improve ${position} at ${company}`;
            }
          }
          return "Improve Work Experience Item";
        }
        case "education": {
          const itemSuggestion = suggestion as ItemDescriptionSuggestion;
          // Find the education item in cvData
          if (
            cvData?.education &&
            Array.isArray(cvData.education) &&
            cvData.education.length > 0
          ) {
            const edu = cvData.education.find(
              (item: Education) => item.id === itemSuggestion.id
            );
            if (edu) {
              const degree = edu.degree || "Degree";
              const institution = edu.institution || "Institution";
              return `Improve ${degree} at ${institution}`;
            }
          }
          return "Improve Education Item";
        }
        default:
          return "Suggestion";
      }
    },
    [cvData]
  );

  // Group all suggestions by section
  const groupedSuggestions = useMemo((): GroupedJobFitSuggestions => {
    if (!allSuggestions) {
      return {
        whyGoodFit: [],
        skills: [],
        professionalSummary: [],
        workExperience: [],
        education: [],
      };
    }

    const whyGoodFit: JobFitNavItem[] = [];
    const skills: JobFitNavItem[] = [];
    const professionalSummary: JobFitNavItem[] = [];
    const workExperience: JobFitNavItem[] = [];
    const education: JobFitNavItem[] = [];

    // Add why_good_fit suggestion (FIRST priority)
    // Only show if both fit_analysis and title exist
    if (
      allSuggestions.why_good_fit?.fit_analysis &&
      allSuggestions.why_good_fit?.title
    ) {
      whyGoodFit.push({
        id: "why_good_fit",
        title: allSuggestions.why_good_fit.title,
        section: "why_good_fit",
        type: "why_good_fit",
      });
    }

    // Add skill suggestions from all dynamic categories.
    Object.entries(allSuggestions.skills || {}).forEach(([category, suggestions]) => {
      suggestions.forEach((skill) => {
        skills.push({
          id: `skill-${category}-${skill.skill}`,
          title: getSuggestionTitle(skill, "skill"),
          section: "skills",
          type: "skill",
        });
      });
    });

    // Add professional summary suggestion
    if (allSuggestions.professional_summary?.suggested_text) {
      professionalSummary.push({
        id: "professional_summary",
        title: getSuggestionTitle(allSuggestions.professional_summary, "summary"),
        section: "professional_summary",
        type: "summary",
      });
    }

    // Add work experience suggestions
    allSuggestions.work_experience?.forEach((suggestion) => {
      if (suggestion.suggested) {
        workExperience.push({
          id: `work_experience-${suggestion.id}`,
          title: getSuggestionTitle(suggestion, "work_experience"),
          section: "work_experience",
          type: "work_experience",
        });
      }
    });

    // Add education suggestions
    allSuggestions.education?.forEach((suggestion) => {
      if (suggestion.suggested) {
        education.push({
          id: `education-${suggestion.id}`,
          title: getSuggestionTitle(suggestion, "education"),
          section: "education",
          type: "education",
        });
      }
    });

    return {
      whyGoodFit,
      skills,
      professionalSummary,
      workExperience,
      education,
    };
  }, [allSuggestions, getSuggestionTitle]);

  const totalCount =
    groupedSuggestions.whyGoodFit.length +
    groupedSuggestions.skills.length +
    groupedSuggestions.professionalSummary.length +
    groupedSuggestions.workExperience.length +
    groupedSuggestions.education.length;

  // Handle clicking on a suggestion item - scroll to its section or specific item
  const handleItemClick = useCallback(
    (item: JobFitNavItem) => {
      let selector: string;
      if (item.type === "why_good_fit") {
        selector = '[data-section="why_good_fit_draft"]';
      } else if (item.type === "work_experience" || item.type === "education") {
        const prefix = `${item.section}-`;
        const itemId = item.id.startsWith(prefix)
          ? item.id.substring(prefix.length)
          : item.id;
        selector = `[data-item-id="${itemId}"]`;
      } else {
        selector = `[data-section="${item.section}"]`;
      }
      const targetElement = document.querySelector(selector) as HTMLElement;
      if (!targetElement) {
        console.warn(
          `SuggestionsSidebar: Could not find ${selector} for "${item.title}".`
        );
        return;
      }
      scrollToElement(targetElement);
    },
    [scrollToElement]
  );

  return {
    groupedSuggestions,
    totalCount,
    handleItemClick,
  };
}
