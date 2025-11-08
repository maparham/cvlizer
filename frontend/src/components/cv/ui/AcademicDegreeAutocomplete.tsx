import React, { useState, useMemo } from "react";
import { Autocomplete, TextField, SxProps, Theme } from "@mui/material";

// Academic titles/degrees
const ACADEMIC_TITLES = [
  // English
  "Dr.",
  "Prof.",
  "Prof. Dr.",
  "Ph.D.",
  "M.D.",
  "MBA",
  "MSc",
  "MA",
  "B.A.",
  "B.Sc.",
  // German
  "Dr. med.",
  "Dr. phil.",
  "Dr. rer. nat.",
  "Dipl.-Ing.",
  "Mag.",
  // Austrian
  "Dr.techn.",
  "Dr.phil.",
  "Dr.rer.nat.",
  "Dr.iur.",
  "Dr.med.univ.",
  "Mag.rer.nat.",
];

interface AcademicDegreeAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSave?: () => void;
  onCancel?: () => void;
  placeholder?: string;
  label?: string;
  fullWidth?: boolean;
  disabled?: boolean;
  error?: boolean;
  helperText?: string;
  sx?: SxProps<Theme>;
}

const AcademicDegreeAutocomplete: React.FC<AcademicDegreeAutocompleteProps> = ({
  value,
  onChange,
  onSave,
  onCancel,
  placeholder = "e.g., Dr., Prof.",
  label = "Academic Degree",
  fullWidth = true,
  disabled = false,
  error = false,
  helperText,
  sx,
}) => {
  const [inputValue, setInputValue] = useState(value);
  const [isOpen, setIsOpen] = useState(false);

  // Filter titles based on input
  const filteredTitles = useMemo(() => {
    if (!inputValue || inputValue.length < 1) return [];

    const searchTerm = inputValue.toLowerCase().trim();

    // Filter with multiple criteria for better matching
    const filtered = ACADEMIC_TITLES.filter((title) => {
      const titleLower = title.toLowerCase();

      // Starts with search term (high priority)
      if (titleLower.startsWith(searchTerm)) return true;

      // Contains search term (medium priority)
      if (titleLower.includes(searchTerm)) return true;

      return false;
    });

    // Sort results by relevance
    const sorted = filtered.sort((a, b) => {
      const aLower = a.toLowerCase();
      const bLower = b.toLowerCase();

      // Exact matches first
      if (aLower === searchTerm && bLower !== searchTerm) return -1;
      if (bLower === searchTerm && aLower !== searchTerm) return 1;

      // Then starts with
      if (aLower.startsWith(searchTerm) && !bLower.startsWith(searchTerm))
        return -1;
      if (bLower.startsWith(searchTerm) && !aLower.startsWith(searchTerm))
        return 1;

      return 0;
    });

    return sorted.slice(0, 10); // Limit to 10 suggestions
  }, [inputValue]);

  const handleChange = (_event: React.SyntheticEvent<Element, Event>, newValue: string | null) => {
    const selectedValue = newValue || "";
    setInputValue(selectedValue);
    onChange(selectedValue);
    setIsOpen(false); // Hide dropdown when selection is made
  };

  const handleInputChange = (_event: React.SyntheticEvent<Element, Event>, newInputValue: string) => {
    setInputValue(newInputValue);
    onChange(newInputValue); // Update parent immediately for better UX

    // Check if the input exactly matches an option
    const exactMatch = ACADEMIC_TITLES.find(
      (title) => title.toLowerCase() === newInputValue.toLowerCase().trim(),
    );

    if (exactMatch) {
      setIsOpen(false); // Hide dropdown if exact match
    } else {
      setIsOpen(newInputValue.length > 0); // Show dropdown when typing
    }
  };

  const handleFocus = () => {
    // Only show dropdown if there's text AND it's not an exact match
    if (inputValue.length > 0) {
      const exactMatch = ACADEMIC_TITLES.find(
        (title) => title.toLowerCase() === inputValue.toLowerCase().trim(),
      );
      setIsOpen(!exactMatch); // Hide dropdown if exact match
    } else {
      setIsOpen(false);
    }
  };

  const handleBlur = () => {
    // Delay to allow selection from dropdown
    setTimeout(() => {
      setIsOpen(false);
    }, 150);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Enter") {
      event.preventDefault();
      setIsOpen(false);
      if (onSave) {
        onSave();
      }
    } else if (event.key === "Escape") {
      event.preventDefault();
      setIsOpen(false);
      if (onCancel) {
        onCancel();
      }
    }
  };

  return (
    <Autocomplete
      value={value}
      onChange={handleChange}
      inputValue={inputValue}
      onInputChange={handleInputChange}
      options={filteredTitles}
      freeSolo
      handleHomeEndKeys
      open={isOpen}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          placeholder={placeholder}
          fullWidth={fullWidth}
          disabled={disabled}
          error={error}
          helperText={helperText}
          variant="standard"
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          sx={{
            ...sx,
          }}
        />
      )}
      renderOption={(props, option, { index }) => (
        <li {...props} key={`${option}-${index}`}>
          {option}
        </li>
      )}
      noOptionsText="Type to search academic titles..."
      sx={{
        "& .MuiAutocomplete-inputRoot": {
          paddingTop: 0,
          paddingBottom: 0,
        },
        ...sx,
      }}
    />
  );
};

export default AcademicDegreeAutocomplete;
