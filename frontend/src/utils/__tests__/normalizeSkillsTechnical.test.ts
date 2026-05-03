import type { CV } from "../../types/cv";
import {
  normalizeCVSkillsTechnicalInParsedData,
  normalizeSkillsTechnical,
} from "../normalizeSkillsTechnical";

describe("normalizeSkillsTechnical", () => {
  it("returns empty object for nullish", () => {
    expect(normalizeSkillsTechnical(undefined)).toEqual({});
    expect(normalizeSkillsTechnical(null)).toEqual({});
  });

  it("wraps legacy string array under General", () => {
    expect(normalizeSkillsTechnical(["  Python ", ""])).toEqual({
      General: ["Python"],
    });
  });

  it("returns empty when legacy array has no strings", () => {
    expect(normalizeSkillsTechnical([])).toEqual({});
    expect(normalizeSkillsTechnical([1, 2] as unknown as string[])).toEqual({});
  });

  it("keeps categorized map and drops invalid entries", () => {
    expect(
      normalizeSkillsTechnical({
        Lang: ["English"],
        Bad: "not-array",
        Empty: [],
        "": ["x"],
      } as unknown as Record<string, string[]>),
    ).toEqual({ Lang: ["English"] });
  });

  it("trims category keys and skill strings", () => {
    expect(
      normalizeSkillsTechnical({
        "  Dev  ": ["  Docker  "],
      }),
    ).toEqual({ Dev: ["Docker"] });
  });
});

describe("normalizeCVSkillsTechnicalInParsedData", () => {
  it("no-ops when parsed_data missing", () => {
    const cv = { id: "1" } as CV;
    expect(normalizeCVSkillsTechnicalInParsedData(cv)).toBe(cv);
  });

  it("normalizes nested skills.technical", () => {
    const cv = {
      id: "a",
      user_id: "u",
      original_filename: "f",
      file_size: 0,
      file_type: "application/pdf",
      created_at: "",
      updated_at: "",
      is_parsed: true,
      parsed_data: {
        skills: { technical: ["Go", "Rust"] },
      },
      is_imported: false,
      has_been_edited: false,
    } as CV;
    const next = normalizeCVSkillsTechnicalInParsedData(cv);
    expect(next).not.toBe(cv);
    expect(next.parsed_data?.skills).toEqual({
      technical: { General: ["Go", "Rust"] },
    });
  });
});
