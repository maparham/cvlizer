/**
 * CV Editor Mobile Bar
 *
 * Renders the mobile-only toggle bar to switch between the sidebar (Sections & AI Tools)
 * and the CV content view. Used inside PDFCVEditor when viewport is below md breakpoint.
 */
import React from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import ViewCVIcon from "@mui/icons-material/Visibility";
import SectionsIcon from "@mui/icons-material/Edit";

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
