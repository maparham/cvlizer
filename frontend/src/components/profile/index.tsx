import React from "react";
import { Container, Typography, Box } from "@mui/material";
import { useUser } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import { ProfileHeader } from "./ProfileHeader";
import { ProfileInformationCards } from "./ProfileInformationCards";
import { ProfileUserProfile } from "./ProfileUserProfile";
import { DeleteAccountSection } from "./DeleteAccountSection";

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
        <ProfileHeader user={user} navigate={navigate} />

        <ProfileInformationCards user={user} />

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

        <ProfileUserProfile />

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

        <DeleteAccountSection />
      </Box>
    </Container>
  );
};

export default Profile;
