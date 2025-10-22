/**
 * Quick Start Page
 *
 * Landing page for the Quick Start wizard that allows users to quickly
 * try the CV optimization service by uploading a CV and providing a job
 * description without requiring authentication upfront.
 *
 * Key responsibilities:
 * - Wrap the QuickStartWizard component
 * - Handle authentication check on completion
 * - Store preview data in sessionStorage if user is not authenticated
 * - Redirect to sign-up/sign-in if needed
 * - Navigate to appropriate next step based on auth status
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Container,
  Box,
  Button,
  Typography,
  CircularProgress,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useNotifications } from "../packages/notifications";
import QuickStartWizard from "../components/quick-start/QuickStartWizard";
import {
  storeQuickStartSession,
  getQuickStartSession,
  clearQuickStartSession,
  claimQuickStartFromSession,
} from "../services/quickStartService";
import {
  QuickStartPreviewResponse,
  CVPreview,
  JobPreview,
} from "../types/quickStart";

const QuickStart: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { showError } = useNotifications();

  // State for managing claim process
  const [claiming, setClaiming] = useState(false);

  // Use ref to track if claim has been initiated to prevent duplicates
  const claimInitiatedRef = useRef(false);

  // Note: We no longer need pendingClaimFile state since we always use session-based claims

  // Function to handle claiming data from session
  const handleClaimFromSession = useCallback(async (
    cvData: CVPreview,
    jobPreview: JobPreview,
    jobUrl?: string,
    jobText?: string
  ) => {
    setClaiming(true);
    try {
      const { cvId, jobDescriptionId } = await claimQuickStartFromSession(cvData, jobPreview, jobUrl, jobText);
      clearQuickStartSession();
      navigate(`/cv/${cvId}`, { state: { openAITools: true, jobDescriptionId } });
    } catch (error: any) {
      console.error("Failed to claim quick start data from session:", error);
      showError(error.message || "Failed to save your data. Please try again.");
      // Reset ref on error so user can try again
      claimInitiatedRef.current = false;
    } finally {
      setClaiming(false);
    }
  }, [navigate, showError]);

  // Auto-claim when user returns after sign-up OR sign-in
  useEffect(() => {
    // Don't try to claim if already initiated (prevents duplicate claims)
    if (claimInitiatedRef.current) {
      return;
    }

    // Don't try to claim if already claiming
    if (claiming) {
      return;
    }

    // Don't run if still loading auth state
    if (authLoading) {
      return;
    }

    // Only run if user is authenticated
    if (!isAuthenticated) {
      return;
    }

    const sessionData = getQuickStartSession();

    if (!sessionData) {
      return;
    }

    // Mark claim as initiated BEFORE calling the async function to prevent duplicates
    claimInitiatedRef.current = true;

    if (sessionData.previewResponse?.cv_preview) {
      // Merge session metadata (including base64) with preview data
      const cvDataWithFile = {
        ...sessionData.previewResponse.cv_preview,
        cvFileBase64: sessionData.cvFileBase64,
        cvFileName: sessionData.cvFileName,
        cvFileSize: sessionData.cvFileSize,
        cvFileType: sessionData.cvFileType,
      };

      // Use session-based claim for consistency
      handleClaimFromSession(
        cvDataWithFile,
        sessionData.previewResponse.job_preview,
        sessionData.jobUrl,
        sessionData.jobText
      );
    } else {
      // Clear stale session data
      clearQuickStartSession();
      // Reset the ref since we didn't actually claim
      claimInitiatedRef.current = false;
    }
  }, [isAuthenticated, authLoading, handleClaimFromSession]);

  const handleWizardComplete = async (data: {
    cvFile: File;
    jobUrl?: string;
    jobText?: string;
    previewResponse: QuickStartPreviewResponse;
  }) => {
    // Clear any stale session data first to prevent interference
    clearQuickStartSession();

    // Store fresh session data for both authentication scenarios
    try {
      await storeQuickStartSession(data);
    } catch (error: any) {
      showError(error.message || "Failed to store session data");
      return;
    }

    if (isAuthenticated) {
      // User is already authenticated, immediately claim using session data
      // Retrieve the stored session data (which now includes base64)
      const storedSession = getQuickStartSession();
      if (storedSession) {
        // Merge session metadata (including base64) with preview data
        const cvDataWithFile = {
          ...data.previewResponse.cv_preview,
          cvFileBase64: storedSession.cvFileBase64,
          cvFileName: storedSession.cvFileName,
          cvFileSize: storedSession.cvFileSize,
          cvFileType: storedSession.cvFileType,
        };

        handleClaimFromSession(
          cvDataWithFile,
          data.previewResponse.job_preview,
          data.jobUrl,
          data.jobText
        );
      }
    }
    // If not authenticated, the sign-up buttons will be shown in the wizard itself
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4, textAlign: "center" }}>
        <Typography
          variant="h3"
          component="h1"
          gutterBottom
          sx={{
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            backgroundClip: "text",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Try CV Optimizer
        </Typography>
        <Typography variant="h6" color="text.secondary">
          See how AI can enhance your CV in just a few clicks
        </Typography>
      </Box>

      {/* Wizard */}
      <QuickStartWizard onComplete={handleWizardComplete} />

      {/* Back to Home */}
      <Box sx={{ mt: 4, textAlign: "center" }}>
        <Button variant="text" onClick={() => navigate("/")}>
          ← Back to Home
        </Button>
      </Box>

      {/* Loading Overlay for Claim Process */}
      {claiming && (
        <Box
          sx={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            bgcolor: "rgba(255,255,255,0.9)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Box sx={{ textAlign: "center" }}>
            <CircularProgress />
            <Typography sx={{ mt: 2 }}>
              Saving your CV and job description...
            </Typography>
          </Box>
        </Box>
      )}
    </Container>
  );
};

export default QuickStart;
