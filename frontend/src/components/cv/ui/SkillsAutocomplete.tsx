import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  TextField,
  Chip,
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  InputAdornment,
  IconButton,
  Tooltip,
} from "@mui/material";
import {
  Search as SearchIcon,
  Add as AddIcon,
  Close as CloseIcon,
} from "@mui/icons-material";
import {
  TECHNICAL_SKILLS,
  SOFT_SKILLS,
  searchSkills,
} from "../constants/skills";

interface SkillsAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onAdd: () => void;
  onAddDirect?: (skill: string) => void;
  placeholder: string;
  skillType: "technical" | "soft";
  existingSkills?: string[];
  disabled?: boolean;
}

const SkillsAutocomplete: React.FC<SkillsAutocompleteProps> = ({
  value,
  onChange,
  onAdd,
  onAddDirect,
  placeholder,
  skillType,
  existingSkills = [],
  disabled = false,
}) => {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showCategories, setShowCategories] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const skillsList = useMemo(
    () => (skillType === "technical" ? TECHNICAL_SKILLS : SOFT_SKILLS),
    [skillType],
  );

  const existingSkillsSet = useMemo(
    () => new Set(existingSkills),
    [existingSkills],
  );

  useEffect(() => {
    if (inputValue.trim()) {
      const filteredSkills = searchSkills(inputValue, skillsList, 15).filter(
        (skill) => !existingSkillsSet.has(skill),
      );
      setSuggestions(filteredSkills);
      setShowCategories(false);
    } else {
      setSuggestions([]);
      setShowCategories(true);
    }
  }, [inputValue, skillsList, existingSkillsSet]); // Now safe to include dependencies

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value;
    setInputValue(newValue);
    onChange(newValue);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion);
    onChange(suggestion);
    setOpen(false);
  };

  const handleDirectSkillAdd = (skill: string) => {
    if (!existingSkillsSet.has(skill)) {
      onAddDirect?.(skill);
      clearInput();
    }
    setOpen(false);
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === "Enter") {
      event.preventDefault();
      if (inputValue.trim() && !existingSkillsSet.has(inputValue.trim())) {
        onAdd();
      }
    }
  };

  const handleAddClick = () => {
    if (inputValue.trim() && !existingSkillsSet.has(inputValue.trim())) {
      onAdd();
    }
  };

  const clearInput = () => {
    setInputValue("");
    onChange("");
    inputRef.current?.focus();
  };

  const renderSuggestions = () => {
    if (!open && !showCategories) return null;

    return (
      <Paper
        sx={{
          maxHeight: 300,
          overflow: "auto",
          mt: 1,
          boxShadow: 2,
          border: "1px solid #e0e0e0",
        }}
      >
        {showCategories && inputValue === "" ? (
          <Box sx={{ p: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: "bold" }}>
              Popular {skillType === "technical" ? "Technical" : "Soft"} Skills
            </Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
              {skillsList
                .filter((skill) => !existingSkillsSet.has(skill))
                .slice(0, 20)
                .map((skill) => (
                  <Chip
                    key={skill}
                    label={skill}
                    size="small"
                    clickable
                    onClick={() => handleDirectSkillAdd(skill)}
                    sx={{
                      mb: 0.5,
                      bgcolor:
                        skillType === "technical" ? "#e3f2fd" : "#f3e5f5",
                      color: skillType === "technical" ? "#1976d2" : "#7b1fa2",
                      "&:hover": {
                        bgcolor:
                          skillType === "technical" ? "#bbdefb" : "#e1bee7",
                      },
                    }}
                  />
                ))}
            </Box>
          </Box>
        ) : (
          <List dense>
            {suggestions.length > 0 ? (
              suggestions.map((suggestion, index) => (
                <ListItem key={index} disablePadding>
                  <ListItemButton
                    onClick={() => handleSuggestionClick(suggestion)}
                    sx={{
                      "&:hover": {
                        bgcolor:
                          skillType === "technical" ? "#e3f2fd" : "#f3e5f5",
                      },
                    }}
                  >
                    <ListItemText
                      primary={suggestion}
                      sx={{
                        "& .MuiListItemText-primary": {
                          fontSize: "0.875rem",
                        },
                      }}
                    />
                  </ListItemButton>
                </ListItem>
              ))
            ) : inputValue.trim() ? (
              <ListItem>
                <ListItemText
                  primary={`No ${skillType} skills found matching "${inputValue}"`}
                  sx={{
                    "& .MuiListItemText-primary": {
                      fontSize: "0.875rem",
                      color: "text.secondary",
                      fontStyle: "italic",
                    },
                  }}
                />
              </ListItem>
            ) : null}
          </List>
        )}
      </Paper>
    );
  };

  return (
    <Box>
      <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
        <Box sx={{ flex: 1, position: "relative" }}>
          <TextField
            ref={inputRef}
            size="small"
            fullWidth
            placeholder={placeholder}
            value={inputValue}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            onFocus={() => setOpen(true)}
            onBlur={() => {
              // Delay closing to allow clicks on suggestions
              setTimeout(() => setOpen(false), 200);
            }}
            disabled={disabled}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" color="action" />
                </InputAdornment>
              ),
              endAdornment: inputValue && (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    onClick={clearInput}
                    edge="end"
                    sx={{ p: 0.5 }}
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{
              "& .MuiOutlinedInput-root": {
                backgroundColor: "background.paper",
              },
            }}
          />
          {renderSuggestions()}
        </Box>

        <Tooltip title={`Add ${skillType} skill`}>
          <span>
            <IconButton
              size="small"
              onClick={handleAddClick}
              disabled={
                disabled ||
                !inputValue.trim() ||
                existingSkillsSet.has(inputValue.trim())
              }
              sx={{
                bgcolor: skillType === "technical" ? "#1976d2" : "#7b1fa2",
                color: "white",
                "&:hover": {
                  bgcolor: skillType === "technical" ? "#1565c0" : "#6a1b9a",
                },
                "&:disabled": {
                  bgcolor: "action.disabledBackground",
                  color: "action.disabled",
                },
              }}
            >
              <AddIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      </Box>

      {inputValue.trim() && existingSkillsSet.has(inputValue.trim()) && (
        <Typography
          variant="caption"
          color="error"
          sx={{ mt: 0.5, display: "block" }}
        >
          This skill is already added
        </Typography>
      )}
    </Box>
  );
};

export default SkillsAutocomplete;
