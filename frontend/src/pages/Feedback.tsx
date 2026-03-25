/**
 * Feedback Page – Submit bug reports, suggestions, or general feedback.
 * Authenticated users only; after submit shows a thank-you message.
 */
import React, { useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Select from "@mui/material/Select";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import type { SelectChangeEvent } from "@mui/material/Select";
import { feedbackService } from "../services/feedbackService";
import type { FeedbackType } from "../types/feedback";
import { normalizeApiError } from "../services/api";

const FEEDBACK_TYPES: { value: FeedbackType; label: string }[] = [
  { value: "bug", label: "Bug Report" },
  { value: "suggestion", label: "Suggestion" },
  { value: "general", label: "General Feedback" },
];

const Feedback: React.FC = () => {
  const [type, setType] = useState<FeedbackType>("general");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTypeChange = (event: SelectChangeEvent<FeedbackType>) => {
    setType(event.target.value as FeedbackType);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmedTitle = title.trim();
    const trimmedBody = body.trim();
    if (!trimmedTitle) {
      setError("Please enter a title.");
      return;
    }
    if (trimmedTitle.length > 200) {
      setError("Title must be at most 200 characters.");
      return;
    }
    if (!trimmedBody) {
      setError("Please enter your feedback.");
      return;
    }
    if (trimmedBody.length < 10) {
      setError("Feedback must be at least 10 characters.");
      return;
    }
    if (trimmedBody.length > 5000) {
      setError("Feedback must be at most 5000 characters.");
      return;
    }

    setSubmitting(true);
    try {
      await feedbackService.submitFeedback({
        type,
        title: trimmedTitle,
        body: trimmedBody,
        page_url:
          typeof window !== "undefined" ? window.location.href : undefined,
      });
      setSuccess(true);
      setTitle("");
      setBody("");
    } catch (err) {
      setError(normalizeApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ py: 4, minHeight: "100vh" }}>
      <Container maxWidth="sm">
        <Typography
          variant="h4"
          component="h1"
          sx={{ fontWeight: 700, mb: 1, textAlign: "center" }}
        >
          Send Feedback
        </Typography>
        <Typography
          variant="body1"
          color="text.secondary"
          sx={{ mb: 3, textAlign: "center" }}
        >
          Report a bug, suggest an improvement, or share general feedback.
        </Typography>

        {success && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(false)}>
            Thank you! Your feedback has been submitted.
          </Alert>
        )}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Paper elevation={1} sx={{ p: 3 }}>
          <form onSubmit={handleSubmit}>
            <FormControl fullWidth size="medium" sx={{ mb: 2 }}>
              <InputLabel id="feedback-type-label">Type</InputLabel>
              <Select
                labelId="feedback-type-label"
                id="feedback-type"
                value={type}
                label="Type"
                onChange={handleTypeChange}
              >
                {FEEDBACK_TYPES.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Short summary"
              inputProps={{ maxLength: 200 }}
              helperText={`${title.length}/200`}
              sx={{ mb: 2 }}
              required
            />

            <TextField
              fullWidth
              label="Your feedback"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Describe the issue or suggestion in detail..."
              multiline
              minRows={4}
              inputProps={{ minLength: 10, maxLength: 5000 }}
              helperText={`${body.length}/5000 (min 10 characters)`}
              sx={{ mb: 3 }}
              required
            />

            <Button
              type="submit"
              variant="contained"
              fullWidth
              disabled={submitting}
            >
              {submitting ? "Submitting…" : "Submit feedback"}
            </Button>
          </form>
        </Paper>
      </Container>
    </Box>
  );
};

export default Feedback;
