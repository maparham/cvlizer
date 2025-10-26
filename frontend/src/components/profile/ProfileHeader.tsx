import React from "react";
import {
  Paper,
  Typography,
  Box,
  Button,
  Avatar,
  Divider,
  Chip,
  Stack,
  IconButton,
  Tooltip,
  Badge,
} from "@mui/material";
import { Edit, Verified, CheckCircle, Warning } from "@mui/icons-material";
import { UserResource } from "@clerk/clerk-react";
import { NavigateFunction } from "react-router-dom";
import { formatDate } from "../../utils/dateFormat";

interface ProfileHeaderProps {
  user: UserResource;
  navigate: NavigateFunction;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({ user, navigate }) => {
  return (
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
  );
};
