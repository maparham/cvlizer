/**
 * CoachingDiffMock – Standalone mock for home showcase slide 3.
 * Shows job-tailored coaching diff with phrase-level improvements (Michael Peterson Profile).
 * No app logic; demo-only. Buttons are visual only, no handlers.
 */
import React from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import ReplayIcon from "@mui/icons-material/Replay";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";

const DEMO_DEL_STYLE = {
  backgroundColor: "#ffebee",
  color: "#c62828",
  textDecoration: "line-through" as const,
  padding: "2px 4px",
  borderRadius: "2px",
};
const DEMO_INS_STYLE = {
  backgroundColor: "#e8f5e9",
  color: "#2e7d32",
  fontWeight: 500,
  padding: "2px 4px",
  borderRadius: "2px",
};

const CoachingDiffMock: React.FC = () => {
  return (
    <Box sx={{ width: "100%", maxWidth: 520 }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            mb: 0.75,
          }}
        >
          <Typography
            variant="h6"
            sx={{
              fontWeight: 600,
              color: "primary.main",
              fontSize: "0.9375rem",
            }}
          >
            Profile
          </Typography>
          <Box sx={{ display: "flex", gap: 0.5 }}>
            <Tooltip title="Hide section">
              <IconButton size="small">
                <VisibilityOffIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete section">
              <IconButton size="small">
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Edit section">
              <IconButton size="small">
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
        <Typography
          variant="body2"
          sx={{
            mb: 1,
            color: "grey.600",
            lineHeight: 1.5,
            fontSize: "0.8125rem",
          }}
        >
          Experienced hotel worker managing the front desk. I am a motivated
          person who likes solving problems. Looking for the next opportunity to
          grow in hospitality.
        </Typography>
        <Box
          sx={{
            border: "1px solid",
            borderColor: "warning.main",
            borderRadius: 1.5,
            overflow: "hidden",
            bgcolor: "background.paper",
          }}
        >
          <Alert
            severity="warning"
            icon={<WarningAmberIcon />}
            action={
              <Box sx={{ display: "flex", gap: 0.25, alignItems: "center" }}>
                <Tooltip title="Generate new coaching suggestions">
                  <IconButton
                    size="small"
                    sx={{ color: "text.secondary", p: 0.25 }}
                  >
                    <ReplayIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Apply coaching improvements">
                  <IconButton
                    size="small"
                    sx={{ color: "success.main", p: 0.25 }}
                  >
                    <CheckIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Dismiss coaching">
                  <IconButton
                    size="small"
                    sx={{ color: "error.main", p: 0.25 }}
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            }
            sx={{
              borderRadius: 0,
              py: 0.5,
              px: 1.25,
              alignItems: "center",
              bgcolor: "grey.100",
              color: "grey.800",
              "& .MuiAlert-message": { flex: 1, fontSize: "0.8125rem" },
            }}
          >
            Contains grammar/spelling errors; reduces clarity and professionalism
          </Alert>
          <Box sx={{ px: 1.25, py: 1, pt: 0.75 }}>
            <Typography
              variant="body2"
              sx={{ lineHeight: 1.5, fontSize: "0.8125rem" }}
            >
              <Box component="span" sx={DEMO_DEL_STYLE}>
                Experienced hotel worker
              </Box>{" "}
              <Box component="span" sx={DEMO_INS_STYLE}>
                Experienced hotel professional
              </Box>{" "}
              managing the front desk. I am a motivated person who likes solving
              problems. Always{" "}
              <Box component="span" sx={DEMO_DEL_STYLE}>
                looking for
              </Box>{" "}
              <Box component="span" sx={DEMO_INS_STYLE}>
                seeking
              </Box>{" "}
              the next opportunity to grow in hospitality.
            </Typography>
          </Box>
        </Box>
    </Box>
  );
};

export default CoachingDiffMock;
export { CoachingDiffMock };
