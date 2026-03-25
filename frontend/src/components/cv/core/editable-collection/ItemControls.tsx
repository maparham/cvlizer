/**
 * ItemControls Component
 *
 * Renders the edit and delete controls for an individual item.
 */
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { getSingularTitle } from "./utils";
import type { ItemControlsProps } from "./types";

function ItemControls<T>({
  item,
  index,
  title,
  editingItemIndex,
  isAnotherItemBeingEdited,
  onEdit,
  onDelete,
  renderItemDisplay,
}: ItemControlsProps<T>) {
  return (
    <Box>
      {/* Action buttons - horizontally aligned in top right */}
      <Box
        sx={{
          position: "absolute",
          top: 0,
          right: 0,
          display: "flex",
          flexDirection: "row",
          gap: 0,
          zIndex: 1,
        }}
      >
        <Tooltip title={`Delete this ${getSingularTitle(title).toLowerCase()}`}>
          <IconButton
            onClick={() => onDelete(index)}
            className="item-action-button"
            data-testid={`delete-${title.toLowerCase().replace(/ /g, "-")}-item-${index}`}
            sx={{
              color: "text.secondary",
              bgcolor: "transparent",
              opacity: 0.3,
              transition: "all 0.2s ease",
              "&:hover": {
                color: "error.main",
                bgcolor: "rgba(255, 235, 238, 0.5)",
                opacity: 1,
              },
            }}
            size="small"
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip
          title={
            isAnotherItemBeingEdited
              ? "Finish editing the current item first"
              : `Edit this ${getSingularTitle(title).toLowerCase()}`
          }
        >
          <span>
            <IconButton
              onClick={() => onEdit(index)}
              disabled={isAnotherItemBeingEdited}
              className="item-action-button"
              data-testid={`edit-${title.toLowerCase().replace(/ /g, "-")}-item-${index}`}
              sx={{
                opacity: isAnotherItemBeingEdited ? 0.5 : 0.3,
                color: "text.secondary",
                bgcolor: "transparent",
                transition: "all 0.2s ease",
                "&:hover:not(:disabled)": {
                  color: "primary.main",
                  bgcolor: "rgba(227, 242, 253, 0.5)",
                  opacity: 1,
                },
              }}
              size="small"
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      </Box>

      <Box
        sx={{
          pl: editingItemIndex !== index ? 5 : 0,
        }}
      >
        {renderItemDisplay(item, index)}
      </Box>
    </Box>
  );
}

export default ItemControls;
