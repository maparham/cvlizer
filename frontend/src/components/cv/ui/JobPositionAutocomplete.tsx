import React, { useState, useMemo } from "react";
import Autocomplete from "@mui/material/Autocomplete";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";

// Comprehensive job positions dataset
const COMMON_JOB_POSITIONS = [
  // Software Development
  "Software Engineer",
  "Senior Software Engineer",
  "Lead Software Engineer",
  "Principal Software Engineer",
  "Software Developer",
  "Senior Software Developer",
  "Full Stack Developer",
  "Frontend Developer",
  "Backend Developer",
  "React Developer",
  "Angular Developer",
  "Vue.js Developer",
  "Node.js Developer",
  "Python Developer",
  "Java Developer",
  "C# Developer",
  "PHP Developer",
  "Ruby Developer",
  "Go Developer",
  "Rust Developer",
  "Mobile Developer",
  "iOS Developer",
  "Android Developer",
  "React Native Developer",
  "Flutter Developer",
  "DevOps Engineer",
  "Site Reliability Engineer",
  "Cloud Engineer",
  "AWS Engineer",
  "Azure Engineer",
  "Data Engineer",
  "Machine Learning Engineer",
  "AI Engineer",
  "MLOps Engineer",

  // Product & Design
  "Product Manager",
  "Senior Product Manager",
  "Principal Product Manager",
  "Director of Product",
  "Product Owner",
  "Scrum Master",
  "UX Designer",
  "UI Designer",
  "Product Designer",
  "User Researcher",
  "UX Researcher",
  "Interaction Designer",
  "Visual Designer",
  "Design System Designer",

  // Data & Analytics
  "Data Scientist",
  "Senior Data Scientist",
  "Principal Data Scientist",
  "Data Analyst",
  "Business Analyst",
  "Business Intelligence Analyst",
  "Analytics Engineer",
  "Research Scientist",
  "Statistician",
  "Quantitative Analyst",
  "Risk Analyst",
  "Financial Analyst",
  "Operations Analyst",

  // Marketing & Sales
  "Marketing Manager",
  "Digital Marketing Manager",
  "Content Marketing Manager",
  "Social Media Manager",
  "SEO Specialist",
  "SEM Specialist",
  "PPC Specialist",
  "Email Marketing Specialist",
  "Growth Marketing Manager",
  "Sales Manager",
  "Account Manager",
  "Business Development Manager",
  "Sales Representative",
  "Customer Success Manager",
  "Account Executive",
  "Sales Director",
  "VP of Sales",

  // Operations & Management
  "Operations Manager",
  "General Manager",
  "Program Manager",
  "Project Manager",
  "Senior Project Manager",
  "Technical Program Manager",
  "Operations Analyst",
  "Business Operations Manager",
  "Strategy Manager",
  "Chief Executive Officer",
  "Chief Technology Officer",
  "Chief Operating Officer",
  "Chief Financial Officer",
  "Vice President",
  "Director",
  "Senior Director",
  "VP of Engineering",
  "Director of Engineering",

  // Finance & Accounting
  "Financial Analyst",
  "Senior Financial Analyst",
  "Finance Manager",
  "Controller",
  "CFO",
  "Investment Analyst",
  "Portfolio Manager",
  "Credit Analyst",
  "Risk Manager",
  "Treasury Manager",
  "Accountant",
  "Senior Accountant",
  "Tax Manager",
  "Audit Manager",

  // Human Resources
  "HR Manager",
  "HR Business Partner",
  "Talent Acquisition Manager",
  "Recruiter",
  "Senior Recruiter",
  "People Operations Manager",
  "Compensation Manager",
  "Benefits Manager",
  "HR Generalist",

  // Customer Support
  "Customer Support Representative",
  "Customer Success Specialist",
  "Technical Support Engineer",
  "Customer Experience Manager",
  "Support Manager",
  "Customer Operations Manager",

  // Quality Assurance
  "QA Engineer",
  "Senior QA Engineer",
  "Test Engineer",
  "Automation Engineer",
  "Performance Engineer",
  "Security Engineer",
  "Cybersecurity Engineer",
  "Information Security Analyst",

  // Consulting & Strategy
  "Management Consultant",
  "Strategy Consultant",
  "Business Consultant",
  "Technology Consultant",
  "Implementation Consultant",
  "Solution Architect",
  "Enterprise Architect",
  "Technical Architect",

  // Content & Communications
  "Content Writer",
  "Technical Writer",
  "Content Strategist",
  "Copywriter",
  "Editor",
  "Communications Manager",
  "Public Relations Manager",
  "Brand Manager",
  "Marketing Communications Manager",

  // Legal & Compliance
  "Legal Counsel",
  "Senior Legal Counsel",
  "Compliance Manager",
  "Legal Assistant",
  "Paralegal",
  "Privacy Officer",
  "Risk & Compliance Manager",

  // Healthcare & Life Sciences
  "Clinical Research Associate",
  "Medical Writer",
  "Regulatory Affairs Manager",
  "Quality Assurance Manager",
  "Biostatistician",
  "Clinical Data Manager",
  "Medical Affairs Manager",

  // Education & Training
  "Training Manager",
  "Learning & Development Manager",
  "Instructional Designer",
  "Corporate Trainer",
  "Education Manager",
  "Curriculum Developer",

  // Retail & E-commerce
  "E-commerce Manager",
  "Merchandising Manager",
  "Supply Chain Manager",
  "Inventory Manager",
  "Retail Manager",
  "Store Manager",
  "Category Manager",

  // Real Estate
  "Real Estate Agent",
  "Property Manager",
  "Real Estate Broker",
  "Commercial Real Estate Agent",
  "Real Estate Analyst",
  "Development Manager",

  // Media & Entertainment
  "Producer",
  "Director",
  "Editor",
  "Cinematographer",
  "Sound Engineer",
  "Graphic Designer",
  "Video Editor",
  "Motion Graphics Designer",
  "Creative Director",
  "Art Director",

  // Non-profit & Government
  "Program Coordinator",
  "Grant Writer",
  "Development Manager",
  "Community Manager",
  "Policy Analyst",
  "Research Analyst",
  "Government Relations Manager",

  // Freelance & Contract
  "Freelancer",
  "Consultant",
  "Contractor",
  "Independent Contractor",
  "Self-Employed",
  "Entrepreneur",
  "Founder",
  "Co-Founder",
  "Startup Founder",

  // Entry Level & Internships
  "Intern",
  "Junior Developer",
  "Junior Analyst",
  "Associate",
  "Coordinator",
  "Assistant",
  "Trainee",
  "Apprentice",
  "Entry Level",
  "Graduate Trainee",
];

import { FieldCorrection } from '../../../types/ai';
import { InlineFieldCorrection } from '../ai/InlineFieldCorrection';

interface JobPositionAutocompleteProps {
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

const JobPositionAutocomplete: React.FC<JobPositionAutocompleteProps> = ({
  value,
  onChange,
  onSave,
  onCancel,
  placeholder = "e.g., Software Engineer",
  label = "Position",
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

  // Filter positions based on input
  const filteredPositions = useMemo(() => {
    if (!inputValue || inputValue.length < 1) return [];

    const searchTerm = inputValue.toLowerCase().trim();

    // Filter with multiple criteria for better matching
    const filtered = COMMON_JOB_POSITIONS.filter((position) => {
      const positionLower = position.toLowerCase();

      // Starts with search term (high priority)
      if (positionLower.startsWith(searchTerm)) return true;

      // Contains search term (medium priority)
      if (positionLower.includes(searchTerm)) return true;

      // Word boundary match (for partial word matches)
      const words = positionLower.split(" ");
      if (words.some((word) => word.startsWith(searchTerm))) return true;

      return false;
    });

    // Sort results by relevance (exact matches first, then starts with, then contains)
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

      // Then word boundary matches
      const aWords = aLower.split(" ");
      const bWords = bLower.split(" ");
      const aWordMatch = aWords.some((word) => word.startsWith(searchTerm));
      const bWordMatch = bWords.some((word) => word.startsWith(searchTerm));
      if (aWordMatch && !bWordMatch) return -1;
      if (bWordMatch && !aWordMatch) return 1;

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
    const exactMatch = COMMON_JOB_POSITIONS.find(
      (position) =>
        position.toLowerCase() === newInputValue.toLowerCase().trim(),
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
      const exactMatch = COMMON_JOB_POSITIONS.find(
        (position) =>
          position.toLowerCase() === inputValue.toLowerCase().trim(),
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
        options={filteredPositions}
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
        noOptionsText="Type to search job positions..."
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

export default JobPositionAutocomplete;
