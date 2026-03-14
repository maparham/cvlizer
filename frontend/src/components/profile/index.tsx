import React, { useEffect, useRef } from "react";
import { Container, Typography, Box, Link } from "@mui/material";
import { useUser } from "@clerk/clerk-react";
import { useNavigate, useLocation, Link as RouterLink } from "react-router-dom";
import { ProfileHeader } from "./ProfileHeader";
import { ProfileInformationCards } from "./ProfileInformationCards";
import { ProfileUsageCard } from "./ProfileUsageCard";
import { ProfileUserProfile } from "./ProfileUserProfile";
import { DeleteAccountSection } from "./DeleteAccountSection";

const Profile: React.FC = () => {
  const { user, isLoaded } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const usageSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (location.hash === "#usage" && usageSectionRef.current) {
      usageSectionRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [location.hash]);

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

        <Box id="usage" ref={usageSectionRef} sx={{ mb: 6 }}>
          <ProfileUsageCard />
        </Box>

        <Box sx={{ mb: 2 }}>
          <Link
            component={RouterLink}
            to="/legal"
            variant="body2"
            color="primary"
            sx={{ textDecoration: "none", "&:hover": { textDecoration: "underline" } }}
          >
            Privacy & Terms
          </Link>
        </Box>

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
