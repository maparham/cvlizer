/**
 * Manual Tab Component
 *
 * Handles manual job description entry with form fields, character counter, and validation.
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
import { ManualTabProps } from "./types";

const ManualTab: React.FC<ManualTabProps> = ({
  title,
  setTitle,
  company,
  setCompany,
  location,
  setLocation,
  textInput,
  setTextInput,
  isLoading,
  onSubmit,
}) => {
  const wordCount = textInput
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0).length;

  return (
    <Stack spacing={3} sx={{ maxWidth: 800, mx: "auto" }}>
      <Alert severity="info">
        <Typography variant="body2">
          <strong>Tip:</strong> Include complete job requirements,
          responsibilities, and qualifications for the best AI optimization
          results
        </Typography>
      </Alert>

      <Box
        sx={{
          display: "flex",
          gap: 3,
          flexWrap: "wrap",
          alignItems: "flex-end",
        }}
      >
        <Box
          sx={{
            flex: "1 1 calc(33.333% - 16px)",
            minWidth: "200px",
          }}
        >
          <TextField
            label="Job Title (Optional)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            fullWidth
            disabled={isLoading}
            variant="outlined"
            size="medium"
          />
        </Box>
        <Box
          sx={{
            flex: "1 1 calc(33.333% - 16px)",
            minWidth: "200px",
          }}
        >
          <TextField
            label="Company (Optional)"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            fullWidth
            disabled={isLoading}
            variant="outlined"
            size="medium"
          />
        </Box>
        <Box
          sx={{
            flex: "1 1 calc(33.333% - 16px)",
            minWidth: "200px",
          }}
        >
          <TextField
            label="Location (Optional)"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            fullWidth
            disabled={isLoading}
            variant="outlined"
            size="medium"
          />
        </Box>
      </Box>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        <TextField
          label="Job Description"
          placeholder="Paste the job description text here..."
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          multiline
          rows={10}
          fullWidth
          disabled={isLoading}
          variant="outlined"
          sx={{
            "& .MuiOutlinedInput-root": {
              alignItems: "flex-start",
            },
          }}
        />

        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography variant="caption" color="text.secondary">
            {textInput.length} characters • {wordCount} words
          </Typography>
          {textInput.length > 0 && (
            <Typography
              variant="caption"
              color={textInput.length < 100 ? "warning.main" : "success.main"}
            >
              {textInput.length < 100
                ? "⚠ More detail recommended"
                : "✓ Good detail level"}
            </Typography>
          )}
        </Box>
      </Box>

      <Box
        sx={{
          display: "flex",
          justifyContent: "flex-start",
          pt: 1,
        }}
      >
        <Button
          variant="contained"
          onClick={onSubmit}
          disabled={isLoading || !textInput.trim()}
          startIcon={isLoading ? <CircularProgress size={20} /> : <AddIcon />}
          size="large"
          sx={{ minWidth: 200 }}
        >
          {isLoading ? "Saving..." : "Save Job Description"}
        </Button>
      </Box>
    </Stack>
  );
};

export default ManualTab;
