/**
 * URL Tab Component
 *
 * Handles URL input for job description parsing with real-time validation.
 */

import React from "react";
import {
  Stack,
  Alert,
  TextField,
  Button,
  CircularProgress,
  Typography,
  Box,
} from "@mui/material";
import { Add as AddIcon } from "@mui/icons-material";
import { URLTabProps } from "./types";

const URLTab: React.FC<URLTabProps> = ({
  urlInput,
  urlValidation,
  urlTouched,
  isLoading,
  onUrlChange,
  onUrlBlur,
  onSubmit,
}) => {
  const isUrlValid = urlValidation.isValid;
  const showUrlError = urlTouched && !isUrlValid;

  return (
    <Stack spacing={3} sx={{ maxWidth: 800, mx: "auto" }}>
      <Alert severity="info" sx={{ mb: 1 }}>
        <Typography variant="body2" sx={{ mb: 0.5 }}>
          <strong>Enter the direct link to the specific job posting</strong> –
          preferably the URL hosted by the company posting the job.
        </Typography>
        <Typography variant="body2">
          Avoid search results pages. Job details will be automatically
          extracted and parsed in the background (typically 10-30 seconds).
        </Typography>
      </Alert>
      <TextField
        label="Job Posting URL"
        placeholder="https://company.com/careers/job-title..."
        value={urlInput}
        onChange={onUrlChange}
        onBlur={onUrlBlur}
        fullWidth
        disabled={isLoading}
        error={showUrlError}
        helperText={
          showUrlError
            ? urlValidation.message
            : urlValidation.isValid && urlValidation.message
              ? urlValidation.message
              : "Paste the direct URL of a specific job posting (not a search results page)."
        }
      />
      <Button
        variant="contained"
        onClick={onSubmit}
        disabled={isLoading || !urlInput.trim() || !isUrlValid}
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
