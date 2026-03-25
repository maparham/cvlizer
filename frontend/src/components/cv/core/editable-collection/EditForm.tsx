/**
 * EditForm Component
 *
 * Renders the editing form for an item with save/cancel controls.
 */
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import SaveIcon from "@mui/icons-material/Save";
import CancelIcon from "@mui/icons-material/Cancel";
import type { EditFormProps } from "./types";

function EditForm<T>({
  editData,
  editingItemIndex,
  title,
  isFormValid,
  onSave,
  onCancel,
  renderItemForm,
  updateItem,
}: EditFormProps<T>) {
  return (
    <Box
      sx={{
        position: "relative",
        mb: 0.25,
        p: 1,
        border: "1px solid #e0e0e0",
        borderRadius: 1,
      }}
    >
      <Box sx={{ position: "relative" }}>
        <Box
          sx={{
            position: "absolute",
            top: -8,
            right: -8,
            display: "flex",
            gap: 0.5,
            zIndex: 1,
          }}
        >
          <Tooltip title="Save changes">
            <span>
              <IconButton
                onClick={onSave}
                disabled={!isFormValid}
                data-testid={`save-${title.toLowerCase().replace(/ /g, "-")}-button`}
                sx={{
                  bgcolor: "white",
                  boxShadow: 1,
                  "&:disabled": {
                    opacity: 0.5,
                  },
                }}
                size="small"
              >
                <SaveIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Cancel editing">
            <IconButton
              onClick={onCancel}
              data-testid={`cancel-${title.toLowerCase().replace(/ /g, "-")}-button`}
              sx={{
                bgcolor: "white",
                boxShadow: 1,
              }}
              size="small"
            >
              <CancelIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
        {renderItemForm(editData, editingItemIndex, updateItem, onSave)}
      </Box>
      <Box
        sx={{
          display: "flex",
          gap: 2,
          justifyContent: "flex-end",
          mt: 2,
          pt: 2,
          borderTop: "1px solid #e0e0e0",
        }}
      >
        <Button
          variant="outlined"
          onClick={onCancel}
          data-testid={`cancel-${title.toLowerCase().replace(/ /g, "-")}-button-bottom`}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={onSave}
          disabled={!isFormValid}
          data-testid={`save-${title.toLowerCase().replace(/ /g, "-")}-button-bottom`}
          startIcon={<SaveIcon />}
        >
          Save
        </Button>
      </Box>
    </Box>
  );
}

export default EditForm;
