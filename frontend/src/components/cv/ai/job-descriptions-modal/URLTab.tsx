/**
 * URL Tab Component
 *
 * Handles URL input and optional pasted job text for AI parsing with real-time validation.
 */

import React, { useMemo } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import AddIcon from "@mui/icons-material/Add";
import { MIN_PASTED_JOB_TEXT_CHARS, URLTabProps } from "./types";

const DISABLED_FIELD_STYLES = {
  "& .MuiInputBase-root.Mui-disabled": {
    backgroundColor: "action.disabledBackground",
    opacity: 0.85,
  },
  "& .MuiInputBase-root.Mui-disabled .MuiOutlinedInput-notchedOutline": {
    borderColor: "text.disabled",
    borderStyle: "dashed",
  },
  "& .MuiInputLabel-root.Mui-disabled": {
    color: "text.disabled",
  },
} as const;

const URLTab: React.FC<URLTabProps> = ({
  urlInput,
  urlValidation,
  urlTouched,
  urlTabPasteText,
  isLoading,
  onUrlChange,
  onUrlBlur,
  onPasteChange,
  onSubmit,
  loadSaveDisabled,
}) => {
  const isUrlValid = urlValidation.isValid;
  const showUrlError = urlTouched && !isUrlValid;

  const urlFieldDisabled = isLoading || urlTabPasteText.trim().length > 0;
  const pasteFieldDisabled = isLoading || urlInput.trim().length > 0;

  const trimmedPaste = urlTabPasteText.trim();
  const pasteLen = trimmedPaste.length;
  const pasteWordCount = useMemo(() => {
    return trimmedPaste.split(/\s+/).filter((word) => word.length > 0).length;
  }, [trimmedPaste]);

  return (
    <Stack spacing={3} sx={{ maxWidth: 800, mx: "auto" }}>
      <Alert severity="info" sx={{ mb: 1 }}>
        <Typography variant="body2">
          Use a direct job URL (not a search page) or paste the full posting
          text below
        </Typography>
      </Alert>
      <TextField
        label="Job Posting URL"
        placeholder="https://company.com/careers/job-title..."
        value={urlInput}
        onChange={onUrlChange}
        onBlur={onUrlBlur}
        fullWidth
        disabled={urlFieldDisabled}
        error={showUrlError}
        helperText={
          showUrlError
            ? urlValidation.message
            : urlValidation.isValid && urlValidation.message
              ? urlValidation.message
              : "Paste the direct URL of a specific job posting (not a search results page)."
        }
        sx={DISABLED_FIELD_STYLES}
      />

      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        <TextField
          label="Or paste job description text"
          placeholder="Paste the full job posting text here for AI parsing..."
          value={urlTabPasteText}
          onChange={onPasteChange}
          multiline
          rows={8}
          fullWidth
          disabled={pasteFieldDisabled}
          variant="outlined"
          sx={{
            "& .MuiOutlinedInput-root": {
              alignItems: "flex-start",
            },
            ...DISABLED_FIELD_STYLES,
          }}
        />
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 1,
          }}
        >
          <Typography variant="caption" color="text.secondary">
            {pasteLen} characters • {pasteWordCount} words
            {pasteLen > 0 && pasteLen < MIN_PASTED_JOB_TEXT_CHARS
              ? ` • at least ${MIN_PASTED_JOB_TEXT_CHARS} characters required`
              : ""}
          </Typography>
          {pasteLen >= MIN_PASTED_JOB_TEXT_CHARS && (
            <Typography variant="caption" color="success.main">
              Ready to parse
            </Typography>
          )}
        </Box>
        <Typography variant="caption" color="text.secondary">
          Clear the URL field to paste text, or clear this field to enter a URL.
        </Typography>
      </Box>

      <Button
        variant="contained"
        onClick={onSubmit}
        disabled={loadSaveDisabled}
        startIcon={isLoading ? <CircularProgress size={20} /> : <AddIcon />}
        size="large"
        sx={{ alignSelf: "flex-start" }}
      >
        {isLoading ? "Loading..." : "LOAD & SAVE"}
      </Button>
    </Stack>
  );
};

export default URLTab;
