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
import CircularProgress from "@mui/material/CircularProgress";
import IconButton from "@mui/material/IconButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Tooltip from "@mui/material/Tooltip";
import MoreVert from "@mui/icons-material/MoreVert";
import Visibility from "@mui/icons-material/Visibility";
import Description from "@mui/icons-material/Description";
import Block from "@mui/icons-material/Block";
import CheckCircleOutline from "@mui/icons-material/CheckCircleOutline";
import TrendingUp from "@mui/icons-material/TrendingUp";
import Email from "@mui/icons-material/Email";
import ErrorOutline from "@mui/icons-material/ErrorOutline";
import DeleteForever from "@mui/icons-material/DeleteForever";
import RestartAlt from "@mui/icons-material/RestartAlt";
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
  onDeleteUser: (userId: string, userName: string) => void;
  onResetUsage: (userId: string, userName: string) => void;
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
  onDeleteUser,
  onResetUsage,
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
            onResetUsage(user.id, user.email);
            handleClose();
          }}
          sx={{ color: "warning.main" }}
        >
          <ListItemIcon>
            <RestartAlt fontSize="small" color="warning" />
          </ListItemIcon>
          <ListItemText>Reset AI Usage</ListItemText>
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

        <MenuItem
          onClick={() => {
            onDeleteUser(user.id, user.email);
            handleClose();
          }}
          sx={{ color: "error.main" }}
        >
          <ListItemIcon>
            <DeleteForever fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>Delete User</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
};

export default UserActionsMenu;
