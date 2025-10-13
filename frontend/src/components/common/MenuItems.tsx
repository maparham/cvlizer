/**
 * Reusable MenuItems Component
 *
 * This module provides a reusable menu component that eliminates duplication
 * of menu rendering logic across different components. It handles both
 * context menus and regular dropdown menus with consistent styling and behavior.
 *
 * Key responsibilities:
 * - Render menu items with consistent styling
 * - Handle loading states and disabled states
 * - Support both context and dropdown menu variants
 * - Provide consistent hover effects and transitions
 *
 * Usage:
 * - Import MenuItems component for consistent menu rendering
 * - Use in CVQuickActions and other components with menu functionality
 * - Maintains compatibility with Material-UI Menu components
 */

import React from 'react'
import {
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  CircularProgress
} from '@mui/material'
import { commonStyles } from '../../styles/commonStyles'

export interface MenuItemData {
  label: string
  icon: React.ReactNode
  onClick: () => void
  disabled?: boolean
  loading?: boolean
  testId?: string
}

export interface MenuItemsProps {
  items: MenuItemData[]
  anchorEl: HTMLElement | null
  open: boolean
  onClose: () => void
  anchorOrigin?: {
    vertical: 'top' | 'center' | 'bottom'
    horizontal: 'left' | 'center' | 'right'
  }
  transformOrigin?: {
    vertical: 'top' | 'center' | 'bottom'
    horizontal: 'left' | 'center' | 'right'
  }
}

const MenuItems: React.FC<MenuItemsProps> = ({
  items,
  anchorEl,
  open,
  onClose,
  anchorOrigin = {
    vertical: 'bottom',
    horizontal: 'right',
  },
  transformOrigin = {
    vertical: 'top',
    horizontal: 'right',
  }
}) => {
  return (
    <Menu
      anchorEl={anchorEl}
      open={open}
      onClose={onClose}
      anchorOrigin={anchorOrigin}
      transformOrigin={transformOrigin}
      PaperProps={{
        sx: commonStyles.menu.standard
      }}
    >
      {items.map((item, index) => (
        <MenuItem
          key={index}
          onClick={item.onClick}
          disabled={item.disabled}
          data-testid={item.testId}
          sx={{}}
        >
          <ListItemIcon sx={{ color: 'inherit' }}>
            {item.loading ? (
              <CircularProgress size={16} />
            ) : (
              item.icon
            )}
          </ListItemIcon>
          <ListItemText>
            {item.loading ? `${item.label}...` : item.label}
          </ListItemText>
        </MenuItem>
      ))}
    </Menu>
  )
}

export default MenuItems
