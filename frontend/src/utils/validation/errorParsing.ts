/**
 * Error Parsing Utilities
 *
 * Functions for parsing and converting backend validation errors into
 * structured format for display in the UI.
 */

import { ValidationError } from "./types";

/**
 * Normalize field names extracted from human-readable error messages
 * Only used when field name comes from message text, not from Pydantic loc arrays
 * Maps human-readable field names to actual frontend field names
 */
function normalizeFieldName(section: string, field: string): string {
  // Handle Publications section field name mismatches from message text
  if (section === "publications") {
    // Message says "Journal/Conference" but field is "journal"
    if (field === "journal/conference" || field === "journal_conference") {
      return "journal";
    }
  }

  // Handle other potential mismatches from message text
  // "Start date" -> "start_date", "End date" -> "end_date", etc.
  if (field.includes(" ")) {
    return field.replace(/\s+/g, "_");
  }

  return field;
}

/**
 * Extract field name from validation message
 */
function extractFieldFromMessage(message: string): string {
  // Common patterns: "Start date is required", "End date is invalid"
  const fieldMatch = message
    .toLowerCase()
    .match(/^(\w+(?:\s+\w+)*)\s+(?:is|are)\s+/);
  if (fieldMatch) {
    const extracted = fieldMatch[1].replace(/\s+/g, "_");
    return extracted; // Convert "start date" to "start_date"
  }

  // Fallback: return first word (may contain special chars like /)
  const fallback = message.split(" ")[0].toLowerCase();
  return fallback;
}

/**
 * Normalize section names from validation errors to match frontend section IDs
 * Backend uses singular forms in validation messages, frontend uses plural section IDs
 */
const normalizeSectionName = (section: string): string => {
  const sectionMap: Record<string, string> = {
    'project': 'projects',
    'certification': 'certifications',
    'award': 'awards',
    'publication': 'publications',
    'volunteer_experience': 'volunteer_experience',
    'work_experience': 'work_experience',
    'education': 'education',
    'personal_info': 'personal_info',
    'professional_summary': 'professional_summary',
    'skills': 'skills',
  };
  return sectionMap[section] || section;
};

/**
 * Parse validation error message into structured errors
 * Example: "CV validation failed:\n• Education #2: Start date is required"
 */
export const parseValidationErrors = (
  errorMessage: string | unknown,
): ValidationError[] => {
  // Handle raw Pydantic error arrays
  if (typeof errorMessage !== "string") {
    return parsePydanticValidationErrors(errorMessage);
  }

  if (!errorMessage.includes("CV validation failed:")) {
    return [];
  }

  const lines = errorMessage.split("\n").slice(1); // Skip first line
  const errors: ValidationError[] = [];

  for (const line of lines) {
    const cleanLine = line.replace("• ", "").trim();
    if (!cleanLine) continue;

    // Parse patterns like "Education #2: Start date is required" or "Work experience #1: Position is required"
    // Capture multi-word section names and normalize them to snake_case
    const sectionMatch = cleanLine.match(/^([A-Za-z][A-Za-z\s]+?)(?:\s*#(\d+))?:\s*(.+)$/);

    if (sectionMatch) {
      const [, sectionName, itemIndex, message] = sectionMatch;
      // Normalize section name to snake_case (e.g., "Work experience" -> "work_experience")
      const section = normalizeSectionName(sectionName.trim().toLowerCase().replace(/\s+/g, '_'));
      let field = extractFieldFromMessage(message);
      // Normalize field name to match frontend field names
      field = normalizeFieldName(section, field);

      const error = {
        section,
        itemIndex: itemIndex ? parseInt(itemIndex) - 1 : undefined, // Convert to 0-based index
        field: field,
        message: message,
      };

      errors.push(error);
    }
  }

  return errors;
};

/**
 * Parse Pydantic validation errors from array format directly
 * Input: Array of Pydantic errors like [{ loc: ["body", "parsed_data", "publications", 0, "journal"], msg: "..." }, ...]
 * Or: { detail: [...] } or just [...]
 */
export const parsePydanticValidationErrors = (
  input: unknown,
): ValidationError[] => {
  const errors: ValidationError[] = [];

  // Extract error array from various formats
  let errorArray: any[] = [];

  if (Array.isArray(input)) {
    errorArray = input;
  } else if (typeof input === "object" && input !== null) {
    const obj = input as Record<string, unknown>;
    if (Array.isArray(obj.detail)) {
      errorArray = obj.detail;
    } else if (Array.isArray(obj.errors)) {
      errorArray = obj.errors;
    }
  }

  if (errorArray.length === 0) {
    return errors;
  }

  // Map each Pydantic error to our ValidationError format
  for (const e of errorArray) {
    const loc = e.loc || [];
    const msg = e.msg || e.message || "Validation failed";

    // Skip leading ["body", "parsed_data"] if present
    const path = loc.slice();
    if (path[0] === "body") path.shift();
    if (path[0] === "parsed_data") path.shift();

    if (path.length === 0) {
      // No valid path, skip this error
      continue;
    }

    const section = path[0];
    const sectionLower = section.toLowerCase();

    // Determine if there's an item index
    let itemIndex: number | undefined;
    let field: string | undefined;

    if (path.length === 1) {
      // Just section, no item or field
      field = undefined;
    } else {
      const secondPart = path[1];
      const index = typeof secondPart === "number" ? secondPart : parseInt(String(secondPart));

      if (!isNaN(index) && index >= 0) {
        // Second element is an index (e.g., ["publications", 0, "journal"])
        itemIndex = index;
        field = path.length > 2 ? String(path[2]) : undefined;
      } else {
        // Second element is a field name (e.g., ["personal_info", "email"])
        field = String(secondPart);
      }
    }

    // Pydantic always provides field paths in loc array
    // Field names from loc match schema field names, so we trust them directly
    if (field) {
      // Normalize to lowercase (schema uses snake_case, frontend uses lowercase)
      field = field.toLowerCase();
    }

    errors.push({
      section: normalizeSectionName(sectionLower),
      itemIndex,
      field: field || "general",
      message: msg,
    });
  }

  return errors;
};
