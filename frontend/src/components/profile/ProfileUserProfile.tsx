import React from "react";
import { Paper, Typography, Box } from "@mui/material";
import { UserProfile } from "@clerk/clerk-react";

export const ProfileUserProfile: React.FC = () => {
  return (
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
  );
};
