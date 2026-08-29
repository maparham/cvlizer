/**
 * Dialog to create a CV by pasting raw resume text. Uses the same backend parse
 * pipeline as PDF/DOCX uploads.
 */
import React, { useState, useEffect } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import LinearProgress from "@mui/material/LinearProgress";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { useCVStore } from "../../stores/cv";

const MIN_LEN = 10;
const MAX_LEN = 50000;

interface CVFromTextDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (cvId: string) => void;
}

const CVFromTextDialog: React.FC<CVFromTextDialogProps> = ({
  open,
  onClose,
  onSuccess,
}) => {
  const [text, setText] = useState("");
  const [title, setTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const { createCVFromText } = useCVStore();

  useEffect(() => {
    if (!open) return;
    setText("");
    setTitle("");
    setError("");
    setSuccess(false);
    setSubmitting(false);
  }, [open]);

  const trimmedLen = text.trim().length;
  const lengthOk = trimmedLen >= MIN_LEN && trimmedLen <= MAX_LEN;

  const handleSubmit = async () => {
    setError("");
    if (!lengthOk) {
      setError(
        `Paste between ${MIN_LEN} and ${MAX_LEN} characters of resume text (after trimming).`,
      );
      return;
    }

    setSubmitting(true);
    try {
      const payload: { text: string; title?: string } = {
        text: text.trim(),
      };
      const t = title.trim();
      if (t) {
        payload.title = t;
      }
      const created = await createCVFromText(payload);
      setSuccess(true);
      setTimeout(() => {
        onSuccess(created.id);
        setSubmitting(false);
        setSuccess(false);
        onClose();
      }, 800);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Could not create CV. Please try again.";
      setError(message);
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!submitting) {
      onClose();
      setError("");
      setSuccess(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      data-testid="cv-from-text-dialog"
    >
      <DialogTitle>CV from text</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 1 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          {success && (
            <Alert severity="success" sx={{ mb: 2 }} icon={<CheckCircleIcon />}>
              CV created — AI is parsing your text in the background.
            </Alert>
          )}
          {submitting && !success && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" gutterBottom>
                Creating CV…
              </Typography>
              <LinearProgress />
            </Box>
          )}
          <TextField
            label="Title (optional)"
            fullWidth
            margin="normal"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={submitting}
            placeholder="e.g. Software Engineer resume"
            inputProps={{ maxLength: 255 }}
          />
          <TextField
            label="Resume text"
            fullWidth
            multiline
            minRows={14}
            margin="normal"
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={submitting}
            placeholder="Paste your full CV or resume text here…"
            inputProps={{
              "aria-describedby": "cv-from-text-limits",
            }}
          />
          <Typography
            id="cv-from-text-limits"
            variant="caption"
            color={lengthOk || trimmedLen === 0 ? "text.secondary" : "error"}
            display="block"
            sx={{ mt: 0.5 }}
          >
            {trimmedLen.toLocaleString()} / {MAX_LEN.toLocaleString()} characters (minimum{" "}
            {MIN_LEN})
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={submitting} data-testid="cv-from-text-cancel">
          {success ? "Close" : "Cancel"}
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={submitting || success || !lengthOk}
          data-testid="cv-from-text-submit"
        >
          {submitting && !success ? "Creating…" : "Create CV"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CVFromTextDialog;
