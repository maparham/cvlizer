/**
 * Dashboard Header Component
 *
 * This module provides the main application header with brand logo, user menu,
 * and navigation controls for the Dashboard page.
 *
 * Key responsibilities:
 * - Display application brand logo
 * - Provide user account menu with profile, admin (conditional), and logout
 * - Handle menu open/close state
 * - Support navigation to profile and admin pages
 *
 * Usage:
 * - Used in Dashboard component as the top-level AppBar
 * - Provides consistent header across authenticated pages
 * - Includes conditional admin menu item based on user role
 */

import React from "react";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Toolbar from "@mui/material/Toolbar";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import { Link as RouterLink } from "react-router-dom";
import { UsageChip } from "../common";

interface DashboardHeaderProps {
  anchorEl: null | HTMLElement;
  onMenuOpen: (event: React.MouseEvent<HTMLElement>) => void;
  onMenuClose: () => void;
  onLogout: () => void;
  isAdmin: boolean;
  onNavigate: (path: string) => void;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  anchorEl,
  onMenuOpen,
  onMenuClose,
  onLogout,
  isAdmin,
  onNavigate,
}) => {
  return (
    <AppBar
      position="static"
      sx={{
        backgroundColor: "background.paper",
        color: "text.primary",
        boxShadow: 1,
        borderBottom: "1px solid",
        borderColor: "divider",
      }}
    >
      <Toolbar sx={{ minHeight: "64px !important", px: 3 }}>
        <RouterLink
          to="/"
          style={{
            textDecoration: "none",
            color: "inherit",
            flexGrow: 1,
            display: "flex",
            alignItems: "center",
          }}
        >
          <Box
            component="img"
            src="/logo.png"
            alt="RAHKAR"
            sx={{
              height: 40,
              width: "auto",
              display: "block",
            }}
          />
        </RouterLink>
        <UsageChip
          size="small"
          showLabel
          onClick={() => onNavigate("/profile#usage")}
          sx={{ mr: 2 }}
        />
        <IconButton
          size="large"
          edge="end"
          aria-label="account of current user"
          aria-controls="menu-appbar"
          aria-haspopup="true"
          onClick={onMenuOpen}
          sx={{
            color: "text.secondary",
            "&:hover": {
              backgroundColor: "action.hover",
              color: "text.primary",
            },
          }}
          data-testid="user-menu-button"
        >
          <AccountCircleIcon />
        </IconButton>
        <Menu
          id="menu-appbar"
          anchorEl={anchorEl}
          anchorOrigin={{
            vertical: "top",
            horizontal: "right",
          }}
          keepMounted
          transformOrigin={{
            vertical: "top",
            horizontal: "right",
          }}
          open={Boolean(anchorEl)}
          onClose={onMenuClose}
          data-testid="user-menu"
        >
          <MenuItem
            onClick={() => {
              onNavigate("/profile");
              onMenuClose();
            }}
            data-testid="profile-menu-item"
          >
            Profile
          </MenuItem>
          <MenuItem
            onClick={() => {
              onNavigate("/feedback");
              onMenuClose();
            }}
            data-testid="feedback-menu-item"
          >
            Feedback
          </MenuItem>
          {isAdmin && (
            <MenuItem
              onClick={() => {
                onNavigate("/admin");
                onMenuClose();
              }}
              data-testid="admin-menu-item"
            >
              Admin
            </MenuItem>
          )}
          <MenuItem onClick={onLogout} data-testid="logout-menu-item">
            Logout
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
};

export default DashboardHeader;
