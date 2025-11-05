import React, { useState, useMemo } from "react";
import { Autocomplete, TextField } from "@mui/material";

// Common fields of study/majors
const COMMON_FIELDS_OF_STUDY = [
  // Science & Technology
  "Computer Science",
  "Software Engineering",
  "Computer Engineering",
  "Information Technology",
  "Data Science",
  "Cybersecurity",
  "Artificial Intelligence",
  "Machine Learning",
  "Information Systems",
  "Network Engineering",
  "Web Development",
  "Mobile Development",
  "Database Administration",
  "Cloud Computing",
  "DevOps Engineering",
  "Electronics Engineering",
  "Electrical Engineering",
  "Mechanical Engineering",
  "Civil Engineering",
  "Chemical Engineering",
  "Aerospace Engineering",
  "Biomedical Engineering",
  "Materials Engineering",
  "Industrial Engineering",
  "Environmental Engineering",
  "Mathematics",
  "Physics",
  "Chemistry",
  "Biology",
  "Biotechnology",
  "Biochemistry",
  "Biomedical Sciences",
  "Microbiology",
  "Genetics",
  "Zoology",
  "Botany",
  "Ecology",
  "Environmental Science",
  "Geology",
  "Astronomy",
  "Astrophysics",
  "Earth Sciences",
  "Marine Science",
  "Neuroscience",
  "Cognitive Science",

  // Business & Economics
  "Business Administration",
  "Business Management",
  "Entrepreneurship",
  "Finance",
  "Accounting",
  "Economics",
  "Marketing",
  "Sales",
  "Real Estate",
  "Supply Chain Management",
  "Logistics",
  "Operations Management",
  "Project Management",
  "International Business",
  "Hospitality Management",
  "Tourism Management",
  "Event Management",

  // Social Sciences
  "Psychology",
  "Sociology",
  "Anthropology",
  "Political Science",
  "Public Policy",
  "Public Administration",
  "International Relations",
  "Journalism",
  "Communication Studies",
  "Mass Communication",
  "Public Relations",
  "Advertising",
  "Media Studies",
  "Social Work",
  "Criminology",
  "Criminal Justice",

  // Arts & Humanities
  "English Literature",
  "English Language",
  "Creative Writing",
  "History",
  "Philosophy",
  "Religion",
  "Theology",
  "Art History",
  "Music",
  "Music Theory",
  "Music Production",
  "Theater Arts",
  "Performing Arts",
  "Dance",
  "Film Studies",
  "Cinematography",
  "Visual Arts",
  "Fine Arts",
  "Graphic Design",
  "Digital Media",
  "Animation",
  "Game Design",
  "Fashion Design",
  "Interior Design",
  "Linguistics",
  "Modern Languages",
  "Translation Studies",

  // Education
  "Education",
  "Elementary Education",
  "Secondary Education",
  "Special Education",
  "Early Childhood Education",
  "Curriculum Development",
  "Educational Leadership",
  "Educational Technology",

  // Health Sciences
  "Medicine",
  "Nursing",
  "Pharmacy",
  "Public Health",
  "Health Sciences",
  "Health Administration",
  "Veterinary Medicine",
  "Dentistry",
  "Physical Therapy",
  "Occupational Therapy",
  "Sports Medicine",
  "Nutrition Science",
  "Kinesiology",
  "Exercise Science",

  // Other Professional
  "Law",
  "Legal Studies",
  "Architecture",
  "Urban Planning",
  "Landscape Architecture",
  "Agriculture",
  "Agricultural Science",
  "Food Science",
  "Aviation",
  "Pilot Studies",
  "Military Science",
  "Sports Management",
  "Recreation Management",
];

interface FieldOfStudyAutocompleteProps {
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
  sx?: any;
}

const FieldOfStudyAutocomplete: React.FC<FieldOfStudyAutocompleteProps> = ({
  value,
  onChange,
  onSave,
  onCancel,
  placeholder = "e.g., Computer Science",
  label = "Field of Study",
  fullWidth = true,
  disabled = false,
  error = false,
  helperText,
  sx,
}) => {
  const [inputValue, setInputValue] = useState(value);
  const [isOpen, setIsOpen] = useState(false);

  // Filter fields based on input
  const filteredFields = useMemo(() => {
    if (!inputValue || inputValue.length < 1) return [];

    const searchTerm = inputValue.toLowerCase().trim();

    // Filter with multiple criteria for better matching
    const filtered = COMMON_FIELDS_OF_STUDY.filter((field) => {
      const fieldLower = field.toLowerCase();

      // Starts with search term (high priority)
      if (fieldLower.startsWith(searchTerm)) return true;

      // Contains search term (medium priority)
      if (fieldLower.includes(searchTerm)) return true;

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

  const handleChange = (_event: any, newValue: string | null) => {
    const selectedValue = newValue || "";
    setInputValue(selectedValue);
    onChange(selectedValue);
    setIsOpen(false); // Hide dropdown when selection is made
  };

  const handleInputChange = (_event: any, newInputValue: string) => {
    setInputValue(newInputValue);
    onChange(newInputValue); // Update parent immediately for better UX

    // Check if the input exactly matches an option
    const exactMatch = COMMON_FIELDS_OF_STUDY.find(
      (field) => field.toLowerCase() === newInputValue.toLowerCase().trim(),
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
      const exactMatch = COMMON_FIELDS_OF_STUDY.find(
        (field) => field.toLowerCase() === inputValue.toLowerCase().trim(),
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
      options={filteredFields}
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
      noOptionsText="Type to search fields of study..."
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

export default FieldOfStudyAutocomplete;
