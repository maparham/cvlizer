/**
 * CV Completeness Indicator Component
 *
 * This component displays a visual indicator of CV completeness,
 * showing users how ready their CV is for AI features.
 *
 * Key responsibilities:
 * - Display completeness score with progress bar
 * - Show color-coded status (red/yellow/green)
 * - List missing items that need to be added
 * - Provide clear guidance on next steps
 *
 * Usage:
 * - Pass CVCompletenessResult from calculateCVCompleteness
 * - Component automatically renders appropriate UI
 * - Colors: red (<50), yellow (50-99), green (100)
 */

import React from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import LinearProgress from "@mui/material/LinearProgress";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Typography from "@mui/material/Typography";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import WarningIcon from "@mui/icons-material/Warning";
import ErrorIcon from "@mui/icons-material/Error";
import { CVCompletenessResult } from "../../utils/cvCompleteness";

interface CVCompletenessIndicatorProps {
  completeness: CVCompletenessResult;
  variant?: "compact" | "detailed";
}

const CVCompletenessIndicator: React.FC<CVCompletenessIndicatorProps> = ({
  completeness,
  variant = "detailed",
}) => {
  const { score, isComplete, missing } = completeness;

  // Determine color based on score
  const getColor = (): "error" | "warning" | "success" => {
    if (score >= 100) return "success";
    if (score >= 50) return "warning";
    return "error";
  };

  const color = getColor();

  // Get appropriate icon
  const getIcon = () => {
    switch (color) {
      case "success":
        return <CheckCircleIcon color="success" />;
      case "warning":
        return <WarningIcon color="warning" />;
      case "error":
        return <ErrorIcon color="error" />;
    }
  };

  // Get status text
  const getStatusText = () => {
    if (isComplete) return "CV Ready for AI Features";
    if (score >= 50) return "CV Needs More Content";
    return "CV Insufficient for AI Features";
  };

  // Compact variant - just shows score and status
  if (variant === "compact") {
    return (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        {getIcon()}
        <Box sx={{ flexGrow: 1, minWidth: 100 }}>
          <Typography variant="caption" color="text.secondary">
            {getStatusText()}
          </Typography>
          <LinearProgress
            variant="determinate"
            value={score}
            color={color}
            sx={{ height: 6, borderRadius: 3 }}
          />
        </Box>
        <Chip
          label={`${score}%`}
          size="small"
          color={color}
          variant="outlined"
        />
      </Box>
    );
  }

  // Detailed variant - shows full breakdown
  return (
    <Alert
      severity={color}
      icon={getIcon()}
      sx={{
        "& .MuiAlert-message": {
          width: "100%",
        },
      }}
    >
      <Box>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 1,
          }}
        >
          <Typography variant="subtitle2" fontWeight="600">
            {getStatusText()}
          </Typography>
          <Chip label={`${score}%`} size="small" color={color} />
        </Box>

        <LinearProgress
          variant="determinate"
          value={score}
          color={color}
          sx={{ height: 8, borderRadius: 4, mb: 2 }}
        />

        {!isComplete && missing.length > 0 && (
          <Box>
            <Typography variant="body2" fontWeight="500" gutterBottom>
              To enable AI features, please add:
            </Typography>
            <List dense disablePadding>
              {missing.map((item, index) => (
                <ListItem key={index} disablePadding sx={{ py: 0.25 }}>
                  <ListItemIcon sx={{ minWidth: 28 }}>
                    <WarningIcon
                      fontSize="small"
                      sx={{ fontSize: 16, color: "warning.main" }}
                    />
                  </ListItemIcon>
                  <ListItemText
                    primary={item}
                    primaryTypographyProps={{
                      variant: "body2",
                      fontSize: "0.875rem",
                    }}
                  />
                </ListItem>
              ))}
            </List>
          </Box>
        )}

        {isComplete && (
          <Typography variant="body2" sx={{ mt: 1 }}>
            Your CV has sufficient content for AI-powered job fit analysis and
            optimization features.
          </Typography>
        )}
      </Box>
    </Alert>
  );
};

export default CVCompletenessIndicator;
