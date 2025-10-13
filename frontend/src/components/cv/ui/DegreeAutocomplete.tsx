import React, { useState, useMemo } from 'react'
import { Autocomplete, TextField } from '@mui/material'

// Common degree names
const COMMON_DEGREES = [
  // Bachelor's Degrees
  'Bachelor of Arts (BA)', 'Bachelor of Science (BS)', 'Bachelor of Engineering (BEng)',
  'Bachelor of Business Administration (BBA)', 'Bachelor of Computer Science (BCS)',
  'Bachelor of Fine Arts (BFA)', 'Bachelor of Architecture (BArch)', 'Bachelor of Nursing (BN)',
  'Bachelor of Education (BEd)', 'Bachelor of Commerce (BCom)', 'Bachelor of Technology (BTech)',
  'Bachelor of Information Technology (BIT)', 'Bachelor of Psychology (BPsych)',
  'Bachelor of Economics (BEcon)', 'Bachelor of Mathematics (BMath)', 'Bachelor of Physics (BPhys)',
  'Bachelor of Chemistry (BChem)', 'Bachelor of Biology (BBio)', 'Bachelor of Accounting (BAcc)',
  'Bachelor of Marketing (BMark)', 'Bachelor of Finance (BFin)', 'Bachelor of Management (BMgmt)',
  'Bachelor of International Business (BIB)', 'Bachelor of Hospitality (BHosp)',
  'Bachelor of Tourism (BTour)', 'Bachelor of Social Work (BSW)', 'Bachelor of Arts in English (BA English)',
  'Bachelor of Arts in History (BA History)', 'Bachelor of Arts in Philosophy (BA Philosophy)',
  'Bachelor of Science in Mathematics (BS Math)', 'Bachelor of Science in Physics (BS Physics)',
  'Bachelor of Science in Chemistry (BS Chemistry)', 'Bachelor of Science in Biology (BS Biology)',
  'Bachelor of Science in Computer Science (BS CS)', 'Bachelor of Science in Engineering (BS Eng)',
  'Bachelor of Science in Nursing (BSN)', 'Bachelor of Science in Psychology (BS Psych)',
  'Bachelor of Science in Economics (BS Econ)', 'Bachelor of Science in Business (BS Business)',

  // Master's Degrees
  'Master of Arts (MA)', 'Master of Science (MS)', 'Master of Engineering (MEng)',
  'Master of Business Administration (MBA)', 'Master of Computer Science (MCS)',
  'Master of Fine Arts (MFA)', 'Master of Architecture (MArch)', 'Master of Nursing (MN)',
  'Master of Education (MEd)', 'Master of Commerce (MCom)', 'Master of Technology (MTech)',
  'Master of Information Technology (MIT)', 'Master of Psychology (MPsych)',
  'Master of Economics (MEcon)', 'Master of Mathematics (MMath)', 'Master of Physics (MPhys)',
  'Master of Chemistry (MChem)', 'Master of Biology (MBio)', 'Master of Accounting (MAcc)',
  'Master of Marketing (MMark)', 'Master of Finance (MFin)', 'Master of Management (MMgmt)',
  'Master of International Business (MIB)', 'Master of Public Administration (MPA)',
  'Master of Social Work (MSW)', 'Master of Public Health (MPH)', 'Master of Laws (LLM)',
  'Master of Science in Computer Science (MS CS)', 'Master of Science in Engineering (MS Eng)',
  'Master of Science in Data Science (MS Data Science)', 'Master of Science in Cybersecurity (MS Cybersecurity)',
  'Master of Science in Artificial Intelligence (MS AI)', 'Master of Science in Software Engineering (MS SE)',

  // Doctoral Degrees
  'Doctor of Philosophy (PhD)', 'Doctor of Education (EdD)', 'Doctor of Medicine (MD)',
  'Doctor of Dental Surgery (DDS)', 'Doctor of Veterinary Medicine (DVM)',
  'Doctor of Pharmacy (PharmD)', 'Doctor of Psychology (PsyD)', 'Doctor of Business Administration (DBA)',
  'Doctor of Engineering (DEng)', 'Doctor of Computer Science (DCS)', 'Doctor of Nursing Practice (DNP)',
  'Doctor of Public Health (DrPH)', 'Doctor of Social Work (DSW)', 'Doctor of Jurisprudence (JD)',

  // Associate Degrees
  'Associate of Arts (AA)', 'Associate of Science (AS)', 'Associate of Applied Science (AAS)',
  'Associate of Engineering (AE)', 'Associate of Business Administration (ABA)',
  'Associate of Computer Science (ACS)', 'Associate of Nursing (AN)', 'Associate of Education (AEd)',
  'Associate of Commerce (ACom)', 'Associate of Technology (ATech)', 'Associate of Information Technology (AIT)',

  // Professional Certifications
  'Certified Public Accountant (CPA)', 'Project Management Professional (PMP)',
  'Certified Information Systems Security Professional (CISSP)', 'Certified Data Professional (CDP)',
  'Certified Scrum Master (CSM)', 'Certified Information Security Manager (CISM)',
  'Certified Ethical Hacker (CEH)', 'Certified Cloud Security Professional (CCSP)',
  'Certified Information Systems Auditor (CISA)', 'Certified in Risk and Information Systems Control (CRISC)',

  // International Degrees
  'Bachelor of Engineering (BEng) - UK', 'Master of Engineering (MEng) - UK',
  'Bachelor of Technology (BTech) - India', 'Master of Technology (MTech) - India',
  'Bachelor of Engineering (BEng) - Australia', 'Master of Engineering (MEng) - Australia',
  'Bachelor of Science (BSc) - UK', 'Master of Science (MSc) - UK',
  'Bachelor of Arts (BA) - UK', 'Master of Arts (MA) - UK',

  // Short Forms (commonly used)
  'BA', 'BS', 'BSc', 'BEng', 'BBA', 'BCS', 'BFA', 'BArch', 'BN', 'BEd', 'BCom', 'BTech', 'BIT',
  'MA', 'MS', 'MSc', 'MEng', 'MBA', 'MCS', 'MFA', 'MArch', 'MN', 'MEd', 'MCom', 'MTech', 'MIT',
  'PhD', 'EdD', 'MD', 'DDS', 'DVM', 'PharmD', 'PsyD', 'DBA', 'DEng', 'DCS', 'DNP', 'DrPH', 'DSW', 'JD',
  'AA', 'AS', 'AAS', 'AE', 'ABA', 'ACS', 'AN', 'AEd', 'ACom', 'ATech', 'AIT'
]

interface DegreeAutocompleteProps {
  value: string
  onChange: (value: string) => void
  onSave?: () => void
  onCancel?: () => void
  placeholder?: string
  label?: string
  fullWidth?: boolean
  disabled?: boolean
  error?: boolean
  helperText?: string
  sx?: any
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
  sx
}) => {
  const [inputValue, setInputValue] = useState(value)
  const [isOpen, setIsOpen] = useState(false)

  // Filter degrees based on input
  const filteredDegrees = useMemo(() => {
    if (!inputValue || inputValue.length < 1) return []

    const searchTerm = inputValue.toLowerCase().trim()

    // Filter with multiple criteria for better matching
    const filtered = COMMON_DEGREES.filter(degree => {
      const degreeLower = degree.toLowerCase()

      // Starts with search term (high priority)
      if (degreeLower.startsWith(searchTerm)) return true

      // Contains search term (medium priority)
      if (degreeLower.includes(searchTerm)) return true

      // Abbreviation match (for cases like "BS" matching "Bachelor of Science")
      const abbreviation = degreeLower.match(/\(([^)]+)\)/)?.[1]
      if (abbreviation && abbreviation.includes(searchTerm)) return true

      return false
    })

    // Sort results by relevance
    const sorted = filtered.sort((a, b) => {
      const aLower = a.toLowerCase()
      const bLower = b.toLowerCase()

      // Exact matches first
      if (aLower === searchTerm && bLower !== searchTerm) return -1
      if (bLower === searchTerm && aLower !== searchTerm) return 1

      // Then starts with
      if (aLower.startsWith(searchTerm) && !bLower.startsWith(searchTerm)) return -1
      if (bLower.startsWith(searchTerm) && !aLower.startsWith(searchTerm)) return 1

      return 0
    })

    return sorted.slice(0, 10) // Limit to 10 suggestions
  }, [inputValue])

  const handleChange = (_event: any, newValue: string | null) => {
    const selectedValue = newValue || ''
    setInputValue(selectedValue)
    onChange(selectedValue)
    setIsOpen(false) // Hide dropdown when selection is made
  }

  const handleInputChange = (_event: any, newInputValue: string) => {
    setInputValue(newInputValue)
    onChange(newInputValue) // Update parent immediately for better UX

    // Check if the input exactly matches an option
    const exactMatch = COMMON_DEGREES.find(degree =>
      degree.toLowerCase() === newInputValue.toLowerCase().trim()
    )

    if (exactMatch) {
      setIsOpen(false) // Hide dropdown if exact match
    } else {
      setIsOpen(newInputValue.length > 0) // Show dropdown when typing
    }
  }

  const handleFocus = () => {
    // Only show dropdown if there's text AND it's not an exact match
    if (inputValue.length > 0) {
      const exactMatch = COMMON_DEGREES.find(degree =>
        degree.toLowerCase() === inputValue.toLowerCase().trim()
      )
      setIsOpen(!exactMatch) // Hide dropdown if exact match
    } else {
      setIsOpen(false)
    }
  }

  const handleBlur = () => {
    // Delay to allow selection from dropdown
    setTimeout(() => {
      setIsOpen(false)
    }, 150)
  }

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      setIsOpen(false)
      if (onSave) {
        onSave()
      }
    } else if (event.key === 'Escape') {
      event.preventDefault()
      setIsOpen(false)
      if (onCancel) {
        onCancel()
      }
    }
  }

  return (
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
            ...sx
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
        '& .MuiAutocomplete-inputRoot': {
          paddingTop: 0,
          paddingBottom: 0
        },
        ...sx
      }}
    />
  )
}

export default DegreeAutocomplete
