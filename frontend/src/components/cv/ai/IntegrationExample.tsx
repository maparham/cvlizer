/**
 * Integration Example Component
 * 
 * This component demonstrates how to integrate the AI suggestions inline diff system
 * into existing CV editing workflows. It shows the minimal changes needed to add
 * AI suggestion capabilities to any CV editor implementation.
 * 
 * Key demonstrations:
 * - Basic AI suggestion generation
 * - Handling suggestion acceptance/rejection
 * - Managing diff mode state
 * - Error handling and user feedback
 * - Integration with existing CV data flow
 * 
 * Usage:
 * - Copy patterns from this example for your own implementations
 * - Use as reference for common integration scenarios
 * - Test different suggestion types and interactions
 */

import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Alert,
  CircularProgress,
  Stack,
} from '@mui/material';
import { AutoFixHigh, ExitToApp, Save } from '@mui/icons-material';
import { InlineDiffProvider, useInlineDiffContext } from '../../../contexts/InlineDiffContext';

// Mock CV data for demonstration
const mockCVData = {
  skills: {
    technical: ['JavaScript', 'React', 'Node.js'],
    soft: ['Communication', 'Leadership']
  },
  professional_summary: {
    content: 'Experienced software developer with 5 years in web development.'
  },
};

// Mock job description
const mockJobDescription = {
  id: 'job-1',
  title: 'Senior React Developer',
  company: 'Tech Company',
  content: 'Looking for a Senior React Developer with TypeScript, GraphQL, and team leadership experience.',
};

/**
 * Inner component that uses the diff context
 */
const AIIntegrationDemo: React.FC = () => {
  const [cvData, setCvData] = useState(mockCVData);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const {
    isInDiffMode,
    suggestions: _suggestions,
    generateSuggestions: _generateSuggestions,
    exitDiffMode,
    commitChanges,
    getPendingSuggestionsCount,
    getApprovedSuggestionsCount,
  } = useInlineDiffContext();

  const handleGenerateSuggestions = async () => {
    setIsLoading(true);
    setMessage(null);

    try {
      // In a real implementation, you would call:
      // await generateSuggestions(cvId, jobDescriptionId);
      
      // For demo purposes, we'll simulate the process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock suggestions would be generated here
      setMessage('AI suggestions generated successfully!');
    } catch (error) {
      setMessage('Failed to generate suggestions. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCommitChanges = () => {
    const finalData = commitChanges();
    if (finalData) {
      setCvData(finalData);
      setMessage('Changes applied successfully!');
    }
  };

  const handleExitDiffMode = () => {
    exitDiffMode();
    setMessage('Exited diff mode. Changes discarded.');
  };

  const pendingCount = getPendingSuggestionsCount();
  const approvedCount = getApprovedSuggestionsCount();

  return (
    <Box sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom>
        AI Suggestions Integration Demo
      </Typography>

      <Typography variant="body1" sx={{ mb: 3, color: 'text.secondary' }}>
        This demo shows how to integrate AI suggestions with your CV editor.
        Click "Generate AI Suggestions" to see the inline diff system in action.
      </Typography>

      {/* Status Card */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            System Status
          </Typography>
          <Stack direction="row" spacing={2} alignItems="center">
            <Typography variant="body2">
              Mode: {isInDiffMode ? 'Diff Mode' : 'Normal Editing'}
            </Typography>
            {isInDiffMode && (
              <>
                <Typography variant="body2" color="warning.main">
                  Pending: {pendingCount}
                </Typography>
                <Typography variant="body2" color="success.main">
                  Approved: {approvedCount}
                </Typography>
              </>
            )}
          </Stack>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        {!isInDiffMode ? (
          <Button
            variant="contained"
            startIcon={<AutoFixHigh />}
            onClick={handleGenerateSuggestions}
            disabled={isLoading}
          >
            {isLoading ? <CircularProgress size={20} /> : 'Generate AI Suggestions'}
          </Button>
        ) : (
          <>
            <Button
              variant="contained"
              color="success"
              startIcon={<Save />}
              onClick={handleCommitChanges}
              disabled={approvedCount === 0}
            >
              Apply Changes ({approvedCount})
            </Button>
            <Button
              variant="outlined"
              startIcon={<ExitToApp />}
              onClick={handleExitDiffMode}
            >
              Cancel & Exit
            </Button>
          </>
        )}
      </Stack>

      {/* Message Display */}
      {message && (
        <Alert 
          severity={message.includes('Failed') ? 'error' : 'success'} 
          sx={{ mb: 3 }}
          onClose={() => setMessage(null)}
        >
          {message}
        </Alert>
      )}

      {/* CV Data Display */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Current CV Data
          </Typography>
          
          {/* Skills Section */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
              Technical Skills
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {cvData.skills.technical.map((skill, index) => (
                <Box
                  key={index}
                  sx={{
                    px: 1.5,
                    py: 0.5,
                    bgcolor: 'primary.light',
                    color: 'primary.contrastText',
                    borderRadius: 1,
                    fontSize: '0.875rem',
                  }}
                >
                  {skill}
                </Box>
              ))}
            </Box>
          </Box>

          {/* Soft Skills Section */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
              Soft Skills
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {cvData.skills.soft.map((skill, index) => (
                <Box
                  key={index}
                  sx={{
                    px: 1.5,
                    py: 0.5,
                    bgcolor: 'secondary.light',
                    color: 'secondary.contrastText',
                    borderRadius: 1,
                    fontSize: '0.875rem',
                  }}
                >
                  {skill}
                </Box>
              ))}
            </Box>
          </Box>

          {/* Professional Summary */}
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
              Professional Summary
            </Typography>
            <Typography variant="body2">
              {cvData.professional_summary.content}
            </Typography>
          </Box>
        </CardContent>
      </Card>

      {/* Job Description Display */}
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Target Job Description
          </Typography>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            {mockJobDescription.title} at {mockJobDescription.company}
          </Typography>
          <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
            {mockJobDescription.content}
          </Typography>
        </CardContent>
      </Card>

      {/* Integration Notes */}
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Integration Notes
          </Typography>
          <Typography variant="body2" component="div">
            <strong>Key Integration Points:</strong>
            <ul>
              <li>Wrap your CV editor with <code>InlineDiffProvider</code></li>
              <li>Use <code>generateSuggestions(cvId, jobDescriptionId)</code> to start diff mode</li>
              <li>Replace section components with <code>SectionFactory</code> for automatic diff support</li>
              <li>Handle <code>commitChanges()</code> to apply approved suggestions to your CV data</li>
              <li>Use <code>exitDiffMode()</code> to cancel and return to normal editing</li>
            </ul>
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

/**
 * Main example component with provider wrapper
 */
const IntegrationExample: React.FC = () => {
  return (
    <InlineDiffProvider>
      <AIIntegrationDemo />
    </InlineDiffProvider>
  );
};

export default IntegrationExample;
