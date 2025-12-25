/**
 * Editing Indicator Component
 *
 * Displays a sticky indicator at the top of the scrollable area showing
 * which section is currently being edited. Provides a quick way to see
 * the active edit mode and cancel it, even when scrolled away from the section.
 */
import React, { useCallback } from "react";
import { Box, Chip, Tooltip, Typography } from "@mui/material";
import { Edit as EditIcon } from "@mui/icons-material";
import { EditingIndividualItem } from "../../../types";

interface EditingIndicatorProps {
  editingSection: string | null;
  editingIndividualItem: EditingIndividualItem | null;
  sectionTitle: string | null;
  onCancel?: () => void;
}

const EditingIndicator: React.FC<EditingIndicatorProps> = ({
  editingSection,
  editingIndividualItem,
  sectionTitle,
}) => {
  // Don't render if nothing is being edited
  if (!editingSection && !editingIndividualItem) {
    return null;
  }

  // Determine what to display
  const isItemEditing = editingIndividualItem !== null;
  const displayTitle = sectionTitle || "Section";

  // Build the display text
  let displayText = `Editing ${displayTitle}`;
  if (isItemEditing && editingIndividualItem?.id) {
    // Extract item index from id (format: "sectionId-itemIndex")
    const parts = editingIndividualItem.id.split("-");
    const itemIndexStr = parts[parts.length - 1];
    const itemIndex = parseInt(itemIndexStr, 10);
    if (!isNaN(itemIndex)) {
      displayText = `Editing ${displayTitle} - Item #${itemIndex + 1}`;
    }
  }

  // Handle scrolling to the editing section or item
  const handleScrollToSection = useCallback(() => {
    // Determine the section ID
    const sectionId = editingSection || editingIndividualItem?.sectionId;

    if (!sectionId) {
      return;
    }

    // Find the section element
    const sectionElement = document.querySelector(
      `[data-section="${sectionId}"]`,
    ) as HTMLElement;

    if (!sectionElement) {
      return;
    }

    // If editing an individual item, scroll to that specific item
    if (editingIndividualItem?.id) {
      // Extract item index from id (format: "sectionId-itemIndex")
      const parts = editingIndividualItem.id.split("-");
      const itemIndexStr = parts[parts.length - 1];
      const itemIndex = parseInt(itemIndexStr, 10);

      if (!isNaN(itemIndex)) {
        // Find all individual item containers in the section
        const items = sectionElement.querySelectorAll(
          ".individual-item-container",
        );

        if (items[itemIndex]) {
          // Scroll to the specific item
          items[itemIndex].scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
          return;
        }
      }
    }

    // Fallback: scroll to the section element
    sectionElement.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, [editingSection, editingIndividualItem]);

  return (
    <Box
      sx={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        bgcolor: "white",
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        borderBottom: "1px solid #e0e0e0",
        mb: 2,
        maxWidth: "210mm",
        margin: "0 auto",
        mx: "auto",
        px: 2,
        py: 1.5,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 2,
      }}
    >
      <Tooltip title="Click to scroll to editing section">
        <Box
          onClick={handleScrollToSection}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            cursor: "pointer",
            "&:hover": {
              opacity: 0.8,
            },
            transition: "opacity 0.2s ease",
            flex: 1,
          }}
        >
          <EditIcon sx={{ color: "primary.main", fontSize: "1.2rem" }} />
          <Chip
            label={displayText}
            color="primary"
            variant="outlined"
            size="small"
            sx={{
              fontWeight: 500,
              "& .MuiChip-label": {
                px: 1.5,
              },
            }}
          />
          <Typography
            variant="caption"
            sx={{
              color: "text.secondary",
              fontSize: "0.75rem",
              ml: "auto",
              fontWeight: 400,
            }}
          >
            Click to jump to editing section
          </Typography>
        </Box>
      </Tooltip>
    </Box>
  );
};

export default EditingIndicator;
