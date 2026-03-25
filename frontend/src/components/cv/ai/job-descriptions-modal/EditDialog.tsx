/**
 * Edit Dialog Component
 *
 * Dialog for editing job description details with form fields and update logic.
 */

import React, { useState, useEffect } from "react";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import CheckIcon from "@mui/icons-material/Check";
import { EditDialogProps } from "./types";

const EditDialog: React.FC<EditDialogProps> = ({
  open,
  jobDescription,
  isLoading,
  onClose,
  onSave,
}) => {
  const [editTitle, setEditTitle] = useState("");
  const [editCompany, setEditCompany] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editContent, setEditContent] = useState("");

  // Pre-fill form with existing data when dialog opens
  useEffect(() => {
    if (open && jobDescription) {
      setEditTitle(jobDescription.title || "");
      setEditCompany(jobDescription.company || "");
      setEditLocation(jobDescription.location || "");
      setEditContent(jobDescription.content);
    }
  }, [open, jobDescription]);

  const handleSubmit = () => {
    if (!jobDescription || !editContent.trim()) {
      return;
    }

    onSave({
      title: editTitle,
      company: editCompany,
      location: editLocation,
      content: editContent,
    });
  };

  const handleClose = () => {
    // Reset form fields
    setEditTitle("");
    setEditCompany("");
    setEditLocation("");
    setEditContent("");
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>Edit Job Description</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Job Title"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            fullWidth
            disabled={isLoading}
          />
          <TextField
            label="Company"
            value={editCompany}
            onChange={(e) => setEditCompany(e.target.value)}
            fullWidth
            disabled={isLoading}
          />
          <TextField
            label="Location"
            value={editLocation}
            onChange={(e) => setEditLocation(e.target.value)}
            fullWidth
            disabled={isLoading}
          />
          <TextField
            label="Job Description"
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            multiline
            rows={8}
            fullWidth
            disabled={isLoading}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={isLoading}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={isLoading || !editContent.trim()}
          startIcon={isLoading ? <CircularProgress size={20} /> : <CheckIcon />}
        >
          {isLoading ? "Saving..." : "Save Changes"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditDialog;
