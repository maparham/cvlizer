/**
 * Personal Information Section Component
 *
 * This module renders and manages the personal information section of a CV including:
 * - Contact details (name, email, phone, location)
 * - Social media links (LinkedIn, GitHub, website)
 * - Location autocomplete functionality
 * - Form validation and editing states
 */
import React from "react";
import {
  Box,
  TextField,
  InputAdornment,
  Typography,
  Autocomplete,
  FormControlLabel,
  Checkbox,
} from "@mui/material";
import {
  GitHub as GitHubIcon,
  LinkedIn as LinkedInIcon,
  Language as WebsiteIcon,
} from "@mui/icons-material";
import { SectionProps } from "../../../types";
import SimpleFormSection from "../core/SimpleFormSection";
import LocationAutocomplete from "../ui/LocationAutocomplete";
import { useFieldValidation } from "../../../hooks/useFieldValidation";
import { FormField } from "../core/formUtils";
import MarkdownRenderer from "../../common/MarkdownRenderer";

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

const PersonalInfoSection: React.FC<SectionProps> = ({
  data,
  onUpdate,
  onSave,
  isEditing,
  onEdit,
  onClose,
  onUnsavedChanges,
  title = "Personal Information",
  onTitleSave,
}) => {
  // Get validation errors for required fields (hooks must be called at component level)
  const fullNameValidation = useFieldValidation("personal_info", undefined, "full_name");
  const emailValidation = useFieldValidation("personal_info", undefined, "email");
  const locationValidation = useFieldValidation("personal_info", undefined, "location");

  const renderForm = (
    editData: any,
    updateData: (field: string, value: any) => void,
    onSave: () => void,
    onCancel: () => void,
  ) => (
      <Box>
        <Box sx={{ display: "flex", gap: 2, mb: 2, alignItems: "baseline" }}>
          <TextField
            fullWidth
            variant="standard"
            value={editData.full_name || ""}
            onChange={(e) => updateData("full_name", e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (editData.full_name?.trim()) {
                  onSave();
                }
              } else if (e.key === "Escape") {
                // Let global escape handler manage this
                onCancel();
              }
            }}
            error={!editData.full_name?.trim() || fullNameValidation.hasError}
            helperText={fullNameValidation.errorMessage || (!editData.full_name?.trim() ? "Full name is required" : "")}
            data-testid="personal-info-full-name-input"
            sx={{
              "& .MuiInputBase-input": {
                fontSize: "2rem",
                fontWeight: "bold",
                color: "#1976d2",
              },
            }}
            placeholder="Your Name *"
          />
        <Autocomplete
          freeSolo
          options={ACADEMIC_TITLES}
          value={editData.academic_title || ""}
          onChange={(_, newValue) => updateData("academic_title", newValue || "")}
          onInputChange={(_, newInputValue) => updateData("academic_title", newInputValue)}
          renderInput={(params) => (
            <TextField
              {...params}
              variant="standard"
              placeholder="Academic Title"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  onSave();
                } else if (e.key === "Escape") {
                  e.preventDefault();
                  onCancel();
                }
              }}
              data-testid="personal-info-academic-title-input"
              sx={{
                minWidth: 200,
              }}
              InputProps={{
                ...params.InputProps,
                startAdornment: (
                  <InputAdornment position="start">🎓</InputAdornment>
                ),
              }}
            />
          )}
          sx={{ minWidth: 200 }}
        />
      </Box>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, mb: 2 }}>
        <TextField
          variant="standard"
          value={editData.email || ""}
          onChange={(e) => updateData("email", e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (editData.email?.trim()) {
                onSave();
              }
            } else if (e.key === "Escape") {
              e.preventDefault();
              onCancel();
            }
          }}
          error={!editData.email?.trim() || emailValidation.hasError}
          helperText={emailValidation.errorMessage || (!editData.email?.trim() ? "Email is required" : "")}
          placeholder="Email *"
          data-testid="personal-info-email-input"
          sx={{
            minWidth: 200,
            "& .MuiInputBase-input": {},
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">📧</InputAdornment>
            ),
          }}
        />
        <TextField
          variant="standard"
          value={editData.phone || ""}
          onChange={(e) => updateData("phone", e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onSave();
            } else if (e.key === "Escape") {
              e.preventDefault();
              onCancel();
            }
          }}
          error={false}
          helperText=""
          placeholder="Phone"
          data-testid="personal-info-phone-input"
          sx={{
            minWidth: 200,
            "& .MuiInputBase-input": {},
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">📞</InputAdornment>
            ),
          }}
        />
        <LocationAutocomplete
          value={editData.location || ""}
          onChange={(value) => updateData("location", value)}
          onSave={onSave}
          onCancel={onCancel}
          error={!editData.location?.trim() || locationValidation.hasError}
          helperText={locationValidation.errorMessage || (!editData.location?.trim() ? "Location is required" : "")}
          placeholder="Location *"
          fullWidth={false}
          sx={{ minWidth: 200 }}
        />
      </Box>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, mb: 2 }}>
        <TextField
          variant="standard"
          value={editData.linkedin_url || ""}
          onChange={(e) => updateData("linkedin_url", e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onSave();
            } else if (e.key === "Escape") {
              e.preventDefault();
              onCancel();
            }
          }}
          placeholder="LinkedIn URL"
          sx={{
            minWidth: 200,
            "& .MuiInputBase-input": {},
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <LinkedInIcon />
              </InputAdornment>
            ),
          }}
        />
        <TextField
          variant="standard"
          value={editData.github_url || ""}
          onChange={(e) => updateData("github_url", e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onSave();
            } else if (e.key === "Escape") {
              e.preventDefault();
              onCancel();
            }
          }}
          placeholder="GitHub URL"
          sx={{
            minWidth: 200,
            "& .MuiInputBase-input": {},
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <GitHubIcon />
              </InputAdornment>
            ),
          }}
        />
        <TextField
          variant="standard"
          value={editData.website_url || ""}
          onChange={(e) => updateData("website_url", e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onSave();
            } else if (e.key === "Escape") {
              e.preventDefault();
              onCancel();
            }
          }}
          placeholder="Website URL"
          sx={{
            minWidth: 200,
            "& .MuiInputBase-input": {},
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <WebsiteIcon />
              </InputAdornment>
            ),
          }}
        />
      </Box>
      <FormField
        config={{
          name: "description",
          label: "Description",
          placeholder: "Add a brief personal description or bio...",
          multiline: true,
          rows: 3,
          useMarkdownEditor: true,
        }}
        value={editData.description || ""}
        onChange={(value) => updateData("description", value)}
        onSave={onSave}
      />
      <FormControlLabel
        control={
          <Checkbox
            checked={editData.description_center_align || false}
            onChange={(e) => updateData("description_center_align", e.target.checked)}
          />
        }
        label="Center align description"
        sx={{ mt: 1 }}
      />
      <FormControlLabel
        control={
          <Checkbox
            checked={editData.show_horizontal_line || false}
            onChange={(e) => updateData("show_horizontal_line", e.target.checked)}
          />
        }
        label="Show horizontal line"
        sx={{ mt: 1 }}
      />
    </Box>
  );

  const renderDisplay = (data: any) => (
    <Box>
      <Typography
        variant="h4"
        sx={{ fontWeight: "bold", mb: 2, color: "#1976d2" }}
      >
        {data.full_name || "Your Name"}
      </Typography>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, mb: 2 }}>
        {data.academic_title && (
          <Typography variant="body1" sx={{ color: "#666" }}>
            🎓 {data.academic_title}
          </Typography>
        )}
        {data.email && (
          <Typography variant="body1" sx={{ color: "#666" }}>
            📧 {data.email}
          </Typography>
        )}
        {data.phone && (
          <Typography variant="body1" sx={{ color: "#666" }}>
            📞 {data.phone}
          </Typography>
        )}
        {data.location && (
          <Typography variant="body1" sx={{ color: "#666" }}>
            📍 {data.location}
          </Typography>
        )}
      </Box>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, mb: 2 }}>
        {data.linkedin_url && (
          <Typography variant="body1" sx={{ color: "#1976d2" }}>
            <LinkedInIcon sx={{ mr: 0.5, verticalAlign: "middle" }} />{" "}
            <a
              href={data.linkedin_url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "inherit", textDecoration: "none" }}
            >
              LinkedIn
            </a>
          </Typography>
        )}
        {data.github_url && (
          <Typography variant="body1" sx={{ color: "#1976d2" }}>
            <GitHubIcon sx={{ mr: 0.5, verticalAlign: "middle" }} />{" "}
            <a
              href={data.github_url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "inherit", textDecoration: "none" }}
            >
              GitHub
            </a>
          </Typography>
        )}
        {data.website_url && (
          <Typography variant="body1" sx={{ color: "#1976d2" }}>
            <WebsiteIcon sx={{ mr: 0.5, verticalAlign: "middle" }} />{" "}
            <a
              href={data.website_url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "inherit", textDecoration: "none" }}
            >
              Website
            </a>
          </Typography>
        )}
      </Box>
      {data.description && (
        <Box sx={{ mb: 2 }}>
          <MarkdownRenderer
            content={data.description}
            variant="body1"
            sx={{
              textAlign: data.description_center_align ? "center" : "left",
            }}
          />
        </Box>
      )}
    </Box>
  );

  return (
    <SimpleFormSection
      data={data}
      onUpdate={onUpdate}
      onSave={onSave}
      isEditing={isEditing}
      onEdit={onEdit}
      onClose={onClose}
      onUnsavedChanges={onUnsavedChanges}
      title={title}
      sectionId="personal_info"
      requiredFields={["full_name", "email", "location"]}
      renderForm={renderForm}
      renderDisplay={renderDisplay}
      autoSaveMessage="Personal information auto-saved"
      onTitleSave={onTitleSave}
    />
  );
};

// Memoize to prevent unnecessary re-renders
export default React.memo(PersonalInfoSection, (prevProps, nextProps) => {
  return (
    prevProps.data === nextProps.data &&
    prevProps.isEditing === nextProps.isEditing
  );
});
