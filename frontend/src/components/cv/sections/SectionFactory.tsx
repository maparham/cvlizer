/**
 * Section Factory Component
 *
 * This factory component dynamically renders the appropriate section component
 * based on section type. It provides a centralized way to manage section rendering.
 *
 * Key responsibilities:
 * - Map section types to their corresponding components
 * - Maintain consistent props interface across section types
 * - Simplify section rendering logic
 *
 * Usage:
 * - Replace direct section imports with SectionFactory
 * - Pass section type to dynamically render appropriate component
 */

import React from "react";
import { SectionProps } from "../../../types";

// Import sections
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

// Map of sections
const SECTIONS = {
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

const SectionFactory: React.FC<SectionFactoryProps> = ({
  sectionType,
  sectionTitle,
  onSectionTitleSave,
  ...props
}) => {
  const SectionComponent = SECTIONS[sectionType];

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
};

// Export types
export type { SectionType };
