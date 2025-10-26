/**
 * JobLibrary Search Component
 *
 * Displays search field and sort dropdown in a paper component.
 *
 * Key responsibilities:
 * - Search job descriptions by title, company, location, or content
 * - Sort job descriptions by recent, company, or title
 *
 * Usage:
 * - Used to filter and sort job descriptions
 * - Requires searchQuery, sortBy, and their change handlers
 */

import React from "react";
import {
  Container,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  Paper,
  Stack,
} from "@mui/material";
import { Search as SearchIcon } from "@mui/icons-material";

interface JobLibrarySearchProps {
  searchQuery: string;
  sortBy: string;
  onSearchChange: (value: string) => void;
  onSortChange: (value: string) => void;
}

export const JobLibrarySearch: React.FC<JobLibrarySearchProps> = ({
  searchQuery,
  sortBy,
  onSearchChange,
  onSortChange,
}) => {
  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Paper
        sx={{
          p: 3,
          borderRadius: 3,
          border: "1px solid",
          borderColor: "divider",
          boxShadow: 1,
          "&:hover": {
            boxShadow: 2,
          },
          transition: "box-shadow 0.2s ease-in-out",
        }}
      >
        <Stack direction="row" spacing={3} alignItems="flex-start" flexWrap="wrap">
          <TextField
            placeholder="Search by title, company, or location..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            sx={{
              minWidth: 300,
              flex: 1,
              "& .MuiOutlinedInput-root": {
                borderRadius: 2,
                "&:hover .MuiOutlinedInput-notchedOutline": {
                  borderColor: "primary.light",
                },
              },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: "text.secondary" }} />
                </InputAdornment>
              ),
            }}
          />
          <FormControl sx={{ minWidth: 180 }}>
            <InputLabel>Sort By</InputLabel>
            <Select
              value={sortBy}
              label="Sort By"
              onChange={(e) => onSortChange(e.target.value)}
              sx={{
                borderRadius: 2,
                "&:hover .MuiOutlinedInput-notchedOutline": {
                  borderColor: "primary.light",
                },
              }}
            >
              <MenuItem value="recent">Most Recent</MenuItem>
              <MenuItem value="company">Company</MenuItem>
              <MenuItem value="title">Job Title</MenuItem>
            </Select>
          </FormControl>
        </Stack>
      </Paper>
    </Container>
  );
};
