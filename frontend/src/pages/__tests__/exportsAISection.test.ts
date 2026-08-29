/**
 * The export page only offers the rahkar.pro credit toggle when an export
 * would actually render the AI-generated section. These cases mirror the
 * backend gate in latex_export_service, so the toggle never appears on a CV
 * whose PDF would carry no credit line.
 */

import { exportsAISection } from "../ExportPage";
import type { CVData } from "../../types/cv";

const aiSection = {
  id: "why_good_fit",
  title: "Why I'm a Good Fit",
  content: "I am a strong match for this role.",
  type: "cover_letter",
};

const buildCV = (overrides: Partial<CVData> = {}): CVData =>
  ({
    personal_info: { full_name: "Ada Lovelace" },
    custom_sections: [aiSection],
    work_experience: [],
    education: [],
    ...overrides,
  }) as unknown as CVData;

describe("exportsAISection", () => {
  it("returns false when there is no CV data", () => {
    expect(exportsAISection(undefined)).toBe(false);
  });

  it("returns false when the CV has no AI section", () => {
    expect(exportsAISection(buildCV({ custom_sections: [] }))).toBe(false);
  });

  it("returns false when the AI section is present but empty", () => {
    expect(
      exportsAISection(
        buildCV({ custom_sections: [{ ...aiSection, content: "   " }] } as Partial<CVData>),
      ),
    ).toBe(false);
  });

  it("returns true without a section_config, matching the default-order path", () => {
    expect(exportsAISection(buildCV())).toBe(true);
  });

  it("returns true when section_config marks the AI section visible", () => {
    expect(
      exportsAISection(
        buildCV({
          section_config: {
            sections: [
              { id: "why_good_fit", type: "custom", order: 1, visible: true },
            ],
          },
        } as Partial<CVData>),
      ),
    ).toBe(true);
  });

  it("returns false when section_config hides the AI section", () => {
    expect(
      exportsAISection(
        buildCV({
          section_config: {
            sections: [
              { id: "why_good_fit", type: "custom", order: 1, visible: false },
            ],
          },
        } as Partial<CVData>),
      ),
    ).toBe(false);
  });

  it("returns false when section_config omits the AI section entirely", () => {
    expect(
      exportsAISection(
        buildCV({
          section_config: {
            sections: [
              { id: "work_experience", type: "work_experience", order: 1, visible: true },
            ],
          },
        } as Partial<CVData>),
      ),
    ).toBe(false);
  });
});
