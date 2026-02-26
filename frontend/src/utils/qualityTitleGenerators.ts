/**
 * Quality suggestion title generators.
 * Section-specific logic for building nav item titles from CV quality issues.
 */

import type { Issue } from "../types/ai";
import type {
  CVData,
  WorkExperience,
  Education,
  Certification,
  Project,
  Award,
  Publication,
  VolunteerExperience,
} from "../types/cv";

/** Derive top-level section from Issue.field_path for scroll target. */
export function getSectionFromFieldPath(fieldPath: string): string {
  if (fieldPath.startsWith("work_experience")) return "work_experience";
  if (fieldPath.startsWith("education")) return "education";
  if (fieldPath.startsWith("professional_summary")) return "professional_summary";
  if (fieldPath.startsWith("personal_info")) return "personal_info";
  if (fieldPath.startsWith("skills")) return "skills";
  if (fieldPath.startsWith("certifications")) return "certifications";
  if (fieldPath.startsWith("projects")) return "projects";
  if (fieldPath.startsWith("awards")) return "awards";
  if (fieldPath.startsWith("publications")) return "publications";
  if (fieldPath.startsWith("volunteer_experience")) return "volunteer_experience";
  const match = fieldPath.match(/^custom_sections\[([^\]]+)\]/);
  if (match) return match[1];
  return fieldPath.split(".")[0] ?? fieldPath;
}

/**
 * Section-specific title generators for getQualityItemTitle.
 * When adding many more section types, consider a data-driven or strategy pattern to keep this module maintainable.
 */
const TITLE_GENERATORS: Record<
  string,
  (issue: Issue, cvData: CVData | null | undefined) => string
> = {
  professional_summary: () => "Professional Summary",
  personal_info: () => "Personal Info",
  skills: () => "Skills",
  work_experience: (issue, cvData) => {
    const itemId = issue.item_id ?? "";
    if (!itemId || !cvData?.work_experience?.length) return "Work Experience item";
    const workExp = cvData.work_experience.find((e: WorkExperience) => e.id === itemId);
    if (!workExp) return "Work Experience item";
    return `${workExp.position || "Position"} at ${workExp.company || "Company"}`;
  },
  education: (issue, cvData) => {
    const itemId = issue.item_id ?? "";
    if (!itemId || !cvData?.education?.length) return "Education item";
    const edu = cvData.education.find((e: Education) => e.id === itemId);
    if (!edu) return "Education item";
    return `${edu.degree || "Degree"} at ${edu.institution || "Institution"}`;
  },
  certifications: (issue, cvData) => {
    const itemId = issue.item_id ?? "";
    if (!itemId || !cvData?.certifications?.length) return "Certification";
    const cert = cvData.certifications.find((c: Certification) => c.id === itemId);
    return cert?.name ?? "Certification";
  },
  projects: (issue, cvData) => {
    const itemId = issue.item_id ?? "";
    if (!itemId || !cvData?.projects?.length) return "Project";
    const proj = cvData.projects.find((p: Project) => p.id === itemId);
    return proj?.name ?? "Project";
  },
  awards: (issue, cvData) => {
    const itemId = issue.item_id ?? "";
    if (!itemId || !cvData?.awards?.length) return "Award";
    const award = cvData.awards.find((a: Award) => a.id === itemId);
    return award?.name ?? "Award";
  },
  publications: (issue, cvData) => {
    const itemId = issue.item_id ?? "";
    if (!itemId || !cvData?.publications?.length) return "Publication";
    const pub = cvData.publications.find((p: Publication) => p.id === itemId);
    return pub?.title ?? "Publication";
  },
  volunteer_experience: (issue, cvData) => {
    const itemId = issue.item_id ?? "";
    if (!itemId || !cvData?.volunteer_experience?.length) return "Volunteer experience";
    const vol = cvData.volunteer_experience.find((v: VolunteerExperience) => v.id === itemId);
    if (!vol) return "Volunteer experience";
    return `${vol.position || "Position"} at ${vol.organization || "Organization"}`;
  },
};

/**
 * Build display title for a quality nav item from issue and CV data.
 */
export function getQualityItemTitle(
  issue: Issue,
  cvData: CVData | null | undefined
): string {
  const section = getSectionFromFieldPath(issue.field_path ?? "");
  const itemId = issue.item_id ?? "";
  const generator = TITLE_GENERATORS[section];
  if (generator) return generator(issue, cvData);
  if (cvData?.custom_sections?.length && itemId) {
    const custom = cvData.custom_sections.find((s) => s.id === itemId);
    if (custom?.title) return custom.title;
  }
  return "Custom section";
}
