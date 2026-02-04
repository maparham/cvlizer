/**
 * Presentational component for CV quality skill suggestions (spelling/grammar corrections).
 * Renders CompactSuggestionCard per suggestion and Apply All / Discard actions.
 * Used in both edit and display mode; apply/dismiss behavior is passed via callbacks.
 */

import React from "react";
import { Box } from "@mui/material";
import { CompactSuggestionCard } from "../ai/CompactSuggestionCard";
import { SuggestionActionButtons } from "../ai/SuggestionActionButtons";
import type {
  SkillsSuggestions,
  SkillQualitySuggestion,
} from "../../../types/ai";

/** Escape HTML entities so skill text is safe inside diff markup. */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const CATEGORIES: Array<{ key: "technical" | "soft"; label: string }> = [
  { key: "technical", label: "technical" },
  { key: "soft", label: "soft" },
];

export interface SkillsQualitySuggestionsProps {
  /** Quality skills from CV quality analysis (technical + soft). */
  suggestions: SkillsSuggestions;
  /** Called when user applies a single skill (full suggestion so replace-by-original can be used). */
  onApplyOne: (
    suggestion: SkillQualitySuggestion,
    category: "technical" | "soft",
  ) => void | Promise<void>;
  /** Called when user dismisses a single skill. */
  onDismissOne: (skill: string, category: "technical" | "soft") => void | Promise<void>;
  /** Called when user applies all suggestions. */
  onApplyAll: () => void | Promise<void>;
  /** Called when user dismisses all suggestions. */
  onDismissAll: () => void | Promise<void>;
}

export const SkillsQualitySuggestions: React.FC<SkillsQualitySuggestionsProps> = ({
  suggestions,
  onApplyOne,
  onDismissOne,
  onApplyAll,
  onDismissAll,
}) => {
  return (
    <Box sx={{ mt: 1.5 }}>
      {CATEGORIES.map(({ key }) =>
        suggestions[key].map((suggestion) => (
          <Box key={`${key}-${suggestion.skill}`} sx={{ mb: 1 }}>
            <CompactSuggestionCard
              htmlDiff={`<ins>${escapeHtml(suggestion.skill)}</ins>`}
              reasoning={suggestion.reasoning}
              infoTooltip="Skill correction (CV quality)"
              infoIconColor="warning"
              onApply={() => onApplyOne(suggestion, key)}
              onDismiss={() => onDismissOne(suggestion.skill, key)}
              dismissDialogTitle="Dismiss skill correction?"
              variant="importance"
              importance="standard"
              showContentBox={false}
            />
          </Box>
        )),
      )}
      <Box sx={{ mt: 1.5, display: "flex", gap: 1, flexWrap: "wrap" }}>
        <SuggestionActionButtons
          onApply={onApplyAll}
          onDismiss={onDismissAll}
          variant="all"
          applyLabel="Apply All Corrections"
          dismissLabel="Discard Corrections"
        />
      </Box>
    </Box>
  );
};
