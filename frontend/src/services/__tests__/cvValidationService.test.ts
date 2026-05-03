/**
 * Unit tests for CV Validation Service
 */
import { CVValidationService } from "../cvValidationService";
import { CVData } from "../../types";

describe("CVValidationService", () => {
  const mockCVData: CVData = {
    personal_info: {
      full_name: "John Doe",
      email: "john@example.com",
      phone: "+1234567890",
      location: "New York, NY",
      linkedin_url: "https://linkedin.com/in/johndoe",
      website_url: "https://johndoe.com",
    },
    custom_sections: [],
    work_experience: [
      {
        id: "work_1",
        company: "Tech Corp",
        position: "Senior Developer",
        location: "San Francisco, CA",
        start_date: "2020-01",
        end_date: "2023-12",
        current: false,
        description: "Led development team",
        achievements: [],
        technologies: [],
      },
    ],
    education: [],
    skills: {
      technical: {
        "Programming Languages": ["JavaScript", "Python"],
        "Frameworks": ["React"],
        "Soft Skills": ["Leadership", "Communication"],
        "Languages": ["English", "Spanish"],
      },
    },
    certifications: [],
    projects: [],
    awards: [],
    publications: [],
    volunteer_experience: [],
  };

  describe("cleanForBackend", () => {
    it("should preserve valid sections and never send professional_summary", () => {
      const result = CVValidationService.cleanForBackend(mockCVData);

      expect(result.personal_info).toBeDefined();
      expect(result.professional_summary).toBeUndefined();
      expect(result.skills).toBeDefined();
      expect(result.work_experience).toBeDefined();
    });

    it("should migrate legacy professional_summary content into custom_sections and strip key", () => {
      const dataWithLegacySummary = {
        ...mockCVData,
        professional_summary: {
          content: "Experienced software developer with 5+ years of experience",
          keywords: ["JavaScript", "React", "Node.js"],
        },
      };

      const result = CVValidationService.cleanForBackend(dataWithLegacySummary as any);

      expect(result.professional_summary).toBeUndefined();
      expect(Array.isArray(result.custom_sections)).toBe(true);
      const summarySection = result.custom_sections.find(
        (s: any) => s.type === "professional_summary" || (s.title || "").toLowerCase() === "professional summary",
      );
      expect(summarySection).toBeDefined();
      expect(summarySection.content).toContain("Experienced software developer");
    });

    it("should strip professional_summary with empty content", () => {
      const invalidData = {
        ...mockCVData,
        professional_summary: { content: "", keywords: [] },
      };

      const result = CVValidationService.cleanForBackend(invalidData as any);

      expect(result.professional_summary).toBeUndefined();
    });

    it("should strip professional_summary with short content", () => {
      const invalidData = {
        ...mockCVData,
        professional_summary: { content: "Short", keywords: [] },
      };

      const result = CVValidationService.cleanForBackend(invalidData as any);

      expect(result.professional_summary).toBeUndefined();
    });

    it("should keep personal info and normalize empty required fields", () => {
      const invalidData = {
        ...mockCVData,
        personal_info: {
          full_name: "",
          email: "test@example.com",
          phone: "",
          location: "New York",
          linkedin_url: "",
          website_url: "",
        },
      };

      const result = CVValidationService.cleanForBackend(invalidData);

      expect(result.personal_info).toBeDefined();
      expect(result.personal_info.full_name).toBe("");
      expect(result.personal_info.email).toBe("test@example.com");
      expect(result.personal_info.location).toBe("New York");
    });

    it("should remove skills with no technical categories", () => {
      const invalidData = {
        ...mockCVData,
        skills: {
          technical: {},
        },
      };

      const result = CVValidationService.cleanForBackend(invalidData);

      expect(result.skills).toBeUndefined();
    });

    it("should preserve skills with technical categories", () => {
      const validData = {
        ...mockCVData,
        skills: {
          technical: { General: ["JavaScript"] },
        },
      };

      const result = CVValidationService.cleanForBackend(validData);

      expect(result.skills).toBeDefined();
      expect(result.skills.technical).toEqual({ General: ["JavaScript"] });
    });

    it("should preserve skills with soft-skill category inside technical", () => {
      const validData = {
        ...mockCVData,
        skills: {
          technical: { "Soft Skills": ["Leadership"] },
        },
      };

      const result = CVValidationService.cleanForBackend(validData);

      expect(result.skills).toBeDefined();
      expect(result.skills.technical).toEqual({ "Soft Skills": ["Leadership"] });
    });
  });

  describe("validateSection", () => {
    it("should validate personal_info section correctly", () => {
      const result = CVValidationService.validateSection(
        "personal_info",
        mockCVData.personal_info,
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should return errors for invalid personal_info", () => {
      const invalidPersonalInfo = {
        full_name: "",
        email: "invalid-email",
        location: "",
      };

      const result = CVValidationService.validateSection(
        "personal_info",
        invalidPersonalInfo,
      );

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("should validate professional_summary section correctly", () => {
      const summaryData = {
        content: "Experienced software developer with 5+ years of experience",
        keywords: ["JavaScript", "React", "Node.js"],
      };
      const result = CVValidationService.validateSection(
        "professional_summary",
        summaryData,
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should use default validator for professional_summary (no min-length rule)", () => {
      const shortSummary = { content: "Short", keywords: [] };

      const result = CVValidationService.validateSection(
        "professional_summary",
        shortSummary,
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe("validateItem", () => {
    const mockItem = {
      name: "Test Project",
      description: "A test project description",
      start_date: "2023-01",
    };

    it("should validate item with all required fields", () => {
      const result = CVValidationService.validateItem(
        mockItem,
        ["name", "description"] as (keyof typeof mockItem)[],
        "Projects",
      );

      expect(result).toBe(true);
    });

    it("should return false for item with missing required fields", () => {
      const invalidItem = {
        name: "",
        description: "A test project description",
      };

      const result = CVValidationService.validateItem(
        invalidItem,
        ["name", "description"] as (keyof typeof invalidItem)[],
        "Projects",
      );

      expect(result).toBe(false);
    });

    it("should return false for null item", () => {
      const result = CVValidationService.validateItem(
        null,
        ["name"] as never[],
        "Projects",
      );

      expect(result).toBe(false);
    });
  });

  describe("validateTitle", () => {
    it("should validate normal title", () => {
      const result = CVValidationService.validateTitle("My CV Title");

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should return error for empty title", () => {
      const result = CVValidationService.validateTitle("");

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Title cannot be empty");
    });

    it("should return error for title that is too long", () => {
      const longTitle = "a".repeat(300);
      const result = CVValidationService.validateTitle(longTitle);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Title cannot exceed 255 characters");
    });

    it("should return warning for long title", () => {
      const longTitle = "a".repeat(220);
      const result = CVValidationService.validateTitle(longTitle);

      expect(result.isValid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe("hasUnsavedChanges", () => {
    const originalData = { name: "John", age: 30 };

    it("should return false for identical objects", () => {
      const currentData = { name: "John", age: 30 };
      const result = CVValidationService.hasUnsavedChanges(
        currentData,
        originalData,
      );

      expect(result).toBe(false);
    });

    it("should return true for different objects", () => {
      const currentData = { name: "Jane", age: 30 };
      const result = CVValidationService.hasUnsavedChanges(
        currentData,
        originalData,
      );

      expect(result).toBe(true);
    });

    it("should return true for objects with different nested properties", () => {
      const originalData = { person: { name: "John" } };
      const currentData = { person: { name: "Jane" } };
      const result = CVValidationService.hasUnsavedChanges(
        currentData,
        originalData,
      );

      expect(result).toBe(true);
    });
  });
});
