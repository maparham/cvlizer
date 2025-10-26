import React from "react";
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  Chip,
} from "@mui/material";
import {
  Person,
  Email,
  CalendarToday,
  Settings,
  CheckCircle,
  Warning,
} from "@mui/icons-material";
import { UserResource } from "@clerk/clerk-react";
import { formatDate } from "../../utils/dateFormat";

interface ProfileInformationCardsProps {
  user: UserResource;
}

export const ProfileInformationCards: React.FC<ProfileInformationCardsProps> = ({
  user,
}) => {
  return (
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
  );
};
