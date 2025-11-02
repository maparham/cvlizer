/**
 * Error Parsing Utilities
 *
 * Functions for parsing and converting backend validation errors into
 * structured format for display in the UI.
 */

import { ValidationError } from "./types";

/**
 * Extract field name from validation message
 */
function extractFieldFromMessage(message: string): string {
  // Common patterns: "Start date is required", "End date is invalid"
  const fieldMatch = message
    .toLowerCase()
    .match(/^(\w+(?:\s+\w+)*)\s+(?:is|are)\s+/);
  if (fieldMatch) {
    return fieldMatch[1].replace(" ", "_"); // Convert "start date" to "start_date"
  }

  // Fallback: return first word
  return message.split(" ")[0].toLowerCase();
}

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
      const section = sectionName.trim().toLowerCase().replace(/\s+/g, '_');
      const field = extractFieldFromMessage(message);

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
        // Second element is an index
        itemIndex = index;
        field = path.length > 2 ? String(path[2]) : undefined;
      } else {
        // Second element is a field name
        field = String(secondPart);
      }
    }

    // Extract field name from message if not provided
    if (!field && msg.toLowerCase().includes("required")) {
      const fieldMatch = msg.match(/^(\w+(?:\s+\w+)*)\s+(?:is|are)\s+/i);
      if (fieldMatch) {
        field = fieldMatch[1].replace(/\s+/g, "_").toLowerCase();
      }
    }

    // Clean up field name (convert to snake_case)
    if (field) {
      field = field.replace(/\s+/g, "_").toLowerCase();
    }

    errors.push({
      section: sectionLower,
      itemIndex,
      field: field || "general",
      message: msg,
    });
  }

  return errors;
};
