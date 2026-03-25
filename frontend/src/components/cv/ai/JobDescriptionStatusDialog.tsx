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
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import { JobDescription, JobDescriptionStatusUpdate } from "../../../types/ai";

const getTodayLocalDate = (): string => {
  const now = new Date();
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return localDate.toISOString().split("T")[0];
};

interface JobDescriptionStatusDialogProps {
  open: boolean;
  onClose: () => void;
  jobDescription: JobDescription | null;
  onSave: (updates: JobDescriptionStatusUpdate) => Promise<void>;
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
      const nextStatus = jobDescription.status || "open";
      setStatus(nextStatus);
      // Only initialize with existing date, don't auto-fill
      // Auto-fill only happens when user actively changes status
      const nextApplicationDate = jobDescription.application_date
        ? jobDescription.application_date.split("T")[0]
        : "";
      setApplicationDate(nextApplicationDate);
      setNotes(jobDescription.notes || "");
    }
  }, [open, jobDescription]);

  const handleSave = async () => {
    if (!jobDescription) return;

    setIsSaving(true);
    try {
      const updates: JobDescriptionStatusUpdate = {
        status,
        notes,
      };

      // Only include application_date if status is applied or archived
      if (status === "applied" || status === "archived") {
        if (applicationDate) {
          updates.application_date = new Date(applicationDate).toISOString();
        } else {
          // Explicitly clear date when user removes it but keeps status
          updates.application_date = null;
        }
      } else {
        // Clear application_date if status is open
        updates.application_date = null;
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
              onChange={(e) => {
                const nextStatus = e.target.value;
                setStatus(nextStatus);
                if (
                  (nextStatus === "applied" || nextStatus === "archived") &&
                  !applicationDate
                ) {
                  setApplicationDate(getTodayLocalDate());
                }
              }}
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
