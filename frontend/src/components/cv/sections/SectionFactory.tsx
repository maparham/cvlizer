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
import WorkExperienceSection from "./WorkExperienceSection";
import EducationSection from "./EducationSection";
import SkillsSection from "./SkillsSection";
import CertificationsSection from "./CertificationsSection";
import ProjectsSection from "./ProjectsSection";
import AwardsSection from "./AwardsSection";
import PublicationsSection from "./PublicationsSection";
import VolunteerExperienceSection from "./VolunteerExperienceSection";
import CustomSectionSection from "./CustomSectionSection";

// Section type mapping (why_good_fit is rendered as custom with id "why_good_fit")
type SectionType =
  | "personal_info"
  | "custom"
  | "work_experience"
  | "education"
  | "skills"
  | "certifications"
  | "projects"
  | "awards"
  | "publications"
  | "volunteer_experience";

interface SectionFactoryProps extends SectionProps {
  sectionType: SectionType;
  /**
   * CV ID passed to sections that support writing corrections and edit tracking.
   * Required for PersonalInfoSection and CustomSectionSection to enable
   * overwrite confirmation dialogs and AI-powered writing corrections.
   */
  cvId?: string;
  sectionTitle?: string;
  onSectionTitleSave?: (newTitle: string) => Promise<void>;
  sectionId?: string; // For custom sections: the custom section uuid
}

// Map of sections
const SECTIONS = {
  personal_info: PersonalInfoSection,
  custom: CustomSectionSection,
  work_experience: WorkExperienceSection,
  education: EducationSection,
  skills: SkillsSection,
  certifications: CertificationsSection,
  projects: ProjectsSection,
  awards: AwardsSection,
  publications: PublicationsSection,
  volunteer_experience: VolunteerExperienceSection,
};

const SectionFactory: React.FC<SectionFactoryProps> = ({
  sectionType,
  sectionTitle,
  onSectionTitleSave,
  sectionId,
  cvId,
  onHide,
  onDelete,
  isCustomSection,
  ...props
}) => {
  const SectionComponent = SECTIONS[sectionType];

  if (!SectionComponent) {
    console.warn(`Unknown section type: ${sectionType}`);
    return null;
  }

  const commonProps = {
    ...props,
    cvId,
    data: props.data as any,
    onUnsavedChanges: props.onUnsavedChanges as any,
    title: sectionTitle,
    onTitleSave: onSectionTitleSave,
    sectionType,
    sectionId,
    onHide,
    onDelete,
    isCustomSection,
  };

  if (sectionType === "custom" && sectionId) {
    return <SectionComponent {...commonProps} sectionId={sectionId} />;
  }

  return <SectionComponent {...commonProps} />;
};

export default SectionFactory;

// Export individual components for direct use if needed
export {
  PersonalInfoSection,
  CustomSectionSection,
  WorkExperienceSection,
  EducationSection,
  SkillsSection,
  CertificationsSection,
  ProjectsSection,
  AwardsSection,
  PublicationsSection,
  VolunteerExperienceSection,
};

// Export types
export type { SectionType };
