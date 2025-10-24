import React from "react";
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  Avatar,
  Grid,
  Card,
  CardContent,
  Divider,
  Chip,
  Stack,
  IconButton,
  Tooltip,
  Badge,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useUser, UserProfile } from "@clerk/clerk-react";
import {
  Person,
  Email,
  CalendarToday,
  Settings,
  Edit,
  Verified,
  CheckCircle,
  Warning,
} from "@mui/icons-material";
import { formatDate } from "../utils/dateFormat";
import { DeleteAccountButton } from "../components/common/DeleteAccountButton";

const Profile: React.FC = () => {
  const { user, isLoaded } = useUser();
  const navigate = useNavigate();

  if (!isLoaded) {
    return (
      <Container component="main" maxWidth="md">
        <Box sx={{ display: "flex", justifyContent: "center", mt: 8 }}>
          <Typography>Loading...</Typography>
        </Box>
      </Container>
    );
  }

  if (!user) {
    navigate("/login");
    return null;
  }

  return (
    <Container component="main" maxWidth="md">
      {/* Global CSS to hide Clerk's delete account button */}
      <style>
        {`
          /* Hide Clerk's delete account button and section */
          .cl-profileSectionPrimaryButton__danger,
          .cl-profileSection__danger,
          button[data-localization-key="userProfile.start.dangerSection.deleteAccountButton"],
          [data-localization-key="userProfile.start.dangerSection.title"],
          .cl-profileSectionTitle__danger,
          .cl-profileSectionHeader__danger {
            display: none !important;
          }
        `}
      </style>
      <Box sx={{ mt: 6, mb: 6 }}>
        {/* Header */}
        <Paper
          elevation={2}
          sx={{
            p: 5,
            mb: 4,
            borderRadius: 4,
            background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)",
            border: "1px solid",
            borderColor: "divider",
            boxShadow: 3,
            "&:hover": {
              boxShadow: 6
            },
            transition: "box-shadow 0.3s ease-in-out"
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              mb: 3,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <Badge
                overlap="circular"
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                badgeContent={
                  <Tooltip
                    title={
                      user.primaryEmailAddress?.verification?.status ===
                      "verified"
                        ? "Email Verified"
                        : "Email Not Verified"
                    }
                  >
                    {user.primaryEmailAddress?.verification?.status ===
                    "verified" ? (
                      <CheckCircle
                        sx={{ color: "success.main", fontSize: 20 }}
                      />
                    ) : (
                      <Warning sx={{ color: "warning.main", fontSize: 20 }} />
                    )}
                  </Tooltip>
                }
              >
                <Avatar
                  src={user.imageUrl}
                  sx={{
                    width: 100,
                    height: 100,
                    mr: 3,
                    border: "4px solid white",
                    boxShadow: 2,
                  }}
                />
              </Badge>
              <Box>
                <Typography
                  variant="h4"
                  component="h1"
                  gutterBottom
                  sx={{
                    fontWeight: 700,
                    color: "text.primary",
                    letterSpacing: "-0.025em"
                  }}
                >
                  {user.fullName || user.firstName || "User Profile"}
                </Typography>
                <Stack
                  direction="row"
                  spacing={1}
                  alignItems="center"
                  sx={{ mb: 1 }}
                >
                  <Typography variant="body1" color="text.secondary">
                    {user.primaryEmailAddress?.emailAddress}
                  </Typography>
                  {user.primaryEmailAddress?.verification?.status ===
                    "verified" && (
                    <Chip
                      icon={<Verified />}
                      label="Verified"
                      size="small"
                      color="success"
                      variant="outlined"
                    />
                  )}
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  Member since{" "}
                  {user.createdAt ? formatDate(user.createdAt) : "Unknown"}
                </Typography>
              </Box>
            </Box>

            <Box>
              <Tooltip title="Edit Profile">
                <IconButton
                  color="primary"
                  sx={{ mr: 1 }}
                  onClick={() => {
                    const profileSection = document.querySelector(
                      "[data-clerk-profile]",
                    );
                    if (profileSection) {
                      profileSection.scrollIntoView({ behavior: "smooth" });
                    }
                  }}
                >
                  <Edit />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>

          <Stack direction="row" spacing={3} flexWrap="wrap">
            <Button
              variant="outlined"
              onClick={() => navigate("/dashboard")}
              sx={{
                fontWeight: 600,
                textTransform: "none",
                px: 4,
                py: 1.5,
                borderRadius: 3,
                "&:hover": {
                  backgroundColor: "action.hover"
                }
              }}
            >
              Back to Dashboard
            </Button>
            <Button
              variant="contained"
              onClick={() => {
                const profileSection = document.querySelector(
                  "[data-clerk-profile]",
                );
                if (profileSection) {
                  profileSection.scrollIntoView({ behavior: "smooth" });
                }
              }}
              sx={{
                fontWeight: 600,
                textTransform: "none",
                px: 4,
                py: 1.5,
                borderRadius: 3,
                boxShadow: 2,
                "&:hover": {
                  boxShadow: 4,
                  transform: "translateY(-1px)"
                },
                transition: "all 0.2s ease-in-out"
              }}
            >
              Edit Profile
            </Button>
          </Stack>
        </Paper>

        {/* Profile Information Cards */}
        <Grid container spacing={4} sx={{ mb: 8 }}>
          <Grid item xs={12} md={6}>
            <Card
              sx={{
                height: "100%",
                borderRadius: 3,
                border: "1px solid",
                borderColor: "divider",
                boxShadow: 2,
                transition: "all 0.3s ease-in-out",
                "&:hover": {
                  transform: "translateY(-4px)",
                  boxShadow: 6,
                  borderColor: "primary.light"
                },
              }}
            >
              <CardContent sx={{ p: 4 }}>
                <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
                  <Person sx={{ mr: 2, color: "primary.main", fontSize: 32 }} />
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 700,
                      color: "text.primary",
                      letterSpacing: "-0.025em"
                    }}
                  >
                    Personal Information
                  </Typography>
                </Box>
                <Divider sx={{ mb: 3 }} />
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  First Name
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {user.firstName || "Not provided"}
                </Typography>

                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Last Name
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {user.lastName || "Not provided"}
                </Typography>

                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Username
                </Typography>
                <Typography variant="body1">
                  {user.username || "Not set"}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card
              sx={{
                height: "100%",
                borderRadius: 3,
                border: "1px solid",
                borderColor: "divider",
                boxShadow: 2,
                transition: "all 0.3s ease-in-out",
                "&:hover": {
                  transform: "translateY(-4px)",
                  boxShadow: 6,
                  borderColor: "primary.light"
                },
              }}
            >
              <CardContent sx={{ p: 4 }}>
                <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
                  <Email sx={{ mr: 2, color: "primary.main", fontSize: 32 }} />
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 700,
                      color: "text.primary",
                      letterSpacing: "-0.025em"
                    }}
                  >
                    Contact Information
                  </Typography>
                </Box>
                <Divider sx={{ mb: 3 }} />
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Primary Email
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {user.primaryEmailAddress?.emailAddress}
                </Typography>

                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Email Verified
                </Typography>
                <Box sx={{ mb: 2 }}>
                  <Chip
                    icon={
                      user.primaryEmailAddress?.verification?.status ===
                      "verified" ? (
                        <CheckCircle />
                      ) : (
                        <Warning />
                      )
                    }
                    label={
                      user.primaryEmailAddress?.verification?.status ===
                      "verified"
                        ? "Verified"
                        : "Not Verified"
                    }
                    color={
                      user.primaryEmailAddress?.verification?.status ===
                      "verified"
                        ? "success"
                        : "warning"
                    }
                    size="small"
                  />
                </Box>

                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Phone Number
                </Typography>
                <Typography variant="body1">
                  {user.primaryPhoneNumber?.phoneNumber || "Not provided"}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card
              sx={{
                height: "100%",
                borderRadius: 3,
                border: "1px solid",
                borderColor: "divider",
                boxShadow: 2,
                transition: "all 0.3s ease-in-out",
                "&:hover": {
                  transform: "translateY(-4px)",
                  boxShadow: 6,
                  borderColor: "primary.light"
                },
              }}
            >
              <CardContent sx={{ p: 4 }}>
                <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
                  <CalendarToday
                    sx={{ mr: 2, color: "primary.main", fontSize: 32 }}
                  />
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 700,
                      color: "text.primary",
                      letterSpacing: "-0.025em"
                    }}
                  >
                    Account Details
                  </Typography>
                </Box>
                <Divider sx={{ mb: 3 }} />
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Account Created
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {user.createdAt ? formatDate(user.createdAt) : "Unknown"}
                </Typography>

                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Last Updated
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {user.updatedAt ? formatDate(user.updatedAt) : "Unknown"}
                </Typography>

                <Typography variant="body2" color="text.secondary" gutterBottom>
                  User ID
                </Typography>
                <Typography
                  variant="body1"
                  sx={{ fontFamily: "monospace", fontSize: "0.875rem" }}
                >
                  {user.id}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card
              sx={{
                height: "100%",
                borderRadius: 3,
                border: "1px solid",
                borderColor: "divider",
                boxShadow: 2,
                transition: "all 0.3s ease-in-out",
                "&:hover": {
                  transform: "translateY(-4px)",
                  boxShadow: 6,
                  borderColor: "primary.light"
                },
              }}
            >
              <CardContent sx={{ p: 4 }}>
                <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
                  <Settings
                    sx={{ mr: 2, color: "primary.main", fontSize: 32 }}
                  />
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 700,
                      color: "text.primary",
                      letterSpacing: "-0.025em"
                    }}
                  >
                    Account Settings
                  </Typography>
                </Box>
                <Divider sx={{ mb: 3 }} />
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 3 }}
                >
                  Manage your account settings, security preferences, and
                  profile information using our secure interface below.
                </Typography>
                <Button
                  variant="contained"
                  fullWidth
                  onClick={() => {
                    const profileSection = document.querySelector(
                      "[data-clerk-profile]",
                    );
                    if (profileSection) {
                      profileSection.scrollIntoView({ behavior: "smooth" });
                    }
                  }}
                  sx={{
                    fontWeight: 600,
                    textTransform: "none",
                    py: 1.5,
                    borderRadius: 3,
                    boxShadow: 2,
                    "&:hover": {
                      boxShadow: 4,
                      transform: "translateY(-1px)"
                    },
                    transition: "all 0.2s ease-in-out"
                  }}
                >
                  Go to Account Settings
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Visual Separator */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            my: 6,
            "&::before": {
              content: '""',
              flex: 1,
              height: "1px",
              background:
                "linear-gradient(to right, transparent, #e0e0e0, transparent)",
            },
          }}
        >
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mx: 3, fontWeight: 500 }}
          >
            ACCOUNT MANAGEMENT
          </Typography>
        </Box>

        {/* Clerk's UserProfile Component */}
        <Paper
          elevation={3}
          sx={{
            p: 5,
            borderRadius: 4,
            background: "linear-gradient(145deg, #ffffff 0%, #f8f9fa 100%)",
            border: "1px solid",
            borderColor: "divider",
            boxShadow: 3,
            "&:hover": {
              boxShadow: 6
            },
            transition: "box-shadow 0.3s ease-in-out"
          }}
          data-clerk-profile
        >
          <Box sx={{ textAlign: "center", mb: 5 }}>
            <Typography
              variant="h5"
              component="h2"
              gutterBottom
              sx={{
                fontWeight: 700,
                color: "text.primary",
                letterSpacing: "-0.025em"
              }}
            >
              Account Management
            </Typography>
            <Typography
              variant="body1"
              color="text.secondary"
              sx={{
                maxWidth: 600,
                mx: "auto",
                lineHeight: 1.6,
                fontSize: "1.1rem"
              }}
            >
              Update your profile information, manage security settings, and
              configure your account preferences using our secure interface.
            </Typography>
          </Box>
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              "& .cl-userProfile": {
                maxWidth: "100%",
                width: "100%",
                // Hide any delete account related elements
                "& button[data-localization-key*='deleteAccount']": {
                  display: "none !important",
                },
                "& [data-localization-key*='deleteAccount']": {
                  display: "none !important",
                },
                "& button:contains('Delete')": {
                  display: "none !important",
                },
                "& button:contains('delete')": {
                  display: "none !important",
                },
              },
            }}
          >
            <UserProfile
              routing="virtual"
              appearance={{
                elements: {
                  card: {
                    boxShadow: "none",
                    border: "1px solid #e0e0e0",
                  },
                  headerTitle: {
                    fontSize: "1.25rem",
                    fontWeight: "bold",
                  },
                  headerSubtitle: {
                    color: "#666",
                  },
                  // Hide delete account button using CSS
                  "button[data-localization-key='userProfile.navbar.deleteAccount']": {
                    display: "none !important",
                  },
                  "button[data-localization-key='userProfile.navbar.deleteAccountButton']": {
                    display: "none !important",
                  },
                  // Hide delete account page content
                  "div[data-localization-key='userProfile.deleteAccountPage.title']": {
                    display: "none !important",
                  },
                  "div[data-localization-key='userProfile.deleteAccountPage.subtitle']": {
                    display: "none !important",
                  },
                  // Hide any button containing "delete" text
                  "button:contains('Delete')": {
                    display: "none !important",
                  },
                  "button:contains('delete')": {
                    display: "none !important",
                  },
                },
              }}
            />
          </Box>
        </Paper>

        {/* Visual Separator */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            my: 6,
            "&::before": {
              content: '""',
              flex: 1,
              height: "1px",
              background:
                "linear-gradient(to right, transparent, #e0e0e0, transparent)",
            },
          }}
        >
        </Box>

        {/* Custom Delete Account Section */}
        <Paper
          elevation={3}
          sx={{
            p: 4,
            borderRadius: 3,
            border: "2px solid",
            borderColor: "error.main",
            background: "linear-gradient(145deg, #fff5f5 0%, #ffffff 100%)",
          }}
        >
          <Box sx={{ textAlign: "center", mb: 3 }}>
            <Typography
              variant="h5"
              component="h2"
              gutterBottom
              sx={{ fontWeight: "bold", color: "error.main" }}
            >
              Delete Account
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ maxWidth: 600, mx: "auto" }}
            >
              Once you delete your account, there is no going back. This action
              permanently removes all your data including CVs, job descriptions,
              and AI-generated content.
            </Typography>
          </Box>
          <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
            <DeleteAccountButton variant="contained" size="large" />
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default Profile;
