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
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
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

  // Add retry tracking ref
  const retryCountRef = useRef(0);
  const MAX_RETRY_ATTEMPTS = 3;

  // Note: We no longer need pendingClaimFile state since we always use session-based claims

  // Function to handle claiming data from session
  const handleClaimFromSession = useCallback(async (
    cvData: CVPreview | undefined,
    jobPreview: JobPreview | undefined,
    jobUrl?: string,
    jobText?: string
  ) => {
    // Check retry limit
    if (retryCountRef.current >= MAX_RETRY_ATTEMPTS) {
      clearQuickStartSession();
      showError("Maximum retry attempts reached. Please try again with valid data.");
      claimInitiatedRef.current = false;
      retryCountRef.current = 0;
      return;
    }

    retryCountRef.current += 1;
    setClaiming(true);

    try {
      const { cvId, jobDescriptionId } = await claimQuickStartFromSession(cvData, jobPreview, jobUrl, jobText);

      // Success - reset counter and clear session
      retryCountRef.current = 0;
      clearQuickStartSession();

      // Navigate based on what was claimed.
      // IMPORTANT: Quick Start must always send users with a claimed CV to the CV editor, not the dashboard.
      // This is intentional product behavior and should be preserved when refactoring this file or the redirect flow.
      if (cvId) {
        const state = jobDescriptionId
          ? { openAITools: true, jobDescriptionId, autoTriggerEnhancements: true }
          : undefined;
        navigate(`/cv/${cvId}`, state ? { state } : {});
      } else if (jobDescriptionId) {
        navigate('/dashboard');
      } else {
        showError("Failed to save data");
        navigate('/dashboard');
      }
    } catch (error: any) {
      console.error("Failed to claim quick start data from session:", error);

      // Reset refs to allow retry
      claimInitiatedRef.current = false;

      // If we've hit max retries, clear session
      if (retryCountRef.current >= MAX_RETRY_ATTEMPTS) {
        clearQuickStartSession();
        retryCountRef.current = 0;
      }

      showError(error.message || "Failed to save your data. Please try again.");
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

    if (sessionData.previewResponse?.cv_preview || sessionData.previewResponse?.job_preview) {
      // Merge session metadata (including base64) with preview data
      const cvDataWithFile = sessionData.previewResponse?.cv_preview ? {
        ...sessionData.previewResponse.cv_preview,
        cvFileBase64: sessionData.cvFileBase64,
        cvFileName: sessionData.cvFileName,
        cvFileSize: sessionData.cvFileSize,
        cvFileType: sessionData.cvFileType,
      } : undefined;

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
    cvFile?: File;
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
        const cvDataWithFile = storedSession.previewResponse?.cv_preview ? {
          ...storedSession.previewResponse.cv_preview,
          cvFileBase64: storedSession.cvFileBase64,
          cvFileName: storedSession.cvFileName,
          cvFileSize: storedSession.cvFileSize,
          cvFileType: storedSession.cvFileType,
        } : undefined;

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
