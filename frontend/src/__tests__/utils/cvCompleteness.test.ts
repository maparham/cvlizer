/**
 * Unit tests for CV completeness utilities
 *
 * Tests the filtering of hidden sections and calculation of CV completeness
 * to ensure AI generation buttons are properly enabled/disabled based on
 * visible content only.
 */

import {
  filterVisibleSections,
  calculateCVCompleteness,
} from "../../utils/cvCompleteness";

describe("filterVisibleSections", () => {
  const mockCVData = {
    personal_info: { full_name: "John Doe", email: "john@example.com" },
    work_experience: [{ title: "Engineer", company: "Tech Corp" }],
    skills: { technical: { Frameworks: ["React"], Languages: ["TypeScript", "Leadership"] } },
    education: [{ degree: "BS Computer Science" }],
    section_config: {
      sections: [
        {
          id: "personal_info",
          type: "personal_info",
          visible: true,
          order: 0,
          title: "Personal Info",
        },
        {
          id: "work_experience",
          type: "work_experience",
          visible: true,
          order: 1,
          title: "Work Experience",
        },
        {
          id: "skills",
          type: "skills",
          visible: false,
          order: 2,
          title: "Skills",
        },
        {
          id: "education",
          type: "education",
          visible: false,
          order: 3,
          title: "Education",
        },
      ],
    },
  };

  it("preserves personal_info always", () => {
    const result = filterVisibleSections(mockCVData);
    expect(result.personal_info).toEqual(mockCVData.personal_info);
  });

  it("removes hidden sections", () => {
    const result = filterVisibleSections(mockCVData);
    expect(result.work_experience).toBeDefined();
    expect(result.skills).toBeUndefined();
    expect(result.education).toBeUndefined();
  });

  it("updates section_config to only include visible sections", () => {
    const result = filterVisibleSections(mockCVData);
    expect(result.section_config.sections).toHaveLength(2); // personal_info + work_experience
    expect(result.section_config.sections.every((s: any) => s.visible !== false)).toBe(true);
  });

  it("treats all sections as visible when no section_config exists", () => {
    const dataWithoutConfig = { ...mockCVData };
    delete dataWithoutConfig.section_config;
    const result = filterVisibleSections(dataWithoutConfig);
    expect(result).toEqual(dataWithoutConfig);
  });

  it("treats all sections as visible when section_config is empty", () => {
    const dataWithEmptyConfig = {
      ...mockCVData,
      section_config: { sections: [] },
    };
    const result = filterVisibleSections(dataWithEmptyConfig);
    expect(result).toEqual(dataWithEmptyConfig);
  });

  it("defaults to visible when visibility not specified", () => {
    const dataWithMissingVisibility = {
      ...mockCVData,
      section_config: {
        sections: [{ id: "skills", type: "skills", order: 0, title: "Skills" }],
      },
    };
    const result = filterVisibleSections(dataWithMissingVisibility);
    expect(result.skills).toBeDefined();
  });

  it("handles section type from id when type is missing", () => {
    const dataWithIdOnly = {
      work_experience: [{ title: "Engineer" }],
      section_config: {
        sections: [
          { id: "work_experience", visible: true, order: 0, title: "Work" },
        ],
      },
    };
    const result = filterVisibleSections(dataWithIdOnly);
    expect(result.work_experience).toBeDefined();
  });

  it("filters multiple hidden sections correctly", () => {
    const dataWithManyHidden = {
      personal_info: { full_name: "Test" },
      professional_summary: { content: "Summary" },
      work_experience: [{ title: "Job" }],
      education: [{ degree: "BS" }],
      skills: { technical: { General: ["A"] } },
      certifications: [{ name: "Cert" }],
      section_config: {
        sections: [
          { id: "personal_info", type: "personal_info", visible: true, order: 0, title: "Info" },
          { id: "professional_summary", type: "professional_summary", visible: false, order: 1, title: "Summary" },
          { id: "work_experience", type: "work_experience", visible: true, order: 2, title: "Work" },
          { id: "education", type: "education", visible: false, order: 3, title: "Education" },
          { id: "skills", type: "skills", visible: true, order: 4, title: "Skills" },
          { id: "certifications", type: "certifications", visible: false, order: 5, title: "Certs" },
        ],
      },
    };
    const result = filterVisibleSections(dataWithManyHidden);
    expect(result.personal_info).toBeDefined();
    expect(result.professional_summary).toBeUndefined();
    expect(result.work_experience).toBeDefined();
    expect(result.education).toBeUndefined();
    expect(result.skills).toBeDefined();
    expect(result.certifications).toBeUndefined();
  });
});

describe("calculateCVCompleteness with hidden sections", () => {
  it("returns incomplete when work_experience is hidden", () => {
    const cvData = {
      work_experience: [{ title: "Engineer", description: "Built things" }],
      skills: { technical: { General: ["A", "B", "C"] } },
      section_config: {
        sections: [
          {
            id: "work_experience",
            type: "work_experience",
            visible: false,
            order: 0,
            title: "Work",
          },
          {
            id: "skills",
            type: "skills",
            visible: true,
            order: 1,
            title: "Skills",
          },
        ],
      },
    };
    const result = calculateCVCompleteness(cvData);
    expect(result.isComplete).toBe(false);
    expect(result.score).toBe(50); // Only skills count
    expect(result.missing).toContain(
      "work experience with description or achievements"
    );
    expect(result.details.hasWorkExperience).toBe(false);
    expect(result.details.hasSkills).toBe(true);
  });

  it("returns incomplete when skills are hidden", () => {
    const cvData = {
      work_experience: [{ title: "Engineer", description: "Built things" }],
      skills: { technical: { General: ["A", "B", "C"] } },
      section_config: {
        sections: [
          {
            id: "work_experience",
            type: "work_experience",
            visible: true,
            order: 0,
            title: "Work",
          },
          {
            id: "skills",
            type: "skills",
            visible: false,
            order: 1,
            title: "Skills",
          },
        ],
      },
    };
    const result = calculateCVCompleteness(cvData);
    expect(result.isComplete).toBe(false);
    expect(result.score).toBe(50); // Only work experience counts
    expect(result.missing).toContain("at least 3 skills");
    expect(result.details.hasWorkExperience).toBe(true);
    expect(result.details.hasSkills).toBe(false);
    expect(result.details.skillCount).toBe(0);
  });

  it("returns incomplete when both required sections are hidden", () => {
    const cvData = {
      work_experience: [{ title: "Engineer", description: "Built things" }],
      skills: { technical: { General: ["A", "B", "C"] } },
      section_config: {
        sections: [
          {
            id: "work_experience",
            type: "work_experience",
            visible: false,
            order: 0,
            title: "Work",
          },
          {
            id: "skills",
            type: "skills",
            visible: false,
            order: 1,
            title: "Skills",
          },
        ],
      },
    };
    const result = calculateCVCompleteness(cvData);
    expect(result.isComplete).toBe(false);
    expect(result.score).toBe(0);
    expect(result.missing).toHaveLength(2);
    expect(result.missing).toContain(
      "work experience with description or achievements"
    );
    expect(result.missing).toContain("at least 3 skills");
  });

  it("returns complete only when visible sections meet requirements", () => {
    const cvData = {
      work_experience: [{ title: "Engineer", description: "Built things" }],
      education: [{ degree: "BS" }],
      skills: { technical: { General: ["A", "B", "C"] } },
      section_config: {
        sections: [
          {
            id: "work_experience",
            type: "work_experience",
            visible: true,
            order: 0,
            title: "Work",
          },
          {
            id: "skills",
            type: "skills",
            visible: true,
            order: 1,
            title: "Skills",
          },
          {
            id: "education",
            type: "education",
            visible: false,
            order: 2,
            title: "Education",
          },
        ],
      },
    };
    const result = calculateCVCompleteness(cvData);
    expect(result.isComplete).toBe(true);
    expect(result.score).toBe(100);
    expect(result.missing).toHaveLength(0);
    expect(result.details.hasWorkExperience).toBe(true);
    expect(result.details.hasSkills).toBe(true);
  });

  it("handles partial skill count with hidden skills section", () => {
    const cvData = {
      work_experience: [{ title: "Engineer", description: "Built things" }],
      skills: { technical: { General: ["A", "B"] } }, // Only 2 skills
      section_config: {
        sections: [
          {
            id: "work_experience",
            type: "work_experience",
            visible: true,
            order: 0,
            title: "Work",
          },
          {
            id: "skills",
            type: "skills",
            visible: false,
            order: 1,
            title: "Skills",
          },
        ],
      },
    };
    const result = calculateCVCompleteness(cvData);
    expect(result.isComplete).toBe(false);
    expect(result.score).toBe(50); // Work experience only, skills hidden so don't count
    expect(result.details.skillCount).toBe(0);
  });

  it("maintains backward compatibility with no section_config", () => {
    const cvData = {
      work_experience: [{ title: "Engineer", description: "Built things" }],
      skills: { technical: { General: ["A", "B", "C"] } },
    };
    const result = calculateCVCompleteness(cvData);
    expect(result.isComplete).toBe(true);
    expect(result.score).toBe(100);
  });

  it("counts work experience correctly when visible", () => {
    const cvData = {
      work_experience: [
        { title: "Job 1", description: "Work" },
        { title: "Job 2", description: "More work" },
      ],
      skills: { technical: { General: ["A", "B", "C"] } },
      section_config: {
        sections: [
          {
            id: "work_experience",
            type: "work_experience",
            visible: true,
            order: 0,
            title: "Work",
          },
          {
            id: "skills",
            type: "skills",
            visible: true,
            order: 1,
            title: "Skills",
          },
        ],
      },
    };
    const result = calculateCVCompleteness(cvData);
    expect(result.details.workExpCount).toBe(2);
  });

  it("returns zero work experience count when hidden", () => {
    const cvData = {
      work_experience: [
        { title: "Job 1", description: "Work" },
        { title: "Job 2", description: "More work" },
      ],
      skills: { technical: { General: ["A", "B", "C"] } },
      section_config: {
        sections: [
          {
            id: "work_experience",
            type: "work_experience",
            visible: false,
            order: 0,
            title: "Work",
          },
          {
            id: "skills",
            type: "skills",
            visible: true,
            order: 1,
            title: "Skills",
          },
        ],
      },
    };
    const result = calculateCVCompleteness(cvData);
    expect(result.details.workExpCount).toBe(0);
  });
});
