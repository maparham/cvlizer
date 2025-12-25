import React, { useState, useMemo } from "react";
import { Autocomplete, TextField, Box } from "@mui/material";
import { FieldCorrection } from '../../../types/ai';
import { InlineFieldCorrection } from '../ai/InlineFieldCorrection';

// Comprehensive locations dataset - in a real app, this would come from an API
const COMMON_LOCATIONS = [
  // Major US Cities
  "New York, NY",
  "Los Angeles, CA",
  "Chicago, IL",
  "Houston, TX",
  "Phoenix, AZ",
  "Philadelphia, PA",
  "San Antonio, TX",
  "San Diego, CA",
  "Dallas, TX",
  "San Jose, CA",
  "Austin, TX",
  "Jacksonville, FL",
  "Fort Worth, TX",
  "Columbus, OH",
  "Charlotte, NC",
  "San Francisco, CA",
  "Indianapolis, IN",
  "Seattle, WA",
  "Denver, CO",
  "Washington, DC",
  "Boston, MA",
  "El Paso, TX",
  "Nashville, TN",
  "Detroit, MI",
  "Oklahoma City, OK",
  "Portland, OR",
  "Las Vegas, NV",
  "Memphis, TN",
  "Louisville, KY",
  "Baltimore, MD",
  "Milwaukee, WI",
  "Albuquerque, NM",
  "Tucson, AZ",
  "Fresno, CA",
  "Sacramento, CA",
  "Mesa, AZ",
  "Kansas City, MO",
  "Atlanta, GA",
  "Omaha, NE",
  "Colorado Springs, CO",
  "Raleigh, NC",
  "Miami, FL",
  "Virginia Beach, VA",
  "Oakland, CA",
  "Minneapolis, MN",
  "Tulsa, OK",
  "Arlington, TX",
  "Tampa, FL",
  "New Orleans, LA",
  "Wichita, KS",

  // European Cities
  "London, UK",
  "Paris, France",
  "Berlin, Germany",
  "Madrid, Spain",
  "Rome, Italy",
  "Amsterdam, Netherlands",
  "Vienna, Austria",
  "Zurich, Switzerland",
  "Munich, Germany",
  "Hamburg, Germany",
  "Frankfurt, Germany",
  "Cologne, Germany",
  "Stuttgart, Germany",
  "Düsseldorf, Germany",
  "Brussels, Belgium",
  "Dublin, Ireland",
  "Copenhagen, Denmark",
  "Stockholm, Sweden",
  "Oslo, Norway",
  "Helsinki, Finland",
  "Prague, Czech Republic",
  "Warsaw, Poland",
  "Budapest, Hungary",
  "Bucharest, Romania",
  "Sofia, Bulgaria",
  "Athens, Greece",
  "Lisbon, Portugal",
  "Barcelona, Spain",
  "Milan, Italy",
  "Naples, Italy",
  "Turin, Italy",
  "Florence, Italy",
  "Venice, Italy",
  "Bologna, Italy",
  "Moscow, Russia",
  "Saint Petersburg, Russia",
  "Kiev, Ukraine",
  "Minsk, Belarus",

  // Asian Cities
  "Tokyo, Japan",
  "Osaka, Japan",
  "Kyoto, Japan",
  "Yokohama, Japan",
  "Nagoya, Japan",
  "Seoul, South Korea",
  "Busan, South Korea",
  "Incheon, South Korea",
  "Shanghai, China",
  "Beijing, China",
  "Guangzhou, China",
  "Shenzhen, China",
  "Hong Kong",
  "Taipei, Taiwan",
  "Singapore",
  "Bangkok, Thailand",
  "Jakarta, Indonesia",
  "Kuala Lumpur, Malaysia",
  "Manila, Philippines",
  "Ho Chi Minh City, Vietnam",
  "Hanoi, Vietnam",
  "Mumbai, India",
  "Delhi, India",
  "Bangalore, India",
  "Chennai, India",
  "Kolkata, India",
  "Hyderabad, India",
  "Pune, India",
  "Ahmedabad, India",
  "Jaipur, India",
  "Lucknow, India",
  "Kanpur, India",

  // Middle East & Africa
  "Dubai, UAE",
  "Abu Dhabi, UAE",
  "Riyadh, Saudi Arabia",
  "Jeddah, Saudi Arabia",
  "Doha, Qatar",
  "Kuwait City, Kuwait",
  "Manama, Bahrain",
  "Muscat, Oman",
  "Cairo, Egypt",
  "Lagos, Nigeria",
  "Johannesburg, South Africa",
  "Cape Town, South Africa",
  "Nairobi, Kenya",
  "Casablanca, Morocco",
  "Tunis, Tunisia",
  "Algiers, Algeria",

  // North American Cities
  "Toronto, Canada",
  "Vancouver, Canada",
  "Montreal, Canada",
  "Calgary, Canada",
  "Ottawa, Canada",
  "Edmonton, Canada",
  "Winnipeg, Canada",
  "Quebec City, Canada",
  "Hamilton, Canada",
  "Kitchener, Canada",
  "Mexico City, Mexico",
  "Guadalajara, Mexico",
  "Monterrey, Mexico",
  "Puebla, Mexico",
  "Tijuana, Mexico",
  "León, Mexico",

  // South American Cities
  "São Paulo, Brazil",
  "Rio de Janeiro, Brazil",
  "Brasília, Brazil",
  "Buenos Aires, Argentina",
  "Córdoba, Argentina",
  "Rosario, Argentina",
  "Lima, Peru",
  "Bogotá, Colombia",
  "Medellín, Colombia",
  "Santiago, Chile",
  "Caracas, Venezuela",
  "Quito, Ecuador",
  "Montevideo, Uruguay",
  "Asunción, Paraguay",
  "La Paz, Bolivia",

  // Australian & Oceania
  "Sydney, Australia",
  "Melbourne, Australia",
  "Brisbane, Australia",
  "Perth, Australia",
  "Adelaide, Australia",
  "Gold Coast, Australia",
  "Newcastle, Australia",
  "Auckland, New Zealand",
  "Wellington, New Zealand",
  "Christchurch, New Zealand",

  // Remote/Other
  "Remote",
  "Remote Work",
  "Work from Home",
  "Hybrid",
  "Flexible Location",
  "Anywhere",
];

interface LocationAutocompleteProps {
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

const LocationAutocomplete: React.FC<LocationAutocompleteProps> = ({
  value,
  onChange,
  onSave,
  onCancel,
  placeholder = "e.g., San Francisco, CA",
  label: _label = "Location",
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

  // Filter locations based on input
  const filteredLocations = useMemo(() => {
    if (!inputValue || inputValue.length < 1) return [];

    const searchTerm = inputValue.toLowerCase().trim();

    // Filter with multiple criteria for better matching
    const filtered = COMMON_LOCATIONS.filter((location) => {
      const locationLower = location.toLowerCase();

      // Starts with search term (high priority)
      if (locationLower.startsWith(searchTerm)) return true;

      // Contains search term (medium priority)
      if (locationLower.includes(searchTerm)) return true;

      // City name match (for cases like "Vienna" matching "Vienna, Austria")
      const cityName = locationLower.split(",")[0].trim();
      if (cityName === searchTerm || cityName.startsWith(searchTerm))
        return true;

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

      // Then city name matches
      const aCity = aLower.split(",")[0].trim();
      const bCity = bLower.split(",")[0].trim();
      if (aCity === searchTerm && bCity !== searchTerm) return -1;
      if (bCity === searchTerm && aCity !== searchTerm) return 1;

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
    const exactMatch = COMMON_LOCATIONS.find(
      (location) =>
        location.toLowerCase() === newInputValue.toLowerCase().trim(),
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
      const exactMatch = COMMON_LOCATIONS.find(
        (location) =>
          location.toLowerCase() === inputValue.toLowerCase().trim(),
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
        options={filteredLocations}
        freeSolo
        handleHomeEndKeys
        open={isOpen}
        renderInput={(params) => (
          <TextField
            {...params}
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
        noOptionsText="Type to search locations..."
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

export default LocationAutocomplete;
