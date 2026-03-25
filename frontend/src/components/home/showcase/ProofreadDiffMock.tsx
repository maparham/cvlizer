/**
 * ProofreadDiffMock – Standalone mock for home showcase slide 2.
 * Shows a proofread-style diff (grammar/spelling) with Michael Peterson Profile content.
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
import InfoIcon from "@mui/icons-material/Info";
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

const ProofreadDiffMock: React.FC = () => {
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
          Experienced hotel worker managing the front desk enviroment. I am very
          motivated person who like solving problem and have strong
          communication skill. Looking for a new oppurtunity in hospitality.
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
            icon={<InfoIcon />}
            action={
              <Box sx={{ display: "flex", gap: 0.25, alignItems: "center" }}>
                <Tooltip title="Apply all corrections">
                  <IconButton
                    size="small"
                    sx={{ color: "success.main", p: 0.25 }}
                  >
                    <CheckIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Dismiss suggestions">
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
              "& .MuiAlert-message": { flex: 1, fontSize: "0.8125rem" },
            }}
          >
            Contains multiple grammar/spelling errors; reduces clarity
          </Alert>
          <Box sx={{ px: 1.25, py: 1, pt: 0.75 }}>
            <Typography
              variant="body2"
              sx={{ lineHeight: 1.5, fontSize: "0.8125rem" }}
            >
              Experienced hotel worker managing the front desk{" "}
              <Box component="span" sx={DEMO_DEL_STYLE}>
                enviroment
              </Box>{" "}
              <Box component="span" sx={DEMO_INS_STYLE}>
                environment
              </Box>
              . I am{" "}
              <Box component="span" sx={DEMO_INS_STYLE}>
                a
              </Box>{" "}
              very motivated person who{" "}
              <Box component="span" sx={DEMO_DEL_STYLE}>
                like
              </Box>{" "}
              <Box component="span" sx={DEMO_INS_STYLE}>
                likes
              </Box>{" "}
              solving{" "}
              <Box component="span" sx={DEMO_DEL_STYLE}>
                problem
              </Box>{" "}
              <Box component="span" sx={DEMO_INS_STYLE}>
                problems
              </Box>{" "}
              and have strong communication{" "}
              <Box component="span" sx={DEMO_DEL_STYLE}>
                skill
              </Box>{" "}
              <Box component="span" sx={DEMO_INS_STYLE}>
                skills
              </Box>
              . Looking for a new{" "}
              <Box component="span" sx={DEMO_DEL_STYLE}>
                oppurtunity
              </Box>{" "}
              <Box component="span" sx={DEMO_INS_STYLE}>
                opportunity
              </Box>{" "}
              in hospitality.
            </Typography>
          </Box>
        </Box>
    </Box>
  );
};

export default ProofreadDiffMock;
export { ProofreadDiffMock };
