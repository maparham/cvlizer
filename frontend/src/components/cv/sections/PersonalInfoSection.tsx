/**
 * Personal Information Section Component
 *
 * This module renders and manages the personal information section of a CV including:
 * - Contact details (name, email, phone, location)
 * - Social media links (LinkedIn, GitHub, website)
 * - Location autocomplete functionality
 * - Form validation and editing states
 * - Inline writing corrections for description (CV quality analysis)
 */
import React, { useMemo, useState, useCallback, useEffect, useRef } from "react";
import {
  Box,
  TextField,
  InputAdornment,
  Typography,
  Autocomplete,
  FormControlLabel,
  Checkbox,
  IconButton,
  Menu,
  MenuItem,
} from "@mui/material";
import {
  GitHub as GitHubIcon,
  LinkedIn as LinkedInIcon,
  Language as WebsiteIcon,
  MoreVert as MoreVertIcon,
  AccountCircle as AddPhotoIcon,
} from "@mui/icons-material";
import { SectionProps } from "../../../types";
import SimpleFormSection from "../core/SimpleFormSection";
import LocationAutocomplete from "../ui/LocationAutocomplete";
import { useFieldValidation } from "../../../hooks/useFieldValidation";
import { FormField } from "../core/formUtils";
import MarkdownRenderer from "../../common/MarkdownRenderer";
import { useSingleSectionWritingCorrections } from "./hooks/useSingleSectionWritingCorrections";
import { FieldCorrection, ContentCoachingItem } from "../../../types/ai";
import { DescriptionCorrectionBlock } from "../ai/DescriptionCorrectionBlock";
import { CoachingQuestionsPanel } from "../ai/CoachingQuestionsPanel";
import { useValidatedQualityAnalysis } from "../../../stores/cvQualityStore";
import { useEditedSinceAIStore } from "../../../stores/editedSinceAIStore";
import { useOverwriteConfirm, OVERWRITE_MSG } from "../../../contexts/OverwriteConfirmContext";
import { createTrackedFieldUpdater } from "./hooks/createTrackedFieldUpdater";
import { buildQualitySuggestionId } from "../../../utils/qualitySuggestionIds";
import { ProfilePictureUpload } from "./ProfilePictureUpload";
import { cvApi } from "../../../services/api";

/** Ensures a URL has a protocol so it is treated as absolute, not relative. */
function ensureProtocol(url: string | undefined): string {
  const t = url?.trim();
  if (!t) return "";
  if (/^https?:\/\//i.test(t)) return t;
  return `https://${t}`;
}

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

interface PersonalInfoSectionProps extends SectionProps {
  cvId?: string;
}

const PersonalInfoSection: React.FC<PersonalInfoSectionProps> = ({
  data,
  onUpdate,
  onSave,
  isEditing,
  onEdit,
  onClose,
  onUnsavedChanges,
  title = "Personal Information",
  onTitleSave,
  cvId,
  onHide,
  onDelete,
}) => {
  // Get validation errors for required fields (hooks must be called at component level)
  const fullNameValidation = useFieldValidation("personal_info", undefined, "full_name");
  const emailValidation = useFieldValidation("personal_info", undefined, "email");
  const locationValidation = useFieldValidation("personal_info", undefined, "location");

  const {
    descriptionCorrection,
    handleApplyFieldCorrection,
    handleDismissWritingCorrection,
    createWritingCorrectionHandler,
    onRetry,
    onBack,
    canGoBack,
    onForward,
    canGoForward,
    isRetrying,
    draftIndex,
    draftTotal,
  } = useSingleSectionWritingCorrections({
    cvId,
    sectionKeys: ["personal_info", "personal_info.description"],
    getValueFromCV: (c) =>
      (c.parsed_data?.personal_info as { description?: string } | undefined)
        ?.description ?? "",
    formFieldName: "description",
  });

  const qualityAnalysis = useValidatedQualityAnalysis(cvId ?? "");
  const personalInfoCoaching = useMemo((): ContentCoachingItem | null => {
    const issue = qualityAnalysis?.issues?.find(
      (i) => i.item_type === "personal_info" && i.coaching
    );
    if (!issue?.coaching) return null;
    const cat = issue.issue_category as ContentCoachingItem["issue_category"];
    return {
      item_id: "personal_info",
      section: "personal_info",
      issue_category: cat,
      coaching_questions: issue.coaching.coaching_questions,
      direct_prompts: issue.coaching.direct_prompts ?? [],
      reasoning: issue.reasoning ?? undefined,
    };
  }, [qualityAnalysis?.issues]);

  const { isEdited, clearEdited } = useEditedSinceAIStore();
  const { confirm: overwriteConfirm } = useOverwriteConfirm();
  const DESCRIPTION_FIELD_KEY = "personal_info.description" as const;

  const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(null);
  const [profilePictureUploading, setProfilePictureUploading] = useState(false);
  const [profilePictureDeleting, setProfilePictureDeleting] = useState(false);

  const profilePictureUrlRef = React.useRef<string | null>(null);
  const [profilePictureMenuAnchor, setProfilePictureMenuAnchor] =
    useState<HTMLElement | null>(null);
  const viewModeFileInputRef = useRef<HTMLInputElement>(null);
  const viewModeShapeRef = useRef<"circle" | "square">("circle");
  const viewModeSizeRef = useRef<"small" | "standard" | "large">("standard");

  useEffect(() => {
    if (!cvId || !data?.profile_picture) {
      if (profilePictureUrlRef.current) {
        window.URL.revokeObjectURL(profilePictureUrlRef.current);
        profilePictureUrlRef.current = null;
        setProfilePictureUrl(null);
      }
      return;
    }
    let cancelled = false;
    cvApi.getProfilePicture(cvId).then((url) => {
      if (cancelled || !url) return;
      if (profilePictureUrlRef.current) {
        window.URL.revokeObjectURL(profilePictureUrlRef.current);
      }
      profilePictureUrlRef.current = url;
      setProfilePictureUrl(url);
    });
    return () => {
      cancelled = true;
      if (profilePictureUrlRef.current) {
        window.URL.revokeObjectURL(profilePictureUrlRef.current);
        profilePictureUrlRef.current = null;
      }
    };
  }, [cvId, data?.profile_picture]);

  const handleProfileUpload = useCallback(
    async (file: File, shape: "circle" | "square", size: "small" | "standard" | "large") => {
      if (!cvId) return;
      setProfilePictureUploading(true);
      try {
        const response = await cvApi.uploadProfilePicture(cvId, file, shape, size);
        const personal = response?.parsed_data?.personal_info;
        if (personal) {
          onUpdate(personal);
          await onSave(personal);
        }
        if (profilePictureUrlRef.current) {
          window.URL.revokeObjectURL(profilePictureUrlRef.current);
          profilePictureUrlRef.current = null;
        }
        const url = window.URL.createObjectURL(file);
        profilePictureUrlRef.current = url;
        setProfilePictureUrl(url);
      } finally {
        setProfilePictureUploading(false);
      }
    },
    [cvId, onUpdate, onSave]
  );

  const handleProfileDelete = useCallback(async () => {
    if (!cvId) return;
    setProfilePictureDeleting(true);
    try {
      await cvApi.deleteProfilePicture(cvId);
      if (profilePictureUrlRef.current) {
        window.URL.revokeObjectURL(profilePictureUrlRef.current);
        profilePictureUrlRef.current = null;
      }
      setProfilePictureUrl(null);
      const cleared = { ...data, profile_picture: undefined, profile_picture_shape: undefined, profile_picture_size: undefined };
      onUpdate(cleared);
      await onSave(cleared);
    } catch (error) {
      console.error("Failed to delete profile picture:", error);
      // Leave UI state unchanged so it stays in sync with backend
    } finally {
      setProfilePictureDeleting(false);
    }
  }, [cvId, data, onUpdate, onSave]);

  const handleProfileShapeChange = useCallback(
    (shape: "circle" | "square") => {
      const next = { ...data, profile_picture_shape: shape };
      onUpdate(next);
      void onSave(next);
    },
    [data, onUpdate, onSave]
  );

  const handleProfileSizeChange = useCallback(
    (size: "small" | "standard" | "large") => {
      const next = { ...data, profile_picture_size: size };
      onUpdate(next);
      void onSave(next);
    },
    [data, onUpdate, onSave]
  );

  const handleProfilePictureMenuOpen = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      setProfilePictureMenuAnchor(e.currentTarget);
    },
    []
  );

  const handleProfilePictureMenuClose = useCallback(() => {
    setProfilePictureMenuAnchor(null);
  }, []);

  const handleViewModeAddOrReplacePhoto = useCallback(
    (shape: "circle" | "square") => {
      viewModeShapeRef.current = shape;
      handleProfilePictureMenuClose();
      viewModeFileInputRef.current?.click();
    },
    [handleProfilePictureMenuClose]
  );

  const handleViewModeChangeSize = useCallback(
    (size: "small" | "standard" | "large") => {
      handleProfilePictureMenuClose();
      handleProfileSizeChange(size);
    },
    [handleProfilePictureMenuClose, handleProfileSizeChange]
  );

  const handleViewModeRemovePhoto = useCallback(() => {
    handleProfilePictureMenuClose();
    void handleProfileDelete();
  }, [handleProfilePictureMenuClose, handleProfileDelete]);

  const handleViewModeFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        const shape = viewModeShapeRef.current || "circle";
        const size = viewModeSizeRef.current || "standard";
        void handleProfileUpload(file, shape, size);
      }
      e.target.value = "";
    },
    [handleProfileUpload]
  );

  const PICTURE_SIZES = {
    small: 80,
    standard: 96,
    large: 128,
  } as const;


  const renderForm = (
    editData: any,
    updateData: (field: string, value: any) => void,
    handleSave: () => void,
    onCancel: () => void,
  ) => {
    const wrappedUpdateData = createTrackedFieldUpdater(cvId, DESCRIPTION_FIELD_KEY, updateData, ["description"]);
    const saveWithData: (data: Record<string, unknown>) => Promise<void> = (
      data
    ) => onSave(data, undefined);
    const handleApplyWritingCorrectionInEdit = createWritingCorrectionHandler(
      "edit",
      editData,
      updateData,
      saveWithData
    );
    return (
      <Box>
        {cvId && (
          <ProfilePictureUpload
            currentImageUrl={profilePictureUrl}
            currentShape={(editData.profile_picture_shape as "circle" | "square") || "circle"}
            currentSize={(editData.profile_picture_size as "small" | "standard" | "large") || "standard"}
            onUpload={handleProfileUpload}
            onDelete={handleProfileDelete}
            onShapeChange={handleProfileShapeChange}
            onSizeChange={handleProfileSizeChange}
            uploading={profilePictureUploading}
            deleting={profilePictureDeleting}
          />
        )}
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
        onChange={(value) => wrappedUpdateData("description", value)}
        onSave={onSave}
        htmlDiffCorrection={descriptionCorrection}
        onApplyCorrection={
          descriptionCorrection
            ? async (correction) => {
                if (cvId && isEdited(cvId, DESCRIPTION_FIELD_KEY)) {
                  const ok = await overwriteConfirm(OVERWRITE_MSG);
                  if (!ok) return;
                }
                await handleApplyWritingCorrectionInEdit(
                  {} as FieldCorrection,
                  correction
                );
                if (cvId) {
                  clearEdited(cvId, DESCRIPTION_FIELD_KEY);
                }
              }
            : undefined
        }
        onDismissCorrection={
          descriptionCorrection
            ? () => handleDismissWritingCorrection(descriptionCorrection.correction)
            : undefined
        }
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
  };

  const renderDisplay = (data: any) => {
    const fullNameMissingOrInvalid =
      !data.full_name?.trim() || fullNameValidation.hasError;
    const fullNameMessage =
      fullNameValidation.errorMessage || "Full name is required";

    const emailMissingOrInvalid =
      !data.email?.trim() || emailValidation.hasError;
    const emailMessage =
      emailValidation.errorMessage || "Email is required";

    const locationMissingOrInvalid =
      !data.location?.trim() || locationValidation.hasError;
    const locationMessage =
      locationValidation.errorMessage || "Location is required";

    const shape = (data.profile_picture_shape as "circle" | "square") || "circle";
    const size = (data.profile_picture_size as "small" | "standard" | "large") || "standard";
    const pictureSize = PICTURE_SIZES[size];

    return (
      <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          variant="h4"
          sx={{
            fontWeight: "bold",
            mb: 2,
            color: fullNameMissingOrInvalid ? "error.main" : "#1976d2",
          }}
        >
          {fullNameMissingOrInvalid ? fullNameMessage : data.full_name}
        </Typography>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, mb: 2 }}>
          {data.academic_title && (
            <Typography variant="body1" sx={{ color: "#666" }}>
              🎓 {data.academic_title}
            </Typography>
          )}
          <Typography
            variant="body1"
            sx={{
              color: emailMissingOrInvalid ? "error.main" : "#666",
            }}
          >
            📧 {emailMissingOrInvalid ? emailMessage : data.email}
          </Typography>
          {data.phone && (
            <Typography variant="body1" sx={{ color: "#666" }}>
              📞 {data.phone}
            </Typography>
          )}
          <Typography
            variant="body1"
            sx={{
              color: locationMissingOrInvalid ? "error.main" : "#666",
            }}
          >
            📍 {locationMissingOrInvalid ? locationMessage : data.location}
          </Typography>
        </Box>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, mb: 2 }}>
        {data.linkedin_url && (
          <Typography variant="body1" sx={{ color: "#1976d2" }}>
            <LinkedInIcon sx={{ mr: 0.5, verticalAlign: "middle" }} />{" "}
            <a
              href={ensureProtocol(data.linkedin_url)}
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
              href={ensureProtocol(data.github_url)}
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
              href={ensureProtocol(data.website_url)}
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
      <DescriptionCorrectionBlock
        descriptionCorrection={descriptionCorrection}
        handleApplyFieldCorrection={async (
          fieldCorrection,
          parentCorrection
        ) => {
          if (cvId && isEdited(cvId, DESCRIPTION_FIELD_KEY)) {
            const ok = await overwriteConfirm(OVERWRITE_MSG);
            if (!ok) return;
          }
          await handleApplyFieldCorrection(fieldCorrection, parentCorrection);
          if (cvId) {
            clearEdited(cvId, DESCRIPTION_FIELD_KEY);
          }
        }}
        handleDismissWritingCorrection={handleDismissWritingCorrection}
        fieldName="description"
        onRetry={onRetry}
        onBack={onBack}
        canGoBack={canGoBack}
        onForward={onForward}
        canGoForward={canGoForward}
        draftIndex={draftIndex}
        draftTotal={draftTotal}
        isRetrying={isRetrying}
        suggestionCardId={buildQualitySuggestionId("personal_info", "single", "personal_info.about_me")}
      />
        {personalInfoCoaching && (
          <CoachingQuestionsPanel coachingItem={personalInfoCoaching} />
        )}
        </Box>
        {cvId && (
          <Box sx={{ flexShrink: 0, position: "relative" }}>
            <Box
              onClick={
                !profilePictureUrl &&
                !profilePictureUploading &&
                !profilePictureDeleting
                  ? () => handleViewModeAddOrReplacePhoto(shape)
                  : undefined
              }
              role={!profilePictureUrl ? "button" : undefined}
              aria-label={!profilePictureUrl ? "Add profile photo" : undefined}
              sx={{
                width: pictureSize,
                height: pictureSize,
                borderRadius: shape === "circle" ? "50%" : 1,
                overflow: "hidden",
                border: "2px dashed",
                borderColor: "divider",
                bgcolor: profilePictureUrl ? "transparent" : "action.selected",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor:
                  !profilePictureUrl &&
                  !profilePictureUploading &&
                  !profilePictureDeleting
                    ? "pointer"
                    : "default",
                "&:hover":
                  !profilePictureUrl &&
                  !profilePictureUploading &&
                  !profilePictureDeleting
                    ? { borderColor: "primary.main", bgcolor: "action.hover" }
                    : undefined,
              }}
            >
              {profilePictureUrl ? (
                <Box
                  component="img"
                  src={profilePictureUrl}
                  alt="Profile"
                  sx={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />
              ) : (
                <AddPhotoIcon
                  sx={{ fontSize: 36, color: "text.disabled" }}
                  aria-hidden
                />
              )}
            </Box>
            <IconButton
              size="small"
              onClick={handleProfilePictureMenuOpen}
              disabled={profilePictureUploading || profilePictureDeleting}
              aria-label="Profile picture menu"
              sx={{
                position: "absolute",
                top: 0,
                right: 0,
                bgcolor: "background.paper",
                "&:hover": { bgcolor: "action.hover" },
                boxShadow: 1,
              }}
            >
              <MoreVertIcon fontSize="small" />
            </IconButton>
            <Menu
              anchorEl={profilePictureMenuAnchor}
              open={Boolean(profilePictureMenuAnchor)}
              onClose={handleProfilePictureMenuClose}
              anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
              transformOrigin={{ vertical: "top", horizontal: "right" }}
            >
              {!profilePictureUrl && (
                <MenuItem
                  onClick={() =>
                    handleViewModeAddOrReplacePhoto(shape)
                  }
                >
                  Add photo
                </MenuItem>
              )}
              {profilePictureUrl && (
                <>
                  <MenuItem
                    onClick={() =>
                      handleViewModeAddOrReplacePhoto(shape)
                    }
                  >
                    Replace photo
                  </MenuItem>
                  <MenuItem
                    onClick={() => handleViewModeChangeSize("small")}
                  >
                    Small size
                  </MenuItem>
                  <MenuItem
                    onClick={() => handleViewModeChangeSize("standard")}
                  >
                    Standard size
                  </MenuItem>
                  <MenuItem
                    onClick={() => handleViewModeChangeSize("large")}
                  >
                    Large size
                  </MenuItem>
                  <MenuItem onClick={handleViewModeRemovePhoto}>
                    Remove photo
                  </MenuItem>
                </>
              )}
            </Menu>
            <input
              ref={viewModeFileInputRef}
              type="file"
              accept=".jpg,.jpeg,.png"
              style={{ display: "none" }}
              onChange={handleViewModeFileChange}
              aria-hidden
            />
          </Box>
        )}
      </Box>
    );
  };

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
      onHide={onHide}
      onDelete={onDelete}
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
