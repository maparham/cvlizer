/**
 * CV Completeness utility for validating CV data sufficiency.
 *
 * This module provides validation logic to check if a CV has sufficient
 * content for AI operations like job fit analysis.
 *
 * Key responsibilities:
 * - Calculate CV completeness score (0-100)
 * - Identify missing required content
 * - Provide detailed breakdown of CV sufficiency
 *
 * Usage:
 * - Call calculateCVCompleteness with CV parsed_data
 * - Check isComplete to enable/disable AI features
 * - Use missing array to show user what to add
 *
 * Threshold: At least 1 work experience AND 3+ skills
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
 * Calculate CV completeness score and identify missing content.
 *
 * Scoring:
 * - Work experience with description/achievements: 50 points
 * - At least 3 skills (technical + soft combined): 50 points
 * - Total: 100 points = complete and ready for AI features
 *
 * @param cvData - Parsed CV data object
 * @returns CVCompletenessResult with score, completion status, and missing items
 */
export function calculateCVCompleteness(cvData: any): CVCompletenessResult {
  const missing: string[] = [];
  let score = 0;

  // Check work experience (50 points)
  const workExp = cvData?.work_experience || [];
  const hasWorkExp =
    workExp.length > 0 &&
    workExp.some((exp: any) => (exp.description && exp.description.trim().length > 0) || exp.achievements);

  if (hasWorkExp) {
    score += 50;
  } else {
    missing.push("work experience with description or achievements");
  }

  // Check skills (50 points - requires 3+)
  const skills = cvData?.skills || {};
  const technicalSkills = skills.technical || [];
  const softSkills = skills.soft || [];
  const totalSkills = technicalSkills.length + softSkills.length;

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
