import React, { useState, useMemo } from "react";
import { Autocomplete, TextField, Box } from "@mui/material";
import { FieldCorrection } from '../../../types/ai';
import { InlineFieldCorrection } from '../ai/InlineFieldCorrection';

// Common degree names
const COMMON_DEGREES = [
  // Bachelor's Degrees
  "Bachelor of Arts (BA)",
  "Bachelor of Science (BS)",
  "BS",
  "BSc",
  "Bachelor of Engineering (BEng)",
  "BEng",
  "Bachelor of Business Administration (BBA)",
  "BBA",
  "Bachelor of Computer Science (BCS)",
  "BCS",
  "Bachelor of Fine Arts (BFA)",
  "BFA",
  "Bachelor of Architecture (BArch)",
  "BArch",
  "Bachelor of Nursing (BN)",
  "BN",
  "Bachelor of Education (BEd)",
  "BEd",
  "Bachelor of Commerce (BCom)",
  "BCom",
  "Bachelor of Technology (BTech)",
  "BTech",
  "Bachelor of Information Technology (BIT)",
  "BIT",
  "Bachelor of Psychology (BPsych)",
  "BPsych",
  "Bachelor of Economics (BEcon)",
  "BEcon",
  "Bachelor of Mathematics (BMath)",
  "BMath",
  "Bachelor of Physics (BPhys)",
  "BPhys",
  "Bachelor of Chemistry (BChem)",
  "BChem",
  "Bachelor of Biology (BBio)",
  "BBio",
  "Bachelor of Accounting (BAcc)",
  "BAcc",
  "Bachelor of Marketing (BMark)",
  "BMark",
  "Bachelor of Finance (BFin)",
  "BFin",
  "Bachelor of Management (BMgmt)",
  "BMgmt",
  "Bachelor of International Business (BIB)",
  "BIB",
  "Bachelor of Hospitality (BHosp)",
  "BHosp",
  "Bachelor of Tourism (BTour)",
  "BTour",
  "Bachelor of Social Work (BSW)",
  "BSW",
  "Bachelor of Arts in English (BA English)",
  "BA English",
  "Bachelor of Arts in History (BA History)",
  "BA History",
  "Bachelor of Arts in Philosophy (BA Philosophy)",
  "BA Philosophy",
  "Bachelor of Science in Mathematics (BS Math)",
  "BS Math",
  "Bachelor of Science in Physics (BS Physics)",
  "BS Physics",
  "Bachelor of Science in Chemistry (BS Chemistry)",
  "BS Chemistry",
  "Bachelor of Science in Biology (BS Biology)",
  "BS Biology",
  "Bachelor of Science in Computer Science (BS CS)",
  "BS CS",
  "Bachelor of Science in Engineering (BS Eng)",
  "BS Eng",
  "Bachelor of Science in Nursing (BSN)",
  "BSN",
  "Bachelor of Science in Psychology (BS Psych)",
  "BS Psych",
  "Bachelor of Science in Economics (BS Econ)",
  "BS Econ",
  "Bachelor of Science in Business (BS Business)",
  "BS Business",

  // Master's Degrees
  "Master of Arts (MA)",
  "MA",
  "Master of Science (MS)",
  "MS",
  "MSc",
  "Master of Engineering (MEng)",
  "MEng",
  "Master of Business Administration (MBA)",
  "MBA",
  "Master of Computer Science (MCS)",
  "MCS",
  "Master of Fine Arts (MFA)",
  "MFA",
  "Master of Architecture (MArch)",
  "MArch",
  "Master of Nursing (MN)",
  "MN",
  "Master of Education (MEd)",
  "MEd",
  "Master of Commerce (MCom)",
  "MCom",
  "Master of Technology (MTech)",
  "MTech",
  "Master of Information Technology (MIT)",
  "MIT",
  "Master of Psychology (MPsych)",
  "MPsych",
  "Master of Economics (MEcon)",
  "MEcon",
  "Master of Mathematics (MMath)",
  "MMath",
  "Master of Physics (MPhys)",
  "MPhys",
  "Master of Chemistry (MChem)",
  "MChem",
  "Master of Biology (MBio)",
  "MBio",
  "Master of Accounting (MAcc)",
  "MAcc",
  "Master of Marketing (MMark)",
  "MMark",
  "Master of Finance (MFin)",
  "MFin",
  "Master of Management (MMgmt)",
  "MMgmt",
  "Master of International Business (MIB)",
  "MIB",
  "Master of Public Administration (MPA)",
  "MPA",
  "Master of Social Work (MSW)",
  "MSW",
  "Master of Public Health (MPH)",
  "MPH",
  "Master of Laws (LLM)",
  "LLM",
  "Master of Science in Computer Science (MS CS)",
  "MS CS",
  "Master of Science in Engineering (MS Eng)",
  "MS Eng",
  "Master of Science in Data Science (MS Data Science)",
  "MS Data Science",
  "Master of Science in Cybersecurity (MS Cybersecurity)",
  "MS Cybersecurity",
  "Master of Science in Artificial Intelligence (MS AI)",
  "MS AI",
  "Master of Science in Software Engineering (MS SE)",
  "MS SE",

  // Doctoral Degrees
  "Doctor of Philosophy (PhD)",
  "PhD",
  "Doctor of Education (EdD)",
  "EdD",
  "Doctor of Medicine (MD)",
  "Doctor of Dental Surgery (DDS)",
  "DDS",
  "Doctor of Veterinary Medicine (DVM)",
  "DVM",
  "Doctor of Pharmacy (PharmD)",
  "PharmD",
  "Doctor of Psychology (PsyD)",
  "PsyD",
  "Doctor of Business Administration (DBA)",
  "DBA",
  "Doctor of Engineering (DEng)",
  "DEng",
  "Doctor of Computer Science (DCS)",
  "DCS",
  "Doctor of Nursing Practice (DNP)",
  "DNP",
  "Doctor of Public Health (DrPH)",
  "DrPH",
  "Doctor of Social Work (DSW)",
  "DSW",
  "Doctor of Jurisprudence (JD)",
  "JD",

  // Associate Degrees
  "Associate of Arts (AA)",
  "AA",
  "Associate of Science (AS)",
  "AS",
  "Associate of Applied Science (AAS)",
  "AAS",
  "Associate of Engineering (AE)",
  "AE",
  "Associate of Business Administration (ABA)",
  "ABA",
  "Associate of Computer Science (ACS)",
  "ACS",
  "Associate of Nursing (AN)",
  "AN",
  "Associate of Education (AEd)",
  "AEd",
  "Associate of Commerce (ACom)",
  "ACom",
  "Associate of Technology (ATech)",
  "ATech",
  "Associate of Information Technology (AIT)",
  "AIT",

  // Professional Certifications
  "Certified Public Accountant (CPA)",
  "Project Management Professional (PMP)",
  "Certified Information Systems Security Professional (CISSP)",
  "Certified Data Professional (CDP)",
  "Certified Scrum Master (CSM)",
  "Certified Information Security Manager (CISM)",
  "Certified Ethical Hacker (CEH)",
  "Certified Cloud Security Professional (CCSP)",
  "Certified Information Systems Auditor (CISA)",
  "Certified in Risk and Information Systems Control (CRISC)",

  // International Degrees
  "Bachelor of Engineering (BEng) - UK",
  "Master of Engineering (MEng) - UK",
  "Bachelor of Technology (BTech) - India",
  "Master of Technology (MTech) - India",
  "Bachelor of Engineering (BEng) - Australia",
  "Master of Engineering (MEng) - Australia",
  "Bachelor of Science (BSc) - UK",
  "Master of Science (MSc) - UK",
  "Bachelor of Arts (BA) - UK",
  "Master of Arts (MA) - UK",
];

interface DegreeAutocompleteProps {
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
  // Writing correction props
  fieldCorrection?: FieldCorrection | null;
  correctionImportance?: 'highly_recommended' | 'standard';
  correctionReasoning?: string;
  onApplyCorrection?: (correction: FieldCorrection) => void;
  onDismissCorrection?: () => void;
}

const DegreeAutocomplete: React.FC<DegreeAutocompleteProps> = ({
  value,
  onChange,
  onSave,
  onCancel,
  placeholder = "e.g., Bachelor of Science",
  label = "Degree",
  fullWidth = true,
  disabled = false,
  error = false,
  helperText,
  sx,
  fieldCorrection,
  correctionImportance,
  correctionReasoning,
  onApplyCorrection,
  onDismissCorrection,
}) => {
  const [inputValue, setInputValue] = useState(value);
  const [isOpen, setIsOpen] = useState(false);

  // Filter degrees based on input
  const filteredDegrees = useMemo(() => {
    if (!inputValue || inputValue.length < 1) return [];

    const searchTerm = inputValue.toLowerCase().trim();

    // Filter with multiple criteria for better matching
    const filtered = COMMON_DEGREES.filter((degree) => {
      const degreeLower = degree.toLowerCase();

      // Starts with search term (high priority)
      if (degreeLower.startsWith(searchTerm)) return true;

      // Contains search term (medium priority)
      if (degreeLower.includes(searchTerm)) return true;

      // Abbreviation match (for cases like "BS" matching "Bachelor of Science")
      const abbreviation = degreeLower.match(/\(([^)]+)\)/)?.[1];
      if (abbreviation && abbreviation.includes(searchTerm)) return true;

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

    // Always show dropdown when typing (Material-UI Autocomplete will handle closing it automatically)
    setIsOpen(newInputValue.length > 0);
  };

  const handleFocus = () => {
    // Only show dropdown if there's text AND it's not an exact match
    if (inputValue.length > 0) {
      const exactMatch = COMMON_DEGREES.find(
        (degree) => degree.toLowerCase() === inputValue.toLowerCase().trim(),
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
    <Box>
      <Autocomplete
        value={value}
        onChange={handleChange}
        inputValue={inputValue}
        onInputChange={handleInputChange}
        options={filteredDegrees}
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
        noOptionsText="Type to search degrees..."
        sx={{
          "& .MuiAutocomplete-inputRoot": {
            paddingTop: 0,
            paddingBottom: 0,
          },
          ...sx,
        }}
      />
      {fieldCorrection && correctionImportance && (
        <InlineFieldCorrection
          fieldCorrection={fieldCorrection}
          importance={correctionImportance}
          reasoning={correctionReasoning}
          onApply={() => onApplyCorrection?.(fieldCorrection)}
          onDismiss={onDismissCorrection || (() => {})}
        />
      )}
    </Box>
  );
};

export default DegreeAutocomplete;
