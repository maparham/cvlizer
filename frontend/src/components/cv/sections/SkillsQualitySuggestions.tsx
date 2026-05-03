/**
 * Presentational component for CV quality skill suggestions (spelling/grammar corrections).
 * Renders CompactSuggestionCard per suggestion and Apply All / Discard actions.
 * Used in both edit and display mode; apply/dismiss behavior is passed via callbacks.
 */

import React from "react";
import Box from "@mui/material/Box";
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

export interface SkillsQualitySuggestionsProps {
  /** Quality skills from CV quality analysis (dynamic categories). */
  suggestions: SkillsSuggestions;
  /** Called when user applies a single skill (full suggestion so replace-by-original can be used). */
  onApplyOne: (
    suggestion: SkillQualitySuggestion,
    category: string,
  ) => void | Promise<void>;
  /** Called when user dismisses a single skill. */
  onDismissOne: (skill: string, category: string) => void | Promise<void>;
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
      {Object.entries(suggestions).map(([key, categorySuggestions]) => {
        // Sort: corrections (with original) first, then suggestions (without original)
        const sorted = [...(categorySuggestions || [])].sort((a, b) => {
          const aIsCorrection = a.original != null && a.original !== "";
          const bIsCorrection = b.original != null && b.original !== "";
          if (aIsCorrection && !bIsCorrection) return -1;
          if (!aIsCorrection && bIsCorrection) return 1;
          return 0;
        });

        return sorted.map((suggestion) => {
          // Build htmlDiff: show both original (deleted) and suggested (inserted) if original exists
          const htmlDiff = suggestion.original
            ? `<del>${escapeHtml(suggestion.original)}</del><ins>${escapeHtml(suggestion.skill)}</ins>`
            : `<ins>${escapeHtml(suggestion.skill)}</ins>`;

          return (
            <Box key={`${key}-${suggestion.skill}`} sx={{ mb: 1 }}>
              <CompactSuggestionCard
                htmlDiff={htmlDiff}
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
          );
        });
      })}
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
