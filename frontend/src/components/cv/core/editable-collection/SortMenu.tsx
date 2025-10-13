/**
 * SortMenu Component
 *
 * Provides sorting options for items in a section, including manual ordering
 * and date-based sorting (newest/oldest first).
 */
import { useState } from 'react'
import { Box, IconButton, Tooltip, MenuItem, Menu } from '@mui/material'
import { DragIndicator as DragIcon, Sort as SortIcon } from '@mui/icons-material'
import type { SortMenuProps } from './types'

function SortMenu<T>({
  sortOptions,
  sortField,
  sortDirection,
  onSort,
  onClearSort,
  itemsCount,
  editingItemIndex
}: SortMenuProps<T>) {
  const [sortMenuAnchor, setSortMenuAnchor] = useState<null | HTMLElement>(null)

  // Only show if there are sort options and multiple items
  if (sortOptions.length === 0 || itemsCount <= 1 || editingItemIndex !== null) {
    return null
  }

  return (
    <>
      <Tooltip title={
        sortField
          ? `Sorted by ${sortOptions.find(opt => opt.field === sortField)?.label} (${sortDirection === 'desc' ? 'newest first' : 'oldest first'}). Click for options.`
          : "Sort options"
      }>
        <IconButton
          onClick={(e) => setSortMenuAnchor(e.currentTarget)}
          sx={{
            bgcolor: sortField ? '#e3f2fd' : 'white',
            boxShadow: 1,
            transition: 'all 0.2s ease',
            color: sortField ? '#1976d2' : 'inherit',
            '&:hover': {
              transform: 'scale(1.05)',
              boxShadow: 2,
              bgcolor: sortField ? '#bbdefb' : '#f5f5f5'
            }
          }}
          size="small"
        >
          <SortIcon
            fontSize="small"
            sx={{
              transform: sortField && sortDirection === 'asc' ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease'
            }}
          />
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={sortMenuAnchor}
        open={Boolean(sortMenuAnchor)}
        onClose={() => setSortMenuAnchor(null)}
        PaperProps={{
          sx: { mt: 1, minWidth: 200 }
        }}
      >
        <MenuItem
          onClick={() => {
            onClearSort()
            setSortMenuAnchor(null)
          }}
          selected={!sortField}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <DragIcon fontSize="small" />
            Manual order
          </Box>
        </MenuItem>

        {sortOptions.map((option) => (
          <Box key={String(option.field)}>
            <MenuItem
              onClick={() => {
                onSort(option.field, 'desc')
                setSortMenuAnchor(null)
              }}
              selected={sortField === option.field && sortDirection === 'desc'}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <SortIcon fontSize="small" sx={{ transform: 'rotate(180deg)' }} />
                {option.label} (Newest first)
              </Box>
            </MenuItem>
            <MenuItem
              onClick={() => {
                onSort(option.field, 'asc')
                setSortMenuAnchor(null)
              }}
              selected={sortField === option.field && sortDirection === 'asc'}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <SortIcon fontSize="small" />
                {option.label} (Oldest first)
              </Box>
            </MenuItem>
          </Box>
        ))}
      </Menu>
    </>
  )
}

export default SortMenu
