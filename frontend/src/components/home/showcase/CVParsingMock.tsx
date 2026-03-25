/**
 * CVParsingMock – Standalone mock for home showcase slide 1.
 * Shows a CV card in "processing" state with animated progress.
 * No app logic; demo-only. Buttons are visual only, no handlers.
 */
import React from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardActions from "@mui/material/CardActions";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import LinearProgress from "@mui/material/LinearProgress";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import DownloadIcon from "@mui/icons-material/Download";
import ScheduleIcon from "@mui/icons-material/Schedule";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import FileCopyIcon from "@mui/icons-material/FileCopy";
import MoreVertIcon from "@mui/icons-material/MoreVert";

const CVParsingMock: React.FC = () => {
  return (
    <Card
        sx={{
          width: "100%",
          maxWidth: 380,
          display: "flex",
          flexDirection: "column",
          borderRadius: 3,
          border: "1px solid",
          borderColor: "divider",
          boxShadow: 2,
        }}
      >
        <CardContent sx={{ flexGrow: 1, pb: 1, p: 3 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              mb: 2,
            }}
          >
            <Typography
              variant="h6"
              sx={{
                fontWeight: 600,
                fontSize: "1rem",
                lineHeight: 1.2,
                color: "text.primary",
              }}
            >
              Michael_Peterson_20260316_standard.pdf
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
            <Chip
              label="PDF"
              size="small"
              color="success"
              variant="outlined"
              icon={<DownloadIcon />}
              sx={{ borderRadius: 1.5 }}
            />
          </Stack>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
            <ScheduleIcon fontSize="small" color="action" />
            <Typography variant="body2" color="text.secondary">
              Created 12.03.2026 15:26
            </Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Importing your CV...
          </Typography>
          <LinearProgress
            variant="indeterminate"
            sx={{
              borderRadius: 1,
              backgroundColor: "grey.200",
              "& .MuiLinearProgress-bar": {
                backgroundColor: "primary.main",
              },
            }}
          />
        </CardContent>
        <CardActions sx={{ p: 2, pt: 0 }}>
          <Stack
            direction="row"
            spacing={1}
            sx={{ width: "100%" }}
            alignItems="center"
          >
            <Button
              size="small"
              variant="contained"
              startIcon={<EditIcon />}
              disabled
              sx={{
                textTransform: "none",
                fontWeight: 600,
                flex: 1,
                borderRadius: 2,
                "&:disabled": {
                  backgroundColor: "action.disabled",
                  color: "action.disabledBackground",
                },
              }}
            >
              Processing...
            </Button>
            <Tooltip title="Copy CV">
              <IconButton size="small" sx={{ color: "text.secondary" }}>
                <FileCopyIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete CV">
              <IconButton
                size="small"
                sx={{
                  color: "error.main",
                  "&:hover": { backgroundColor: "error.light" },
                }}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="More options">
              <IconButton size="small" sx={{ color: "text.secondary" }}>
                <MoreVertIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        </CardActions>
    </Card>
  );
};

export default CVParsingMock;
export { CVParsingMock };
