/**
 * Utility functions for the Dashboard component
 */
import ErrorIcon from "@mui/icons-material/Error";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ProcessingIcon from "@mui/icons-material/HourglassEmpty";
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
 * Get section count for display. Value is computed on the backend and
 * included in all CV responses; frontend uses it as single source of truth.
 */
export const getSectionCount = (cv: CV): number => cv.section_count ?? 0;
