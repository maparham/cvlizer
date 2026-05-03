/**
 * CV Completeness utility for validating CV data sufficiency.
 *
 * This module provides validation logic to check if a CV has sufficient
 * content for AI operations like job fit analysis.
 *
 * Key responsibilities:
 * - Filter CV data to only visible sections
 * - Calculate CV completeness score (0-100)
 * - Identify missing required content
 * - Provide detailed breakdown of CV sufficiency
 *
 * Usage:
 * - Call calculateCVCompleteness with CV parsed_data
 * - Check isComplete to enable/disable AI features
 * - Use missing array to show user what to add
 *
 * Threshold: At least 1 work experience AND 3+ skills (from visible sections only)
 */

export interface CVCompletenessResult {
  score: number; // 0-100
  isComplete: boolean;
  missing: string[];
  details: {
    hasWorkExperience: boolean;
    hasSkills: boolean;
    skillCount: number;
    workExpCount: number;
  };
}

/**
 * Filter CV data to only include visible sections.
 * Mirrors backend logic in backend/src/services/ai_service/cv_filter.py
 *
 * This ensures that hidden sections don't affect CV completeness calculations
 * or AI generation operations.
 *
 * @param cvData - Complete CV data object including section_config
 * @returns Filtered CV data with only visible sections
 *
 * Note:
 * - If no section_config exists, all sections are treated as visible (backward compatibility)
 * - personal_info is always preserved (never filtered)
 * - Sections default to visible if visibility flag is not specified
 */
export function filterVisibleSections(cvData: any): any {
  // If no section_config, treat all sections as visible (backward compatibility)
  const sectionConfig = cvData?.section_config;
  if (!sectionConfig?.sections || sectionConfig.sections.length === 0) {
    return cvData;
  }

  // Build set of visible section types
  const visibleTypes = new Set<string>();
  sectionConfig.sections.forEach((section: any) => {
    if (section.visible !== false) {
      // Default to visible if not specified
      const type = section.type || section.id;
      if (type) visibleTypes.add(type);
    }
  });

  // Create filtered copy - start with only personal_info (always preserved)
  const filtered: any = {
    personal_info: cvData.personal_info,
  };

  // Filter sections based on visibility
  const filterableSections = [
    "professional_summary",
    "work_experience",
    "education",
    "skills",
    "certifications",
    "projects",
    "awards",
    "publications",
    "volunteer_experience",
    "why_good_fit",
  ];

  filterableSections.forEach((sectionType) => {
    if (visibleTypes.has(sectionType) && cvData[sectionType]) {
      filtered[sectionType] = cvData[sectionType];
    }
  });

  // Update section_config to only include visible sections
  filtered.section_config = {
    sections: sectionConfig.sections.filter((s: any) => s.visible !== false),
  };

  return filtered;
}

/**
 * Calculate CV completeness score and identify missing content.
 *
 * Scoring:
 * - Work experience with description/achievements: 50 points
 * - At least 3 skills across skills.technical categories: 50 points
 * - Total: 100 points = complete and ready for AI features
 *
 * Note: Only counts visible sections. Hidden sections are filtered out before scoring.
 *
 * @param cvData - Parsed CV data object
 * @returns CVCompletenessResult with score, completion status, and missing items
 */
export function calculateCVCompleteness(cvData: any): CVCompletenessResult {
  // Filter to only visible sections before checking completeness
  const visibleData = filterVisibleSections(cvData);

  const missing: string[] = [];
  let score = 0;

  // Check work experience (50 points)
  const workExp = visibleData?.work_experience || [];
  const hasWorkExp =
    workExp.length > 0 &&
    workExp.some((exp: any) => (exp.description && exp.description.trim().length > 0) || exp.achievements);

  if (hasWorkExp) {
    score += 50;
  } else {
    missing.push("work experience with description or achievements");
  }

  // Check skills (50 points - requires 3+ across all categories)
  const skills = visibleData?.skills || {};
  const technical = skills.technical || {};
  const totalSkills = Object.values(technical).reduce((sum: number, value: unknown) => {
    return sum + (Array.isArray(value) ? value.length : 0);
  }, 0);

  if (totalSkills >= 3) {
    score += 50;
  } else if (totalSkills > 0) {
    score += Math.floor((totalSkills / 3) * 50);
    missing.push(
      `${3 - totalSkills} more skill(s) (currently have ${totalSkills})`
    );
  } else {
    missing.push("at least 3 skills");
  }

  return {
    score,
    isComplete: score === 100,
    missing,
    details: {
      hasWorkExperience: hasWorkExp,
      hasSkills: totalSkills >= 3,
      skillCount: totalSkills,
      workExpCount: workExp.length,
    },
  };
}
