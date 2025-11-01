/**
 * Field Validation Utilities
 *
 * Functions for validating individual form fields including email, phone,
 * URLs, and job posting URLs.
 */

import { FieldValidationResult } from "./types";

/**
 * Validate job posting URL with comprehensive regex patterns
 * Supports LinkedIn, Indeed, Glassdoor, and other common job sites
 */
export const validateJobPostingUrl = (url: string): FieldValidationResult => {
  if (!url || url.trim() === "") {
    return { isValid: false, message: "Please enter a job posting URL" };
  }

  // Basic URL format validation
  const basicUrlRegex = /^https?:\/\/.+/;
  if (!basicUrlRegex.test(url)) {
    return {
      isValid: false,
      message: "URL must start with http:// or https://",
    };
  }

  try {
    // Use native URL constructor for additional validation
    new URL(url);
  } catch {
    return { isValid: false, message: "Please enter a valid URL format" };
  }

  // Job posting site patterns
  const jobSitePatterns = [
    // LinkedIn job postings
    /^https?:\/\/(www\.)?linkedin\.com\/jobs\/view\/\d+/i,
    /^https?:\/\/(www\.)?linkedin\.com\/jobs\/search\/\?/i,

    // Indeed job postings
    /^https?:\/\/(www\.)?indeed\.com\/viewjob\?/i,
    /^https?:\/\/(www\.)?indeed\.com\/jobs\?/i,
    /^https?:\/\/(.*\.)?indeed\.com\/viewjob\?/i,

    // Glassdoor job postings
    /^https?:\/\/(www\.)?glassdoor\.com\/job-listing\/.*\/JV_/i,
    /^https?:\/\/(www\.)?glassdoor\.com\/Jobs\/.*-jobs/i,

    // ZipRecruiter
    /^https?:\/\/(www\.)?ziprecruiter\.com\/c\/Jobs\/.*/i,

    // Monster
    /^https?:\/\/(www\.)?monster\.com\/jobs\/search\/.*/i,

    // CareerBuilder
    /^https?:\/\/(www\.)?careerbuilder\.com\/job\/.*/i,

    // AngelList/Wellfound
    /^https?:\/\/(angel\.co|wellfound\.com)\/.*\/jobs\/.*/i,

    // Stack Overflow Jobs
    /^https?:\/\/(www\.)?stackoverflow\.com\/jobs\/\d+/i,

    // Remote job sites
    /^https?:\/\/(www\.)?remote\.co\/remote-jobs\/.*/i,
    /^https?:\/\/(www\.)?flexjobs\.com\/job\/.*/i,
    /^https?:\/\/(www\.)?weworkremotely\.com\/remote-jobs\/.*/i,

    // Company career pages (generic pattern)
    /^https?:\/\/.*\.com\/careers?\/.*/i,
    /^https?:\/\/.*\.com\/jobs\/.*/i,
    /^https?:\/\/.*\.com\/employment\/.*/i,
    /^https?:\/\/.*\.com\/opportunities\/.*/i,

    // Government job sites
    /^https?:\/\/(www\.)?usajobs\.gov\/GetJob\/ViewDetails\/.*/i,

    // Academic job sites
    /^https?:\/\/(www\.)?higheredjobs\.com\/search\/.*/i,
    /^https?:\/\/(www\.)?chronicle\.com\/jobs\/.*/i,
  ];

  // Check if URL matches any job posting pattern
  const isJobPostingUrl = jobSitePatterns.some((pattern) => pattern.test(url));

  if (isJobPostingUrl) {
    return { isValid: true };
  }

  // If it's a valid URL but doesn't match job posting patterns, still allow it
  // but provide a helpful message
  return {
    isValid: true,
    message: "URL format is valid. Make sure this is a job posting URL.",
  };
};

export const validateField = (
  fieldName: string,
  value: string,
  _data: any,
): FieldValidationResult => {
  switch (fieldName) {
    case "email": {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!value) return { isValid: true }; // Optional field
      return {
        isValid: emailRegex.test(value),
        message: "Please enter a valid email address",
      };
    }

    case "phone": {
      const phoneRegex = /^[+]?[1-9][\d]{0,15}$/;
      if (!value) return { isValid: true }; // Optional field
      return {
        isValid: phoneRegex.test(value.replace(/[\s\-()]/g, "")),
        message: "Please enter a valid phone number",
      };
    }

    case "linkedin_url": {
      if (!value) return { isValid: true }; // Optional field
      const linkedinRegex =
        /^https?:\/\/(www\.)?linkedin\.com\/in\/[a-zA-Z0-9-]+\/?$/;
      return {
        isValid: linkedinRegex.test(value),
        message: "Please enter a valid LinkedIn URL",
      };
    }

    case "github_url": {
      if (!value) return { isValid: true }; // Optional field
      const githubRegex = /^https?:\/\/(www\.)?github\.com\/[a-zA-Z0-9-]+\/?$/;
      return {
        isValid: githubRegex.test(value),
        message: "Please enter a valid GitHub URL",
      };
    }

    case "job_posting_url": {
      if (!value)
        return { isValid: false, message: "Please enter a job posting URL" };
      return validateJobPostingUrl(value);
    }

    default:
      return { isValid: true };
  }
};

export const validateAllFields = (
  data: any,
): { isValid: boolean; errors: Record<string, string> } => {
  const errors: Record<string, string> = {};

  // Validate email
  const emailResult = validateField("email", data.email || "", data);
  if (!emailResult.isValid) {
    errors.email = emailResult.message || "Invalid email";
  }

  // Validate phone
  const phoneResult = validateField("phone", data.phone || "", data);
  if (!phoneResult.isValid) {
    errors.phone = phoneResult.message || "Invalid phone";
  }

  // Validate LinkedIn URL
  const linkedinResult = validateField(
    "linkedin_url",
    data.linkedin_url || "",
    data,
  );
  if (!linkedinResult.isValid) {
    errors.linkedin_url = linkedinResult.message || "Invalid LinkedIn URL";
  }

  // Validate GitHub URL
  const githubResult = validateField("github_url", data.github_url || "", data);
  if (!githubResult.isValid) {
    errors.github_url = githubResult.message || "Invalid GitHub URL";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

export const createValidationRules = () => {
  return [
    { field: "email", required: false, type: "email" },
    { field: "phone", required: false, type: "phone" },
    { field: "linkedin_url", required: false, type: "url" },
    { field: "github_url", required: false, type: "url" },
    { field: "website", required: false, type: "url" },
  ];
};
