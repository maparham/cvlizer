/**
 * Utility functions for the Dashboard component
 */
import {
  Error as ErrorIcon,
  CheckCircle as CheckCircleIcon,
  HourglassEmpty as ProcessingIcon,
} from "@mui/icons-material";
import { CV } from "../types";

/**
 * Check if CV was uploaded (has file) vs created from scratch
 */
export const isUploadedCV = (cv: CV): boolean => {
  // Use the new is_imported field if available, otherwise fall back to file_size check
  return cv.is_imported ?? cv.file_size > 0;
};

/**
 * Check if any CV has been edited
 */
export const hasBeenEdited = (cv: CV): boolean => {
  return cv.has_been_edited ?? false;
};

/**
 * Get CV status icon component
 */
export const getCVStatusIcon = (cv: CV) => {
  if (cv.parse_error) {
    return <ErrorIcon color="error" fontSize="small" />;
  } else if (cv.is_parsed) {
    return <CheckCircleIcon color="success" fontSize="small" />;
  } else {
    return <ProcessingIcon color="warning" fontSize="small" />;
  }
};

/**
 * Get sections count from parsed data (only visible sections with data)
 */
export const getSectionCount = (cv: CV): number => {
  if (!cv.parsed_data) return 0;

  // Helper function to check if section has data
  const hasData = (sectionType: string): boolean => {
    switch (sectionType) {
      case "personal_info":
        return !!cv.parsed_data?.personal_info?.full_name?.trim();
      case "professional_summary":
        return !!cv.parsed_data?.professional_summary?.content?.trim();
      case "work_experience":
        return !!cv.parsed_data?.work_experience?.length;
      case "education":
        return !!cv.parsed_data?.education?.length;
      case "skills":
        return !!(
          cv.parsed_data?.skills?.technical?.length ||
          cv.parsed_data?.skills?.soft?.length ||
          cv.parsed_data?.skills?.languages?.length
        );
      case "certifications":
        return !!cv.parsed_data?.certifications?.length;
      case "projects":
        return !!cv.parsed_data?.projects?.length;
      case "awards":
        return !!cv.parsed_data?.awards?.length;
      case "publications":
        return !!cv.parsed_data?.publications?.length;
      case "volunteer_experience":
        return !!cv.parsed_data?.volunteer_experience?.length;
      default:
        return false;
    }
  };

  // If there's no section config, fall back to counting all sections with data
  if (!cv.parsed_data.section_config?.sections) {
    let count = 0;
    const sectionTypes = [
      "personal_info",
      "professional_summary",
      "work_experience",
      "education",
      "skills",
      "certifications",
      "projects",
      "awards",
      "publications",
      "volunteer_experience",
    ];

    for (const sectionType of sectionTypes) {
      if (hasData(sectionType)) {
        count++;
      }
    }
    return count;
  }

  // Count only visible sections that have data
  return cv.parsed_data.section_config.sections.filter(
    (section) => section.visible && hasData(section.type),
  ).length;
};
