/**
 * Section Factory Component
 *
 * This factory component dynamically renders the appropriate section component
 * based on whether inline diff mode is active. It provides a seamless way to
 * switch between regular sections and their diff-enabled counterparts.
 *
 * Key responsibilities:
 * - Detect if inline diff mode is active
 * - Render diff-enabled sections when in diff mode
 * - Fall back to regular sections when not in diff mode
 * - Maintain consistent props interface across section types
 * - Handle section-specific diff integrations
 *
 * Usage:
 * - Replace direct section imports with SectionFactory
 * - Automatically handles switching between regular and diff modes
 * - Maintains backward compatibility with existing section props
 */

import React from "react";
import { SectionProps } from "../../../types";
import { useInlineDiffContext } from "../../../contexts/InlineDiffContext";

// Import regular sections
import PersonalInfoSection from "./PersonalInfoSection";
import ProfessionalSummarySection from "./ProfessionalSummarySection";
import WorkExperienceSection from "./WorkExperienceSection";
import EducationSection from "./EducationSection";
import SkillsSection from "./SkillsSection";
import CertificationsSection from "./CertificationsSection";
import ProjectsSection from "./ProjectsSection";
import AwardsSection from "./AwardsSection";
import PublicationsSection from "./PublicationsSection";
import VolunteerExperienceSection from "./VolunteerExperienceSection";
import WhyGoodFitSection from "./WhyGoodFitSection";

// Import diff-enabled sections
import SkillsSectionWithDiff from "./SkillsSectionWithDiff";
import ProfessionalSummarySectionWithDiff from "./ProfessionalSummarySectionWithDiff";

// Section type mapping
type SectionType =
  | "personal_info"
  | "professional_summary"
  | "work_experience"
  | "education"
  | "skills"
  | "certifications"
  | "projects"
  | "awards"
  | "publications"
  | "volunteer_experience"
  | "why_good_fit";

interface SectionFactoryProps extends SectionProps {
  sectionType: SectionType;
  cvId?: string;
  sectionTitle?: string;
  onSectionTitleSave?: (newTitle: string) => Promise<void>;
}

// Map of regular sections
const REGULAR_SECTIONS = {
  personal_info: PersonalInfoSection,
  professional_summary: ProfessionalSummarySection,
  work_experience: WorkExperienceSection,
  education: EducationSection,
  skills: SkillsSection,
  certifications: CertificationsSection,
  projects: ProjectsSection,
  awards: AwardsSection,
  publications: PublicationsSection,
  volunteer_experience: VolunteerExperienceSection,
  why_good_fit: WhyGoodFitSection,
};

// Map of diff-enabled sections (only create where needed)
const DIFF_SECTIONS = {
  skills: SkillsSectionWithDiff,
  professional_summary: ProfessionalSummarySectionWithDiff,
  // Add more diff-enabled sections as they're created
  // work_experience: WorkExperienceSectionWithDiff,
};

const SectionFactory: React.FC<SectionFactoryProps> = ({
  sectionType,
  sectionTitle,
  onSectionTitleSave,
  ...props
}) => {
  const { isInDiffMode } = useInlineDiffContext();

  // Determine which component to render
  const getSectionComponent = () => {
    // If in diff mode and a diff-enabled version exists, use it
    if (
      isInDiffMode &&
      DIFF_SECTIONS[sectionType as keyof typeof DIFF_SECTIONS]
    ) {
      return DIFF_SECTIONS[sectionType as keyof typeof DIFF_SECTIONS];
    }

    // Otherwise, use the regular section
    return REGULAR_SECTIONS[sectionType];
  };

  const SectionComponent = getSectionComponent();

  if (!SectionComponent) {
    console.warn(`Unknown section type: ${sectionType}`);
    return null;
  }

  return (
    <SectionComponent
      {...props}
      data={props.data as any}
      onUnsavedChanges={props.onUnsavedChanges as any}
      title={sectionTitle}
      onTitleSave={onSectionTitleSave}
    />
  );
};

export default SectionFactory;

// Export individual components for direct use if needed
export {
  PersonalInfoSection,
  ProfessionalSummarySection,
  WorkExperienceSection,
  EducationSection,
  SkillsSection,
  CertificationsSection,
  ProjectsSection,
  AwardsSection,
  PublicationsSection,
  VolunteerExperienceSection,
  WhyGoodFitSection,
  SkillsSectionWithDiff,
  ProfessionalSummarySectionWithDiff,
};

// Export types
export type { SectionType };
