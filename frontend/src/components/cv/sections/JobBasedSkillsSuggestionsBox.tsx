/**
 * Presentational box for job-based AI suggested skills (from job description).
 * Renders technical/soft suggestion chips and Apply All / Discard actions.
 * Used in both edit and display mode; behavior is callback-driven.
 */

import React from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import AddIcon from "@mui/icons-material/Add";
import InfoIcon from "@mui/icons-material/InfoOutlined";
import CloseIcon from "@mui/icons-material/Close";
import type { SkillsSuggestions, SkillSuggestion } from "../../../types/ai";

export interface JobBasedSkillsSuggestionsBoxProps {
  suggestions: SkillsSuggestions;
  onApplyOne: (
    suggestion: SkillSuggestion,
    type: "technical" | "soft",
  ) => void | Promise<void>;
  onApplyAll: () => void | Promise<void>;
  onRejectAll: () => void | Promise<void>;
  variant: "edit" | "display";
}

export const JobBasedSkillsSuggestionsBox: React.FC<
  JobBasedSkillsSuggestionsBoxProps
> = ({ suggestions, onApplyOne, onApplyAll, onRejectAll, variant }) => {
  const isEdit = variant === "edit";
  const hasAny =
    suggestions.technical.length > 0 || suggestions.soft.length > 0;

  const boxSx = isEdit
    ? {
        mt: 2,
        p: 2,
        backgroundColor: "#E3F2FD",
        border: "1px solid #90CAF9",
        borderRadius: "8px",
      }
    : {
        mt: 2,
        p: { xs: 1.5, sm: 2 },
        backgroundColor: "#E3F2FD",
        border: "1px solid #BBDEFB",
        borderRadius: 1,
      };

  const titleSx = isEdit
    ? { display: "flex", alignItems: "center", mb: 1.5 }
    : { display: "flex", alignItems: "center", mb: 1 };

  const subsectionLabelSx = isEdit
    ? { fontWeight: 500, fontSize: "13px", color: "#424242", mb: 1 }
    : {
        fontWeight: "bold",
        color: "#666",
        display: "block",
        mb: 1,
      };

  const chipWrapSx = isEdit
    ? { display: "flex", flexWrap: "wrap", gap: 1 }
    : {
        display: "flex",
        flexWrap: "wrap",
        gap: { xs: 0.25, sm: 0.5 },
      };

  const technicalChipSx = isEdit
    ? {
        backgroundColor: "white",
        border: "1px solid #64B5F6",
        borderRadius: "16px",
        padding: "6px 12px",
        cursor: "pointer",
        transition: "all 0.2s",
        "&:hover": {
          backgroundColor: "#E3F2FD",
          borderColor: "#42A5F5",
        },
        "& .MuiChip-label": { padding: 0 },
      }
    : {
        backgroundColor: "white",
        border: "1px solid #1976d2",
        color: "#1976d2",
        cursor: "pointer",
        "&:hover": { backgroundColor: "#f5f5f5" },
      };

  const softChipSx = isEdit
    ? { ...technicalChipSx }
    : {
        backgroundColor: "white",
        border: "1px solid #7b1fa2",
        color: "#7b1fa2",
        cursor: "pointer",
        "&:hover": { backgroundColor: "#f5f5f5" },
      };

  const buttonBoxSx = {
    display: "flex",
    gap: 1,
    mt: 2,
    pt: 2,
    borderTop: "1px solid #BBDEFB",
  };

  const primaryButtonSx = {
    backgroundColor: "#1976D2",
    color: "white",
    textTransform: "none",
    fontSize: "12px",
    fontWeight: 500,
    px: 2,
    py: 0.5,
    "&:hover": { backgroundColor: "#1565C0" },
  };

  const secondaryButtonSx = {
    borderColor: "#1976D2",
    color: "#1976D2",
    textTransform: "none",
    fontSize: "12px",
    fontWeight: 500,
    px: 2,
    py: 0.5,
    "&:hover": {
      borderColor: "#1565C0",
      backgroundColor: "#E3F2FD",
    },
  };

  return (
    <Box sx={boxSx}>
      <Box sx={titleSx}>
        <Typography
          variant="subtitle2"
          sx={
            isEdit
              ? { fontWeight: 600, fontSize: "14px", color: "#1976D2" }
              : { fontWeight: "bold", color: "#1976d2" }
          }
        >
          AI Suggested Skills
        </Typography>
        <Tooltip
          title={
            isEdit
              ? "These skills from the job description are not in your CV yet"
              : "AI-generated skills based on job description"
          }
        >
          <InfoIcon
            sx={{ ml: isEdit ? 0.5 : 1, fontSize: isEdit ? "16px" : 16, color: "#1976d2" }}
          />
        </Tooltip>
      </Box>

      {hasAny && (
        <Box>
          {suggestions.technical.length > 0 && (
            <Box sx={{ mb: suggestions.soft.length > 0 ? 2 : 0 }}>
              <Typography
                variant={isEdit ? "body2" : "caption"}
                sx={subsectionLabelSx}
              >
                {isEdit ? "Technical Skills" : "Technical Skills:"}
              </Typography>
              <Box sx={chipWrapSx}>
                {suggestions.technical.map((suggestion) => (
                  <Tooltip
                    key={suggestion.skill}
                    title={suggestion.reasoning}
                    arrow={isEdit}
                  >
                    <Chip
                      label={
                        isEdit ? (
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 0.5,
                            }}
                          >
                            <span>{suggestion.skill}</span>
                            <AddIcon sx={{ fontSize: "16px" }} />
                          </Box>
                        ) : (
                          suggestion.skill
                        )
                      }
                      size={isEdit ? "medium" : "small"}
                      onClick={() => onApplyOne(suggestion, "technical")}
                      sx={technicalChipSx}
                    />
                  </Tooltip>
                ))}
              </Box>
            </Box>
          )}

          {suggestions.soft.length > 0 && (
            <Box>
              <Typography
                variant={isEdit ? "body2" : "caption"}
                sx={subsectionLabelSx}
              >
                {isEdit ? "Soft Skills" : "Soft Skills:"}
              </Typography>
              <Box sx={chipWrapSx}>
                {suggestions.soft.map((suggestion) => (
                  <Tooltip
                    key={suggestion.skill}
                    title={suggestion.reasoning}
                    arrow={isEdit}
                  >
                    <Chip
                      label={
                        isEdit ? (
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 0.5,
                            }}
                          >
                            <span>{suggestion.skill}</span>
                            <AddIcon sx={{ fontSize: "16px" }} />
                          </Box>
                        ) : (
                          suggestion.skill
                        )
                      }
                      size={isEdit ? "medium" : "small"}
                      onClick={() => onApplyOne(suggestion, "soft")}
                      sx={softChipSx}
                    />
                  </Tooltip>
                ))}
              </Box>
            </Box>
          )}

          <Box sx={buttonBoxSx}>
            <Button
              variant="contained"
              size="small"
              onClick={onApplyAll}
              sx={primaryButtonSx}
            >
              Apply All
            </Button>
            <Button
              variant="outlined"
              size="small"
              onClick={onRejectAll}
              startIcon={<CloseIcon />}
              sx={secondaryButtonSx}
            >
              Discard
            </Button>
          </Box>
        </Box>
      )}
    </Box>
  );
};
