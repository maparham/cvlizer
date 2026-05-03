import {
  mergeAllJobSkillSuggestions,
  mergeOneJobSkillSuggestion,
} from "../skillsSuggestionHelpers";

describe("skillsSuggestionHelpers", () => {
  test("merges one skill into target category with case-insensitive dedupe", () => {
    const next = mergeOneJobSkillSuggestion(
      { technical: { "Soft Skills": ["Communication"] } },
      "communication",
      "Soft Skills",
    );

    expect(next.technical).toEqual({ "Soft Skills": ["Communication"] });
  });

  test("merges one skill into provided category", () => {
    const next = mergeOneJobSkillSuggestion(
      {
        technical: {
          "Programming Languages": ["TypeScript"],
        },
      },
      "Node.js",
      "Programming Languages",
    );

    expect(next.technical).toEqual({
      "Programming Languages": ["TypeScript", "Node.js"],
    });
  });

  test("merges all suggestions into categorized technical field", () => {
    const next = mergeAllJobSkillSuggestions(
      {
        technical: {
          "Frameworks": ["React"],
        },
      },
      {
        Frameworks: [
          { skill: "Node.js", reasoning: "job match" },
          { skill: "react", reasoning: "dup" },
        ],
        "Soft Skills": [{ skill: "Communication", reasoning: "job match" }],
      },
    );

    expect(next.technical).toEqual({
      "Frameworks": ["React", "Node.js"],
      "Soft Skills": ["Communication"],
    });
  });
});
