/**
 * JobDescriptionSummary Component Tests - Simplified Version
 * 
 * Basic unit tests for the JobDescriptionSummary component focusing on core functionality
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import JobDescriptionSummary from '../../../../components/cv/ai/JobDescriptionSummary';
import { JobDescription } from '../../../../types/ai';

// Mock the AI store and selectors
jest.mock('../../../../stores/aiStore', () => ({
  useAIStore: jest.fn(),
  useVisibleJobDescriptions: jest.fn(),
  useJobDescriptions: jest.fn(),
  useActiveJobDescription: jest.fn(),
}));

// Mock the notifications store
jest.mock('../../../../stores/uiStore', () => ({
  useNotifications: jest.fn(),
}));

// Mock the AI service
jest.mock('../../../../services/aiService', () => ({
  aiService: {
    parseJobDescriptionUrl: jest.fn(),
  },
}));

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

const theme = createTheme();

// Test data
const mockJobDescription: JobDescription = {
  id: 'jd-1',
  cv_id: 'cv-1',
  content: 'Test job description content',
  title: 'Software Engineer',
  company: 'Test Company',
  location: 'San Francisco, CA',
  source_url: 'https://example.com/job',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('JobDescriptionSummary - Basic Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  it('renders without crashing', () => {
    const { useAIStore, useVisibleJobDescriptions, useJobDescriptions, useActiveJobDescription } = require('../../../../stores/aiStore');
    const { useNotifications } = require('../../../../stores/uiStore');

    useAIStore.mockReturnValue({
      hideJobDescriptionFromSidebar: jest.fn(),
      setActiveJobDescription: jest.fn(),
      createJobDescription: jest.fn(),
      createJobFitDraft: jest.fn(),
    });

    useVisibleJobDescriptions.mockReturnValue([]);
    useJobDescriptions.mockReturnValue([]);
    useActiveJobDescription.mockReturnValue(undefined);

    useNotifications.mockReturnValue({
      showSuccess: jest.fn(),
      showError: jest.fn(),
    });

    renderWithTheme(
      <JobDescriptionSummary cvId="cv-1" />
    );

    expect(screen.getByText('Job Descriptions')).toBeInTheDocument();
  });

  it('shows "No Job Description Yet" when no job descriptions exist', () => {
    const { useAIStore, useVisibleJobDescriptions, useJobDescriptions, useActiveJobDescription } = require('../../../../stores/aiStore');
    const { useNotifications } = require('../../../../stores/uiStore');

    useAIStore.mockReturnValue({
      hideJobDescriptionFromSidebar: jest.fn(),
      setActiveJobDescription: jest.fn(),
      createJobDescription: jest.fn(),
      createJobFitDraft: jest.fn(),
    });

    useVisibleJobDescriptions.mockReturnValue([]);
    useJobDescriptions.mockReturnValue([]);
    useActiveJobDescription.mockReturnValue(undefined);

    useNotifications.mockReturnValue({
      showSuccess: jest.fn(),
      showError: jest.fn(),
    });

    renderWithTheme(
      <JobDescriptionSummary cvId="cv-1" />
    );

    expect(screen.getByText('No Job Description Yet')).toBeInTheDocument();
    expect(screen.getByText('Add Job Description')).toBeInTheDocument();
  });

  it('shows active job description when one is selected', () => {
    const { useAIStore, useVisibleJobDescriptions, useJobDescriptions, useActiveJobDescription } = require('../../../../stores/aiStore');
    const { useNotifications } = require('../../../../stores/uiStore');

    useAIStore.mockReturnValue({
      hideJobDescriptionFromSidebar: jest.fn(),
      setActiveJobDescription: jest.fn(),
      createJobDescription: jest.fn(),
      createJobFitDraft: jest.fn(),
    });

    useVisibleJobDescriptions.mockReturnValue([mockJobDescription]);
    useJobDescriptions.mockReturnValue([mockJobDescription]);
    useActiveJobDescription.mockReturnValue(mockJobDescription);

    useNotifications.mockReturnValue({
      showSuccess: jest.fn(),
      showError: jest.fn(),
    });

    renderWithTheme(
      <JobDescriptionSummary cvId="cv-1" />
    );

    expect(screen.getByText('Software Engineer')).toBeInTheDocument();
    expect(screen.getByText('Test Company')).toBeInTheDocument();
    expect(screen.getByText('Test job description content')).toBeInTheDocument();
  });

  it('shows correct count in Manage button', () => {
    const { useAIStore, useVisibleJobDescriptions, useJobDescriptions, useActiveJobDescription } = require('../../../../stores/aiStore');
    const { useNotifications } = require('../../../../stores/uiStore');

    useAIStore.mockReturnValue({
      hideJobDescriptionFromSidebar: jest.fn(),
      setActiveJobDescription: jest.fn(),
      createJobDescription: jest.fn(),
      createJobFitDraft: jest.fn(),
    });

    useVisibleJobDescriptions.mockReturnValue([]);
    useJobDescriptions.mockReturnValue([mockJobDescription, mockJobDescription]);
    useActiveJobDescription.mockReturnValue(undefined);

    useNotifications.mockReturnValue({
      showSuccess: jest.fn(),
      showError: jest.fn(),
    });

    renderWithTheme(
      <JobDescriptionSummary cvId="cv-1" />
    );

    expect(screen.getByText('Manage (2)')).toBeInTheDocument();
  });

  it('calls hideJobDescriptionFromSidebar when X button is clicked', () => {
    const { useAIStore, useVisibleJobDescriptions, useJobDescriptions, useActiveJobDescription } = require('../../../../stores/aiStore');
    const { useNotifications } = require('../../../../stores/uiStore');

    const mockHideJobDescriptionFromSidebar = jest.fn();

    useAIStore.mockReturnValue({
      hideJobDescriptionFromSidebar: mockHideJobDescriptionFromSidebar,
      setActiveJobDescription: jest.fn(),
      createJobDescription: jest.fn(),
      createJobFitDraft: jest.fn(),
    });

    useVisibleJobDescriptions.mockReturnValue([mockJobDescription]);
    useJobDescriptions.mockReturnValue([mockJobDescription]);
    useActiveJobDescription.mockReturnValue(mockJobDescription);

    useNotifications.mockReturnValue({
      showSuccess: jest.fn(),
      showError: jest.fn(),
    });

    renderWithTheme(
      <JobDescriptionSummary cvId="cv-1" />
    );

    const hideButton = screen.getByLabelText('Remove from sidebar');
    fireEvent.click(hideButton);

    expect(mockHideJobDescriptionFromSidebar).toHaveBeenCalledWith('jd-1');
  });

  it('opens edit dialog when edit button is clicked', () => {
    const { useAIStore, useVisibleJobDescriptions, useJobDescriptions, useActiveJobDescription } = require('../../../../stores/aiStore');
    const { useNotifications } = require('../../../../stores/uiStore');

    useAIStore.mockReturnValue({
      hideJobDescriptionFromSidebar: jest.fn(),
      setActiveJobDescription: jest.fn(),
      createJobDescription: jest.fn(),
      createJobFitDraft: jest.fn(),
    });

    useVisibleJobDescriptions.mockReturnValue([mockJobDescription]);
    useJobDescriptions.mockReturnValue([mockJobDescription]);
    useActiveJobDescription.mockReturnValue(mockJobDescription);

    useNotifications.mockReturnValue({
      showSuccess: jest.fn(),
      showError: jest.fn(),
    });

    renderWithTheme(
      <JobDescriptionSummary cvId="cv-1" />
    );

    const editButton = screen.getByLabelText('Edit');
    fireEvent.click(editButton);

    expect(screen.getByText('Edit Job Description')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Software Engineer')).toBeInTheDocument();
  });

  it('calls onGenerateSuggestions when Enhance CV button is clicked', () => {
    const { useAIStore, useVisibleJobDescriptions, useJobDescriptions, useActiveJobDescription } = require('../../../../stores/aiStore');
    const { useNotifications } = require('../../../../stores/uiStore');

    const mockOnGenerateSuggestions = jest.fn();

    useAIStore.mockReturnValue({
      hideJobDescriptionFromSidebar: jest.fn(),
      setActiveJobDescription: jest.fn(),
      createJobDescription: jest.fn(),
      createJobFitDraft: jest.fn(),
    });

    useVisibleJobDescriptions.mockReturnValue([mockJobDescription]);
    useJobDescriptions.mockReturnValue([mockJobDescription]);
    useActiveJobDescription.mockReturnValue(mockJobDescription);

    useNotifications.mockReturnValue({
      showSuccess: jest.fn(),
      showError: jest.fn(),
    });

    renderWithTheme(
      <JobDescriptionSummary 
        cvId="cv-1" 
        onGenerateSuggestions={mockOnGenerateSuggestions}
      />
    );

    const enhanceButton = screen.getByText('Enhance CV');
    fireEvent.click(enhanceButton);

    expect(mockOnGenerateSuggestions).toHaveBeenCalled();
  });
});
