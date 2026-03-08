/**
 * CV Editor Mobile Bar
 *
 * Renders the mobile-only toggle bar to switch between the sidebar (Sections & AI Tools)
 * and the CV content view. Used inside PDFCVEditor when viewport is below md breakpoint.
 */
import React from "react";
import { Box, Button } from "@mui/material";
import { Visibility as ViewCVIcon, Edit as SectionsIcon } from "@mui/icons-material";

export type MobilePanel = "sidebar" | "content";

interface CVEditorMobileBarProps {
  mobilePanel: MobilePanel;
  onToggle: () => void;
}

export const CVEditorMobileBar: React.FC<CVEditorMobileBarProps> = ({
  mobilePanel,
  onToggle,
}) => (
  <Box
    sx={{
      flexShrink: 0,
      px: 2,
      py: 1,
      borderBottom: 1,
      borderColor: "divider",
      bgcolor: "background.paper",
      display: "flex",
      justifyContent: "center",
    }}
  >
    <Button
      variant="outlined"
      size="small"
      startIcon={
        mobilePanel === "sidebar" ? (
          <ViewCVIcon />
        ) : (
          <SectionsIcon />
        )
      }
      onClick={onToggle}
      aria-label={
        mobilePanel === "sidebar"
          ? "Switch to CV view"
          : "Switch to Sections and AI Tools"
      }
      aria-expanded={mobilePanel === "content"}
    >
      {mobilePanel === "sidebar" ? "View CV" : "Sections & AI Tools"}
    </Button>
  </Box>
);

export default CVEditorMobileBar;
