/**
 * CV Validation Service
 *
 * Centralized validation logic for CV data processing, cleaning, and validation.
 * This service handles data transformation between frontend and backend formats,
 * ensuring data integrity and proper validation before API calls.
 */

import { CVData } from "../types";

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface CleaningOptions {
  removeEmptyStrings?: boolean;
  removeEmptyArrays?: boolean;
  trimStrings?: boolean;
  validateRequired?: boolean;
}

/**
 * Main CV validation and cleaning service
 */
export class CVValidationService {
  /**
   * Clean CV data before sending to backend
   * Removes sections that would fail backend validation
   */
  static cleanForBackend(cvData: CVData, options: CleaningOptions = {}): any {
    const cleaner = new CVDataCleaner(cvData, {
      removeEmptyStrings: true,
      removeEmptyArrays: true,
      trimStrings: true,
      validateRequired: true,
      ...options,
    });

    return cleaner.clean();
  }

  /**
   * Validate complete CV data and return list of validation errors
   */
  static validateCVData(cvData: CVData): string[] {
    const errors: string[] = [];

    // Validate Personal Information
    const personalInfo = cvData.personal_info;
    if (personalInfo) {
      if (!personalInfo.full_name?.trim()) {
        errors.push("Personal Info: Full name is required");
      }
      if (!personalInfo.email?.trim()) {
        errors.push("Personal Info: Email is required");
      }
      if (!personalInfo.location?.trim()) {
        errors.push("Personal Info: Location is required");
      }
    }

    // Validate Work Experience
    if (cvData.work_experience) {
      cvData.work_experience.forEach((exp, index) => {
        if (!exp.position?.trim()) {
          errors.push(`Work Experience #${index + 1}: Position is required`);
        }
        if (!exp.company?.trim()) {
          errors.push(`Work Experience #${index + 1}: Company is required`);
        }
        if (!exp.start_date?.trim()) {
          errors.push(`Work Experience #${index + 1}: Start date is required`);
        }

        // Validate date order
        const dateError = this.validateDateOrder(
          exp.start_date,
          exp.end_date,
          "Work Experience",
          index + 1,
        );
        if (dateError) {
          errors.push(dateError);
        }
      });
    }

    // Validate Education
    if (cvData.education) {
      cvData.education.forEach((edu, index) => {
        if (!edu.institution?.trim()) {
          errors.push(`Education #${index + 1}: Institution is required`);
        }
        if (!edu.degree?.trim()) {
          errors.push(`Education #${index + 1}: Degree is required`);
        }
        if (!edu.start_date?.trim()) {
          errors.push(`Education #${index + 1}: Start date is required`);
        }

        // Validate date order
        const dateError = this.validateDateOrder(
          edu.start_date,
          edu.end_date,
          "Education",
          index + 1,
        );
        if (dateError) {
          errors.push(dateError);
        }
      });
    }

    // Validate Projects
    if (cvData.projects) {
      cvData.projects.forEach((project, index) => {
        if (!project.name?.trim()) {
          errors.push(`Project #${index + 1}: Name is required`);
        }
        if (!project.description?.trim()) {
          errors.push(`Project #${index + 1}: Description is required`);
        }
      });
    }

    // Validate Certifications
    if (cvData.certifications) {
      cvData.certifications.forEach((cert, index) => {
        if (!cert.name?.trim()) {
          errors.push(`Certification #${index + 1}: Name is required`);
        }
        if (!cert.issuer?.trim()) {
          errors.push(`Certification #${index + 1}: Issuer is required`);
        }
        if (!cert.date?.trim()) {
          errors.push(`Certification #${index + 1}: Date is required`);
        }
      });
    }

    // Validate Awards
    if (cvData.awards) {
      cvData.awards.forEach((award, index) => {
        if (!award.name?.trim()) {
          errors.push(`Award #${index + 1}: Name is required`);
        }
        if (!award.issuer?.trim()) {
          errors.push(`Award #${index + 1}: Issuer is required`);
        }
        if (!award.date?.trim()) {
          errors.push(`Award #${index + 1}: Date is required`);
        }
      });
    }

    return errors;
  }

  /**
   * Validate that start_date is before end_date
   */
  private static validateDateOrder(
    startDate: string | undefined,
    endDate: string | undefined,
    itemName: string,
    itemIndex: number,
  ): string {
    if (!startDate || !endDate) {
      return ""; // Skip validation if either date is missing
    }

    try {
      // Parse dates - only support YYYY-MM-DD format
      const startParsed = new Date(startDate);
      const endParsed = new Date(endDate);

      if (
        !isNaN(startParsed.getTime()) &&
        !isNaN(endParsed.getTime()) &&
        startParsed >= endParsed
      ) {
        return `${itemName} #${itemIndex}: Start date must be before end date`;
      }
    } catch {
      // If date parsing fails, skip validation
    }

    return "";
  }

  /**
   * Validate a CV section against its requirements
   */
  static validateSection(sectionName: string, data: any): ValidationResult {
    const validator = SectionValidatorFactory.getValidator(sectionName);
    return validator.validate(data);
  }

  /**
   * Validate individual item in a collection
   */
  static validateItem<T>(
    item: T | null,
    requiredFields: (keyof T)[],
    _sectionTitle: string,
  ): boolean {
    if (!item) return false;

    return requiredFields.every((field) => {
      const value = item[field];
      return value !== undefined && value !== null && value !== "";
    });
  }

  /**
   * Validate CV title
   */
  static validateTitle(
    title: string,
    maxLength: number = 255,
  ): ValidationResult {
    const trimmed = title.trim();
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!trimmed) {
      errors.push("Title cannot be empty");
    }

    if (trimmed.length > maxLength) {
      errors.push(`Title cannot exceed ${maxLength} characters`);
    }

    if (trimmed.length > maxLength * 0.8) {
      warnings.push("Title is quite long, consider shortening it");
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Check if CV data has unsaved changes
   */
  static hasUnsavedChanges<T>(current: T, original: T): boolean {
    return JSON.stringify(current) !== JSON.stringify(original);
  }
}

/**
 * CV Data Cleaner - handles data transformation and cleaning
 */
class CVDataCleaner {
  private data: CVData;
  private options: Required<CleaningOptions>;

  constructor(data: CVData, options: Required<CleaningOptions>) {
    this.data = { ...data };
    this.options = options;
  }

  clean(): any {
    const cleanedData: any = { ...this.data };

    // Clean professional summary
    this.cleanProfessionalSummary(cleanedData);

    // Clean personal info
    this.cleanPersonalInfo(cleanedData);

    // Clean skills
    this.cleanSkills(cleanedData);

    // Clean why_good_fit section
    this.cleanWhyGoodFit(cleanedData);

    // Clean array sections
    this.cleanArraySections(cleanedData);

    // Preserve section_config - this contains section visibility and ordering
    if (this.data.section_config) {
      cleanedData.section_config = this.data.section_config;
    }

    return cleanedData;
  }

  private cleanProfessionalSummary(data: any): void {
    if (data.professional_summary) {
      const content = this.cleanString(data.professional_summary.content);

      // Backend requires min 10 characters for professional summary
      if (!content || content.length < 10) {
        delete data.professional_summary;
      } else {
        data.professional_summary.content = content;
      }
    }
  }

  private cleanPersonalInfo(data: any): void {
    if (data.personal_info) {
      const { full_name, email, location } = data.personal_info;

      // Clean strings
      const cleanedFullName = this.cleanString(full_name);
      const cleanedEmail = this.cleanString(email);
      const cleanedLocation = this.cleanString(location);

      // Backend requires these fields to be non-empty
      if (!cleanedFullName || !cleanedEmail || !cleanedLocation) {
        delete data.personal_info;
      } else {
        data.personal_info = {
          ...data.personal_info,
          full_name: cleanedFullName,
          email: cleanedEmail,
          location: cleanedLocation,
          phone: this.cleanString(data.personal_info.phone) || "",
          linkedin_url: this.cleanString(data.personal_info.linkedin_url) || "",
          website_url: this.cleanString(data.personal_info.website_url) || "",
        };
      }
    }
  }

  private cleanSkills(data: any): void {
    if (data.skills) {
      const technical = this.cleanArray(data.skills.technical);
      const soft = this.cleanArray(data.skills.soft);

      // Clean languages array
      const languages = this.cleanArray(data.skills.languages || []);

      // Backend requires at least one technical or soft skill
      if (technical.length === 0 && soft.length === 0) {
        delete data.skills;
      } else {
        data.skills = {
          technical,
          soft,
          languages,
        };
      }
    }
  }

  private cleanWhyGoodFit(data: any): void {
    if (data.why_good_fit) {
      // Store the original object to preserve all fields
      const original = { ...data.why_good_fit };

      const content = this.cleanString(data.why_good_fit.content);
      const fitAnalysis = this.cleanString(data.why_good_fit.fit_analysis);

      // Backend requires min 10 characters for why_good_fit content
      // Check both content and fit_analysis fields
      const hasValidContent = content && content.length >= 10;
      const hasValidFitAnalysis = fitAnalysis && fitAnalysis.length >= 10;

      // If neither content nor fit_analysis is valid, delete the entire section
      if (!hasValidContent && !hasValidFitAnalysis) {
        delete data.why_good_fit;
      } else {
        // IMPORTANT: Keep the original object and only update specific fields
        // This preserves ALL backend fields like confidence_score, key_matches, etc.

        // Update cleaned content
        if (!content && fitAnalysis) {
          data.why_good_fit.content = fitAnalysis;
        } else if (content) {
          data.why_good_fit.content = content;
        }

        // Update cleaned fit_analysis
        if (fitAnalysis) {
          data.why_good_fit.fit_analysis = fitAnalysis;
        }

        // Ensure generated_at field exists (required by backend)
        if (!data.why_good_fit.generated_at) {
          data.why_good_fit.generated_at = new Date().toISOString();
        }

        // Add validation helper fields (these are frontend-only helpers)
        data.why_good_fit.hasContent = !!data.why_good_fit.content;
        data.why_good_fit.hasFitAnalysis = !!data.why_good_fit.fit_analysis;
        data.why_good_fit.hasGeneratedAt = !!data.why_good_fit.generated_at;
      }
    }
  }

  private cleanArraySections(data: any): void {
    const arraySections = [
      "work_experience",
      "education",
      "certifications",
      "projects",
      "awards",
      "publications",
      "volunteer_experience",
    ];

    arraySections.forEach((section) => {
      if (data[section]) {
        const cleaned = this.cleanArrayWithSectionType(data[section], section);
        if (cleaned.length === 0 && this.options.removeEmptyArrays) {
          delete data[section];
        } else {
          data[section] = cleaned;
        }
      }
    });
  }

  private cleanString(value: any): string {
    if (typeof value !== "string") return "";

    let cleaned = value;

    if (this.options.trimStrings) {
      cleaned = cleaned.trim();
    }

    if (this.options.removeEmptyStrings && cleaned === "") {
      return "";
    }

    return cleaned;
  }

  private cleanArray(arr: any[]): any[] {
    if (!Array.isArray(arr)) return [];

    return arr.filter((item) => {
      if (item === null || item === undefined) return false;
      if (typeof item === "string") return this.cleanString(item) !== "";
      if (typeof item === "object") {
        // Preserve the id field even if other fields are empty
        const hasId = item.id !== undefined && item.id !== null;
        const hasOtherFields = Object.keys(item).some(
          (key) =>
            key !== "id" &&
            item[key] !== undefined &&
            item[key] !== null &&
            item[key] !== "",
        );
        return hasId || hasOtherFields;
      }
      return true;
    });
  }

  private cleanArrayWithSectionType(arr: any[], sectionType: string): any[] {
    if (!Array.isArray(arr)) return [];

    return arr.filter((item) => {
      if (item === null || item === undefined) return false;
      if (typeof item === "string") return this.cleanString(item) !== "";
      if (typeof item === "object") {
        // Remove fields that don't belong to this section type
        this._removeInvalidFieldsForSection(item, sectionType);

        // Convert null dates to empty strings for valid fields only
        this._normalizeValidDateFields(item, sectionType);

        // Preserve the id field even if other fields are empty
        const hasId = item.id !== undefined && item.id !== null;
        const hasOtherFields = Object.keys(item).some(
          (key) =>
            key !== "id" &&
            item[key] !== undefined &&
            item[key] !== null &&
            item[key] !== "",
        );
        return hasId || hasOtherFields;
      }
      return true;
    });
  }

  private _removeInvalidFieldsForSection(item: any, sectionType: string): void {
    /**
     * Remove fields that don't belong to specific section schemas.
     * This prevents "extra_forbidden" validation errors.
     */
    const validFieldsBySection = {
      work_experience: [
        "id",
        "company",
        "position",
        "location",
        "start_date",
        "end_date",
        "current",
        "description",
        "achievements",
        "technologies",
      ],
      education: [
        "id",
        "institution",
        "degree",
        "field_of_study",
        "location",
        "start_date",
        "end_date",
        "gpa",
        "description",
        "achievements",
        "honors",
      ],
      projects: ["id", "name", "description", "technologies", "url"],
      certifications: [
        "id",
        "name",
        "issuer",
        "date",
        "expiry_date",
        "description",
      ],
      awards: ["id", "name", "issuer", "date", "description"],
      publications: ["id", "title", "authors", "journal", "date", "url"],
      volunteer_experience: [
        "id",
        "organization",
        "role",
        "location",
        "start_date",
        "end_date",
        "description",
      ],
    };

    const validFields = (validFieldsBySection as any)[sectionType] || [];

    // Remove any fields not in the valid list
    Object.keys(item).forEach((key) => {
      if (!validFields.includes(key)) {
        delete item[key];
      }
    });
  }

  private _normalizeValidDateFields(item: any, sectionType: string): void {
    /**
     * Convert null/undefined date values to empty strings for valid date fields only.
     */
    const dateFieldsBySection = {
      work_experience: ["start_date", "end_date"],
      education: ["start_date", "end_date"],
      certifications: ["date", "expiry_date"],
      awards: ["date"],
      publications: ["date"],
      volunteer_experience: ["start_date", "end_date"],
    };

    const dateFields = (dateFieldsBySection as any)[sectionType] || [];

    dateFields.forEach((field: string) => {
      if (item[field] === null || item[field] === undefined) {
        item[field] = "";
      }
    });
  }
}

/**
 * Abstract base class for section validators
 */
abstract class SectionValidator {
  abstract validate(data: any): ValidationResult;

  protected createResult(
    isValid: boolean,
    errors: string[] = [],
    warnings: string[] = [],
  ): ValidationResult {
    return { isValid, errors, warnings };
  }
}

/**
 * Personal Info section validator
 */
class PersonalInfoValidator extends SectionValidator {
  validate(data: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!data) {
      return this.createResult(false, ["Personal info is required"]);
    }

    if (!data.full_name?.trim()) {
      errors.push("Full name is required");
    }

    if (!data.email?.trim()) {
      errors.push("Email is required");
    } else if (!this.isValidEmail(data.email)) {
      errors.push("Invalid email format");
    }

    if (!data.location?.trim()) {
      errors.push("Location is required");
    }

    if (data.linkedin_url && !this.isValidUrl(data.linkedin_url)) {
      warnings.push("LinkedIn URL format may be invalid");
    }

    if (data.website_url && !this.isValidUrl(data.website_url)) {
      warnings.push("Website URL format may be invalid");
    }

    return this.createResult(errors.length === 0, errors, warnings);
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Professional Summary validator
 */
class ProfessionalSummaryValidator extends SectionValidator {
  validate(data: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!data?.content?.trim()) {
      return this.createResult(false, [
        "Professional summary content is required",
      ]);
    }

    const content = data.content.trim();

    if (content.length < 10) {
      errors.push("Professional summary must be at least 10 characters long");
    }

    if (content.length < 50) {
      warnings.push(
        "Professional summary is quite short, consider expanding it",
      );
    }

    if (content.length > 500) {
      warnings.push(
        "Professional summary is quite long, consider condensing it",
      );
    }

    return this.createResult(errors.length === 0, errors, warnings);
  }
}

/**
 * Skills section validator
 */
class SkillsValidator extends SectionValidator {
  validate(data: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!data) {
      return this.createResult(false, ["Skills section is required"]);
    }

    const technical = Array.isArray(data.technical) ? data.technical : [];
    const soft = Array.isArray(data.soft) ? data.soft : [];

    if (technical.length === 0 && soft.length === 0) {
      errors.push("At least one technical or soft skill is required");
    }

    if (technical.length === 0) {
      warnings.push("Consider adding technical skills");
    }

    if (soft.length === 0) {
      warnings.push("Consider adding soft skills");
    }

    return this.createResult(errors.length === 0, errors, warnings);
  }
}

/**
 * Factory for creating section validators
 */
class SectionValidatorFactory {
  private static validators: Map<string, SectionValidator> = new Map([
    ["personal_info", new PersonalInfoValidator()],
    ["professional_summary", new ProfessionalSummaryValidator()],
    ["skills", new SkillsValidator()],
  ]);

  static getValidator(sectionName: string): SectionValidator {
    return this.validators.get(sectionName) || new DefaultValidator();
  }
}

/**
 * Default validator for sections without specific validation rules
 */
class DefaultValidator extends SectionValidator {
  validate(_data: any): ValidationResult {
    return this.createResult(true); // Always valid for sections without specific rules
  }
}

// Export utility functions for backward compatibility
export const cleanCVDataForBackend = CVValidationService.cleanForBackend;
export const validateItem = CVValidationService.validateItem;
export const hasUnsavedChanges = CVValidationService.hasUnsavedChanges;
