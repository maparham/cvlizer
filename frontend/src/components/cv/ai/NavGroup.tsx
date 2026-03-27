/**
 * NavGroup - Unified collapsible navigation group for sidebar lists.
 *
 * Used for both job-fit suggestions and quality (proofread/coaching) suggestions.
 * Renders a header with expand/collapse and a list of clickable items with chips.
 */

import React from "react";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Collapse from "@mui/material/Collapse";
import Divider from "@mui/material/Divider";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";

export interface NavGroupItem {
  id: string;
  title: string;
}

const listItemButtonSx = {
  borderRadius: 1,
  mb: 0.5,
  "&:hover": { backgroundColor: "action.hover" },
};

const rowBoxSx = {
  display: "flex",
  alignItems: "center",
  gap: 1,
  flex: 1,
  minWidth: 0,
};

const listItemTextSx = {
  variant: "body2",
  sx: {
    fontWeight: 500,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
} as const;

/** Shared row: title + optional icon + chip. Used by NavGroup and CustomSectionNavItem. */
export function NavItem<T extends NavGroupItem>({
  item,
  chipLabel,
  onClick,
  icon,
}: {
  item: T;
  chipLabel: string;
  onClick: () => void;
  icon?: React.ReactNode;
}): React.ReactElement {
  return (
    <ListItem disablePadding>
      <ListItemButton onClick={onClick} sx={listItemButtonSx}>
        <Box sx={rowBoxSx}>
          {icon}
          <ListItemText
            primary={item.title}
            sx={{ flex: 1, minWidth: 0 }}
            primaryTypographyProps={listItemTextSx}
          />
          <Chip
            label={chipLabel}
            size="small"
            variant="outlined"
            sx={{ fontSize: "0.7rem", height: 20, flexShrink: 0 }}
          />
        </Box>
      </ListItemButton>
    </ListItem>
  );
}

/** Single nav item row (no collapsible group). Used for custom sections in quality suggestions. */
export function CustomSectionNavItem<T extends NavGroupItem>({
  item,
  icon,
  chipLabel,
  onItemClick,
}: {
  item: T;
  icon: React.ReactNode;
  chipLabel: string;
  onItemClick: (item: T) => void;
}): React.ReactElement {
  return (
    <NavItem
      item={item}
      chipLabel={chipLabel}
      onClick={() => onItemClick(item)}
      icon={icon}
    />
  );
}

/**
 * Generic T extends NavGroupItem allows type-safe onItemClick: (item: T) => void.
 * Callers pass SuggestionItem or QualityNavItem; callback receives the concrete type.
 */
interface NavGroupProps<T extends NavGroupItem> {
  title: string;
  items: T[];
  icon: React.ReactNode;
  chipLabel: string;
  expanded: boolean;
  onToggleExpanded: () => void;
  onItemClick: (item: T) => void;
  showDivider?: boolean;
}

export function NavGroup<T extends NavGroupItem>({
  title,
  items,
  icon,
  chipLabel,
  expanded,
  onToggleExpanded,
  onItemClick,
  showDivider = false,
}: NavGroupProps<T>): React.ReactElement | null {
  if (items.length === 0) return null;

  return (
    <>
      <ListItem disablePadding>
        <ListItemButton
          onClick={onToggleExpanded}
          sx={{
            borderRadius: 1,
            mb: 0.5,
            "&:hover": { backgroundColor: "action.hover" },
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, flex: 1 }}>
            {icon}
            <ListItemText
              primary={`${title} (${items.length})`}
              primaryTypographyProps={{ variant: "body2", sx: { fontWeight: 600 } }}
            />
            {expanded ? (
              <ExpandLessIcon fontSize="small" />
            ) : (
              <ExpandMoreIcon fontSize="small" />
            )}
          </Box>
        </ListItemButton>
      </ListItem>
      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <List disablePadding sx={{ pl: 2 }}>
          {items.map((item, index) => (
            <React.Fragment key={item.id}>
              <NavItem
                item={item}
                chipLabel={chipLabel}
                onClick={() => onItemClick(item)}
              />
              {index < items.length - 1 && <Divider sx={{ ml: 2 }} />}
            </React.Fragment>
          ))}
        </List>
      </Collapse>
      {showDivider && <Divider sx={{ my: 1 }} />}
    </>
  );
}
