/**
 * User Actions Context Menu Component
 *
 * This module provides a context menu for user management actions in the admin dashboard.
 * It consolidates multiple action buttons into a clean dropdown menu interface.
 *
 * Key responsibilities:
 * - Display user management actions in a context menu
 * - Handle action execution with loading states
 * - Provide tooltips and proper accessibility
 * - Support disabled states for actions
 *
 * Usage:
 * - Used in the admin dashboard Users table
 * - Provides actions like view details, view CVs, toggle active status, etc.
 * - Keeps impersonation as a separate button outside the menu
 */
import React, { useState } from "react";
import {
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Tooltip,
  CircularProgress,
} from "@mui/material";
import {
  MoreVert,
  Visibility,
  Description,
  Block,
  CheckCircleOutline,
  TrendingUp,
  Email,
  ErrorOutline,
} from "@mui/icons-material";
import { UserSummary } from "../../types/admin";

interface UserActionsMenuProps {
  user: UserSummary;
  actionLoading: string | null;
  onViewDetails: (userId: string) => void;
  onViewCVs: (userId: string) => void;
  onToggleActive: (userId: string, currentStatus: boolean) => void;
  onViewActivities: (userId: string) => void;
  onViewErrors: (userId: string) => void;
  onContactUser: (email: string) => void;
}

const UserActionsMenu: React.FC<UserActionsMenuProps> = ({
  user,
  actionLoading,
  onViewDetails,
  onViewCVs,
  onToggleActive,
  onViewActivities,
  onViewErrors,
  onContactUser,
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const isLoading = actionLoading === user.id;

  return (
    <>
      <Tooltip title="User Actions">
        <IconButton
          size="small"
          onClick={handleClick}
          disabled={isLoading}
          aria-label="User actions menu"
        >
          {isLoading ? <CircularProgress size={16} /> : <MoreVert />}
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
      >
        <MenuItem
          onClick={() => {
            onViewDetails(user.id);
            handleClose();
          }}
        >
          <ListItemIcon>
            <Visibility fontSize="small" />
          </ListItemIcon>
          <ListItemText>View Details</ListItemText>
        </MenuItem>

        <MenuItem
          onClick={() => {
            onViewCVs(user.id);
            handleClose();
          }}
        >
          <ListItemIcon>
            <Description fontSize="small" />
          </ListItemIcon>
          <ListItemText>View CVs</ListItemText>
        </MenuItem>

        <MenuItem
          onClick={() => {
            onToggleActive(user.id, user.is_active);
            handleClose();
          }}
        >
          <ListItemIcon>
            {user.is_active ? (
              <Block fontSize="small" color="error" />
            ) : (
              <CheckCircleOutline fontSize="small" color="success" />
            )}
          </ListItemIcon>
          <ListItemText>
            {user.is_active ? "Deactivate User" : "Activate User"}
          </ListItemText>
        </MenuItem>

        <MenuItem
          onClick={() => {
            onViewActivities(user.id);
            handleClose();
          }}
        >
          <ListItemIcon>
            <TrendingUp fontSize="small" />
          </ListItemIcon>
          <ListItemText>View Activities</ListItemText>
        </MenuItem>

        <MenuItem
          onClick={() => {
            onViewErrors(user.id);
            handleClose();
          }}
          sx={{ color: "error.main" }}
        >
          <ListItemIcon>
            <ErrorOutline fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>View Errors</ListItemText>
        </MenuItem>

        <MenuItem
          onClick={() => {
            onContactUser(user.email);
            handleClose();
          }}
        >
          <ListItemIcon>
            <Email fontSize="small" />
          </ListItemIcon>
          <ListItemText>Contact User</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
};

export default UserActionsMenu;
