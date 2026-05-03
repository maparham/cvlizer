/**
 * CV Store Constants and Utilities
 *
 * This module provides shared constants, utility functions,
 * and default data structures used across CV store slices.
 */

import { CVData } from "../../types";

// Constants
export const DEFAULT_CV_FILENAME = "New CV";
export const TEMP_CV_ID_PREFIX = "temp-";

/**
 * Check if CV history feature is enabled
 */
export const isHistoryEnabled = () =>
  import.meta.env.VITE_SHOW_HISTORY_PANEL === "true";

/**
 * Check if a CV ID is temporary (not yet saved to backend)
 * Temporary CVs have IDs that start with 'temp-'
 */
export const isTempCVId = (cvId: string | undefined): boolean => {
  return cvId ? cvId.startsWith(TEMP_CV_ID_PREFIX) : false;
};

// Default CV structure for new CVs - only includes sections that can be empty.
// Summary content lives in custom_sections (type professional_summary), not top-level professional_summary.
export const DEFAULT_CV_DATA: CVData = {
  personal_info: {
    full_name: "",
    email: "",
    phone: "",
    location: "",
    linkedin_url: "",
    website_url: "",
  },
  custom_sections: [],
  work_experience: [],
  education: [],
  skills: {
    technical: {},
  },
  certifications: [],
  projects: [],
  awards: [],
  publications: [],
  volunteer_experience: [],
};
