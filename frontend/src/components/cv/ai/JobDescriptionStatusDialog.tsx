/**
 * Job Description Status Dialog Component
 *
 * This component provides a dialog for updating the status and metadata
 * of a job description. Features include:
 * - Status selection (open, applied, archived)
 * - Application date picker (for applied/archived status)
 * - Notes text area
 * - Save/Cancel actions
 *
 * Key responsibilities:
 * - Display current status and metadata
 * - Validate and submit status updates
 * - Integrate with AI store for state management
 * - Provide user-friendly date selection
 *
 * Usage:
 * - Used in JobLibrary and JobDescriptionsModal
 * - Pass jobDescription prop to pre-fill current values
 * - onSave callback receives updated fields
 */

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Stack,
  CircularProgress,
} from "@mui/material";
import { JobDescription } from "../../../types/ai";

interface JobDescriptionStatusDialogProps {
  open: boolean;
  onClose: () => void;
  jobDescription: JobDescription | null;
  onSave: (updates: {
    status?: string;
    application_date?: string;
    notes?: string;
  }) => Promise<void>;
}

const JobDescriptionStatusDialog: React.FC<
  JobDescriptionStatusDialogProps
> = ({ open, onClose, jobDescription, onSave }) => {
  const [status, setStatus] = useState<string>("open");
  const [applicationDate, setApplicationDate] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);

  // Initialize form with current values when dialog opens
  useEffect(() => {
    if (open && jobDescription) {
      setStatus(jobDescription.status || "open");
      setApplicationDate(
        jobDescription.application_date
          ? jobDescription.application_date.split("T")[0]
          : ""
      );
      setNotes(jobDescription.notes || "");
    }
  }, [open, jobDescription]);

  const handleSave = async () => {
    if (!jobDescription) return;

    setIsSaving(true);
    try {
      const updates: {
        status?: string;
        application_date?: string;
        notes?: string;
      } = {
        status,
        notes,
      };

      // Only include application_date if status is applied or archived
      if (status === "applied" || status === "archived") {
        if (applicationDate) {
          updates.application_date = new Date(applicationDate).toISOString();
        }
      } else {
        // Clear application_date if status is open
        updates.application_date = undefined;
      }

      await onSave(updates);
      onClose();
    } catch (error) {
      console.error("Error saving status:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    if (!isSaving) {
      onClose();
    }
  };

  const showDatePicker = status === "applied" || status === "archived";

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Update Status</DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 2 }}>
          {/* Status Selection */}
          <FormControl fullWidth>
            <InputLabel>Status</InputLabel>
            <Select
              value={status}
              label="Status"
              onChange={(e) => setStatus(e.target.value)}
              disabled={isSaving}
            >
              <MenuItem value="open">Open</MenuItem>
              <MenuItem value="applied">Applied</MenuItem>
              <MenuItem value="archived">Archived</MenuItem>
            </Select>
          </FormControl>

          {/* Application Date (shown for applied/archived) */}
          {showDatePicker && (
            <TextField
              label="Application Date"
              type="date"
              value={applicationDate}
              onChange={(e) => setApplicationDate(e.target.value)}
              disabled={isSaving}
              InputLabelProps={{
                shrink: true,
              }}
              fullWidth
              helperText={
                status === "applied"
                  ? "When did you submit your application?"
                  : "When did this application close?"
              }
            />
          )}

          {/* Notes */}
          <TextField
            label="Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={isSaving}
            multiline
            rows={4}
            fullWidth
            placeholder="Add any notes about this application..."
            helperText="Optional: Track follow-ups, interview dates, or other details"
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={isSaving}>
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={isSaving}
          startIcon={isSaving ? <CircularProgress size={20} /> : null}
        >
          {isSaving ? "Saving..." : "Save"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default JobDescriptionStatusDialog;
