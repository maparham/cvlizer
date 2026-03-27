/**
 * Maps a CV section config row + CV data to SectionFactory props for read-only public view.
 */

import type { CVSection } from "../types";
import type { CVData } from "../types/cv";
import type { SectionType } from "../components/cv/sections/SectionFactory";

/** Payload fields that vary by section type (shared handlers added by PublicCVContentArea). */
export interface PublicSectionFactoryPayload {
  sectionType: SectionType;
  sectionId: string;
  sectionTitle: string;
  data: unknown;
  isCustomSection: boolean;
  readOnlyProfilePictureUrl?: string | null;
}

/**
 * Returns SectionFactory data for public CV rendering, or null for unsupported types.
 */
export function getPublicSectionFactoryData(
  section: CVSection,
  cvData: CVData,
  readOnlyProfilePictureUrl?: string | null,
): PublicSectionFactoryPayload | null {
  const { type, id, title } = section;

  switch (type) {
    case "personal_info":
      return {
        sectionType: "personal_info",
        sectionId: id,
        sectionTitle: title,
        data: cvData?.personal_info,
        isCustomSection: false,
        readOnlyProfilePictureUrl,
      };
    case "custom": {
      const customSectionData = cvData?.custom_sections?.find((s) => s.id === id);
      return {
        sectionType: "custom",
        sectionId: id,
        sectionTitle: title,
        data: customSectionData,
        isCustomSection: true,
      };
    }
    case "work_experience":
      return {
        sectionType: "work_experience",
        sectionId: id,
        sectionTitle: title,
        data: cvData?.work_experience,
        isCustomSection: false,
      };
    case "education":
      return {
        sectionType: "education",
        sectionId: id,
        sectionTitle: title,
        data: cvData?.education,
        isCustomSection: false,
      };
    case "skills":
      return {
        sectionType: "skills",
        sectionId: id,
        sectionTitle: title,
        data: cvData?.skills,
        isCustomSection: false,
      };
    case "certifications":
      return {
        sectionType: "certifications",
        sectionId: id,
        sectionTitle: title,
        data: cvData?.certifications || [],
        isCustomSection: false,
      };
    case "projects":
      return {
        sectionType: "projects",
        sectionId: id,
        sectionTitle: title,
        data: cvData?.projects || [],
        isCustomSection: false,
      };
    case "awards":
      return {
        sectionType: "awards",
        sectionId: id,
        sectionTitle: title,
        data: cvData?.awards || [],
        isCustomSection: false,
      };
    case "publications":
      return {
        sectionType: "publications",
        sectionId: id,
        sectionTitle: title,
        data: cvData?.publications || [],
        isCustomSection: false,
      };
    case "volunteer_experience":
      return {
        sectionType: "volunteer_experience",
        sectionId: id,
        sectionTitle: title,
        data: cvData?.volunteer_experience || [],
        isCustomSection: false,
      };
    default:
      return null;
  }
}
