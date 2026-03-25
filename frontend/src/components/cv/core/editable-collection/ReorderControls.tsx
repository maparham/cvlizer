/**
 * ReorderControls Component
 *
 * Provides drag handle and up/down arrow controls for reordering items.
 */
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import ArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import ArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import DragIcon from "@mui/icons-material/DragIndicator";
import type { ReorderControlsProps } from "./types";

function ReorderControls({
  index,
  itemsLength,
  onMoveUp,
  onMoveDown,
  dragHandleProps,
}: ReorderControlsProps) {
  // Always render drag handle for drag-and-drop library, but hide controls when only one item
  const showControls = itemsLength > 1;

  return (
    <>
      {/* Up arrow - upper left corner */}
      {showControls && (
        <IconButton
          className="reorder-control"
          onClick={() => onMoveUp(index)}
          disabled={index === 0}
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            bgcolor: "white",
            boxShadow: 1,
            opacity: index === 0 ? 0.3 : "inherit",
            transition: "all 0.2s ease",
            zIndex: 2,
            "&:hover:not(:disabled)": {
              transform: "translateY(-1px)",
              boxShadow: 2,
            },
          }}
          size="small"
        >
          <ArrowUpIcon fontSize="small" />
        </IconButton>
      )}

      {/* Drag handle - middle left edge - always render for drag-and-drop library */}
      <Box
        {...dragHandleProps}
        className="reorder-control"
        sx={{
          position: "absolute",
          top: "50%",
          left: 0,
          transform: "translateY(-50%)",
          zIndex: 2,
          cursor: showControls ? "grab" : "default",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 32,
          height: 32,
          bgcolor: "white",
          boxShadow: 1,
          borderRadius: "50%",
          color: showControls ? "#666" : "#ccc",
          transition: "all 0.2s ease",
          opacity: showControls ? 1 : 0.3,
          pointerEvents: showControls ? "auto" : "none",
          "&:hover": showControls
            ? {
                transform: "translateY(-50%) scale(1.1)",
                boxShadow: 2,
                bgcolor: "#f5f5f5",
                color: "#333",
              }
            : {},
          "&:active": showControls
            ? {
                cursor: "grabbing",
                transform: "translateY(-50%) scale(0.95)",
              }
            : {},
        }}
        title={showControls ? "Drag to reorder" : ""}
      >
        <DragIcon fontSize="small" />
      </Box>

      {/* Down arrow - lower left corner */}
      {showControls && (
        <IconButton
          className="reorder-control"
          onClick={() => onMoveDown(index)}
          disabled={index === itemsLength - 1}
          sx={{
            position: "absolute",
            bottom: 0,
            left: 0,
            bgcolor: "white",
            boxShadow: 1,
            opacity: index === itemsLength - 1 ? 0.3 : "inherit",
            transition: "all 0.2s ease",
            zIndex: 2,
            "&:hover:not(:disabled)": {
              transform: "translateY(1px)",
              boxShadow: 2,
            },
          }}
          size="small"
        >
          <ArrowDownIcon fontSize="small" />
        </IconButton>
      )}
    </>
  );
}

export default ReorderControls;
