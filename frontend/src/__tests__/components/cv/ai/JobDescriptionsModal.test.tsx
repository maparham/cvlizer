/**
 * JobDescriptionsModal Component Tests
 * 
 * Comprehensive unit tests for the JobDescriptionsModal component covering:
 * - Modal opening and job description loading
 * - Job description selection and sidebar visibility
 * - Edit and delete functionality
 * - URL parsing and text input tabs
 * - Error handling and loading states
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import JobDescriptionsModal from '../../../../components/cv/ai/JobDescriptionsModal';
import { useAIStore, useJobDescriptions, useActiveJobDescription } from '../../../../stores/aiStore';
import { useNotifications } from '../../../../stores/uiStore';
import { JobDescription } from '../../../../types/ai';
import { aiService } from '../../../../services/aiService';

// Mock the AI store
jest.mock('../../../../stores/aiStore');
const mockUseAIStore = useAIStore as jest.MockedFunction<typeof useAIStore>;
const mockUseJobDescriptions = useJobDescriptions as jest.MockedFunction<typeof useJobDescriptions>;
const mockUseActiveJobDescription = useActiveJobDescription as jest.MockedFunction<typeof useActiveJobDescription>;

// Mock the notifications store
jest.mock('../../../../stores/uiStore');
const mockUseNotifications = useNotifications as jest.MockedFunction<typeof useNotifications>;

// Mock the AI service
jest.mock('../../../../services/aiService', () => ({
  aiService: {
    parseJobDescriptionUrl: jest.fn(),
  },
}));

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

const mockJobDescription2: JobDescription = {
  id: 'jd-2',
  cv_id: 'cv-1',
  content: 'Another job description content',
  title: 'Product Manager',
  company: 'Another Company',
  location: 'New York, NY',
  created_at: '2024-01-02T00:00:00Z',
  updated_at: '2024-01-02T00:00:00Z',
};

const defaultMockStore = {
  loadJobDescriptions: jest.fn(),
  createJobDescription: jest.fn(),
  deleteJobDescription: jest.fn(),
  setActiveJobDescription: jest.fn(),
  showJobDescriptionInSidebar: jest.fn(),
};

const defaultMockNotifications = {
  showSuccess: jest.fn(),
  showError: jest.fn(),
};

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('JobDescriptionsModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set up default mock return values
    mockUseJobDescriptions.mockReturnValue([]);
    mockUseActiveJobDescription.mockReturnValue(undefined);
  });

  describe('Modal Opening and Loading', () => {
    it('opens modal and loads job descriptions when opened', () => {
      const mockLoadJobDescriptions = jest.fn();
      mockUseAIStore.mockReturnValue({
        ...defaultMockStore,
        loadJobDescriptions: mockLoadJobDescriptions,
        jobDescriptions: [mockJobDescription, mockJobDescription2],
        activeJobDescriptionId: undefined,
      });
      mockUseJobDescriptions.mockReturnValue([mockJobDescription, mockJobDescription2]);
      mockUseActiveJobDescription.mockReturnValue(undefined);
      mockUseNotifications.mockReturnValue(defaultMockNotifications);

      renderWithTheme(
        <JobDescriptionsModal
          open={true}
          onClose={jest.fn()}
          cvId="cv-1"
        />
      );

      expect(mockLoadJobDescriptions).toHaveBeenCalled();
      expect(screen.getByText('Job Descriptions')).toBeInTheDocument();
    });

    it('shows all job descriptions including hidden ones in saved tab', () => {
      mockUseAIStore.mockReturnValue({
        ...defaultMockStore,
        jobDescriptions: [mockJobDescription, mockJobDescription2],
        activeJobDescriptionId: 'jd-1',
      });
      mockUseNotifications.mockReturnValue(defaultMockNotifications);

      renderWithTheme(
        <JobDescriptionsModal
          open={true}
          onClose={jest.fn()}
          cvId="cv-1"
        />
      );

      // Switch to saved tab
      const savedTab = screen.getByText('Saved');
      fireEvent.click(savedTab);

      expect(screen.getByText('Software Engineer')).toBeInTheDocument();
      expect(screen.getByText('Product Manager')).toBeInTheDocument();
    });

    it('shows empty state when no job descriptions exist', () => {
      mockUseAIStore.mockReturnValue({
        ...defaultMockStore,
        jobDescriptions: [],
        activeJobDescriptionId: undefined,
      });
      mockUseNotifications.mockReturnValue(defaultMockNotifications);

      renderWithTheme(
        <JobDescriptionsModal
          open={true}
          onClose={jest.fn()}
          cvId="cv-1"
        />
      );

      // Switch to saved tab
      const savedTab = screen.getByText('Saved');
      fireEvent.click(savedTab);

      expect(screen.getByText('No job descriptions saved yet')).toBeInTheDocument();
      expect(screen.getByText('Add one using the URL or Text tabs.')).toBeInTheDocument();
    });
  });

  describe('Job Description Selection', () => {
    it('selects job description and shows it in sidebar', () => {
      const mockSetActiveJobDescription = jest.fn();
      const mockShowJobDescriptionInSidebar = jest.fn();
      const mockOnJobDescriptionSelect = jest.fn();
      const mockOnClose = jest.fn();

      mockUseAIStore.mockReturnValue({
        ...defaultMockStore,
        setActiveJobDescription: mockSetActiveJobDescription,
        showJobDescriptionInSidebar: mockShowJobDescriptionInSidebar,
        jobDescriptions: [mockJobDescription, mockJobDescription2],
        activeJobDescriptionId: undefined,
      });
      mockUseNotifications.mockReturnValue(defaultMockNotifications);

      renderWithTheme(
        <JobDescriptionsModal
          open={true}
          onClose={mockOnClose}
          cvId="cv-1"
          onJobDescriptionSelect={mockOnJobDescriptionSelect}
        />
      );

      // Switch to saved tab
      const savedTab = screen.getByText('Saved');
      fireEvent.click(savedTab);

      // Click select button for first job description
      const selectButtons = screen.getAllByText('Select');
      fireEvent.click(selectButtons[0]);

      expect(mockSetActiveJobDescription).toHaveBeenCalledWith('jd-1');
      expect(mockShowJobDescriptionInSidebar).toHaveBeenCalledWith('jd-1');
      expect(mockOnJobDescriptionSelect).toHaveBeenCalledWith(mockJobDescription);
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('closes modal after job description selection', () => {
      const mockOnClose = jest.fn();
      mockUseAIStore.mockReturnValue({
        ...defaultMockStore,
        jobDescriptions: [mockJobDescription],
        activeJobDescriptionId: undefined,
      });
      mockUseNotifications.mockReturnValue(defaultMockNotifications);

      renderWithTheme(
        <JobDescriptionsModal
          open={true}
          onClose={mockOnClose}
          cvId="cv-1"
        />
      );

      // Switch to saved tab
      const savedTab = screen.getByText('Saved');
      fireEvent.click(savedTab);

      // Click select button
      const selectButton = screen.getByText('Select');
      fireEvent.click(selectButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('shows selected state for active job description', () => {
      mockUseAIStore.mockReturnValue({
        ...defaultMockStore,
        jobDescriptions: [mockJobDescription, mockJobDescription2],
        activeJobDescriptionId: 'jd-1',
      });
      mockUseNotifications.mockReturnValue(defaultMockNotifications);

      renderWithTheme(
        <JobDescriptionsModal
          open={true}
          onClose={jest.fn()}
          cvId="cv-1"
        />
      );

      // Switch to saved tab
      const savedTab = screen.getByText('Saved');
      fireEvent.click(savedTab);

      expect(screen.getByText('Selected')).toBeInTheDocument();
      expect(screen.getAllByText('Select')).toHaveLength(1); // Only one select button for non-active JD
    });
  });

  describe('URL Parsing Tab', () => {
    describe('URL Validation', () => {
      it('shows validation error for empty URL', () => {
        mockUseAIStore.mockReturnValue({
          ...defaultMockStore,
          jobDescriptions: [],
          activeJobDescriptionId: undefined,
        });
        mockUseNotifications.mockReturnValue(defaultMockNotifications);

        renderWithTheme(
          <JobDescriptionsModal
            open={true}
            onClose={jest.fn()}
            cvId="cv-1"
          />
        );

        const urlInput = screen.getByLabelText('Job Posting URL');
        const parseButton = screen.getByText('Parse & Save Job Description');

        // Button should be disabled for empty URL
        expect(parseButton).toBeDisabled();
        
        // Helper text should show placeholder text initially
        expect(screen.getByText('Paste a URL from LinkedIn, Indeed, or other job sites')).toBeInTheDocument();
      });

      it('validates LinkedIn job URLs correctly', () => {
        mockUseAIStore.mockReturnValue({
          ...defaultMockStore,
          jobDescriptions: [],
          activeJobDescriptionId: undefined,
        });
        mockUseNotifications.mockReturnValue(defaultMockNotifications);

        renderWithTheme(
          <JobDescriptionsModal
            open={true}
            onClose={jest.fn()}
            cvId="cv-1"
          />
        );

        const urlInput = screen.getByLabelText('Job Posting URL');
        const parseButton = screen.getByText('Parse & Save Job Description');

        // Valid LinkedIn URL
        fireEvent.change(urlInput, { target: { value: 'https://linkedin.com/jobs/view/1234567890' } });
        
        // Button should be enabled for valid URL
        expect(parseButton).not.toBeDisabled();
        
        // Should show helpful placeholder text
        expect(screen.getByText('Paste a URL from LinkedIn, Indeed, or other job sites')).toBeInTheDocument();
      });

      it('validates Indeed job URLs correctly', () => {
        mockUseAIStore.mockReturnValue({
          ...defaultMockStore,
          jobDescriptions: [],
          activeJobDescriptionId: undefined,
        });
        mockUseNotifications.mockReturnValue(defaultMockNotifications);

        renderWithTheme(
          <JobDescriptionsModal
            open={true}
            onClose={jest.fn()}
            cvId="cv-1"
          />
        );

        const urlInput = screen.getByLabelText('Job Posting URL');
        const parseButton = screen.getByText('Parse & Save Job Description');

        // Valid Indeed URL
        fireEvent.change(urlInput, { target: { value: 'https://indeed.com/viewjob?jk=abc123' } });
        
        expect(parseButton).not.toBeDisabled();
      });

      it('validates Glassdoor job URLs correctly', () => {
        mockUseAIStore.mockReturnValue({
          ...defaultMockStore,
          jobDescriptions: [],
          activeJobDescriptionId: undefined,
        });
        mockUseNotifications.mockReturnValue(defaultMockNotifications);

        renderWithTheme(
          <JobDescriptionsModal
            open={true}
            onClose={jest.fn()}
            cvId="cv-1"
          />
        );

        const urlInput = screen.getByLabelText('Job Posting URL');
        const parseButton = screen.getByText('Parse & Save Job Description');

        // Valid Glassdoor URL
        fireEvent.change(urlInput, { target: { value: 'https://glassdoor.com/job-listing/software-engineer/JV_123' } });
        
        expect(parseButton).not.toBeDisabled();
      });

      it('shows error for invalid URL format', () => {
        mockUseAIStore.mockReturnValue({
          ...defaultMockStore,
          jobDescriptions: [],
          activeJobDescriptionId: undefined,
        });
        mockUseNotifications.mockReturnValue(defaultMockNotifications);

        renderWithTheme(
          <JobDescriptionsModal
            open={true}
            onClose={jest.fn()}
            cvId="cv-1"
          />
        );

        const urlInput = screen.getByLabelText('Job Posting URL');
        const parseButton = screen.getByText('Parse & Save Job Description');

        // Invalid URL (no protocol)
        fireEvent.change(urlInput, { target: { value: 'linkedin.com/jobs/view/123' } });
        fireEvent.blur(urlInput); // Trigger validation on blur
        
        expect(parseButton).toBeDisabled();
        expect(screen.getByText('URL must start with http:// or https://')).toBeInTheDocument();
      });

      it('shows error for malformed URL', () => {
        mockUseAIStore.mockReturnValue({
          ...defaultMockStore,
          jobDescriptions: [],
          activeJobDescriptionId: undefined,
        });
        mockUseNotifications.mockReturnValue(defaultMockNotifications);

        renderWithTheme(
          <JobDescriptionsModal
            open={true}
            onClose={jest.fn()}
            cvId="cv-1"
          />
        );

        const urlInput = screen.getByLabelText('Job Posting URL');
        const parseButton = screen.getByText('Parse & Save Job Description');

        // Malformed URL that passes basic regex but fails URL constructor
        fireEvent.change(urlInput, { target: { value: 'https://[invalid-url' } });
        fireEvent.blur(urlInput); // Trigger validation on blur
        
        expect(parseButton).toBeDisabled();
        expect(screen.getByText('Please enter a valid URL format')).toBeInTheDocument();
      });

      it('allows valid company career page URLs', () => {
        mockUseAIStore.mockReturnValue({
          ...defaultMockStore,
          jobDescriptions: [],
          activeJobDescriptionId: undefined,
        });
        mockUseNotifications.mockReturnValue(defaultMockNotifications);

        renderWithTheme(
          <JobDescriptionsModal
            open={true}
            onClose={jest.fn()}
            cvId="cv-1"
          />
        );

        const urlInput = screen.getByLabelText('Job Posting URL');
        const parseButton = screen.getByText('Parse & Save Job Description');

        // Valid company career page URL
        fireEvent.change(urlInput, { target: { value: 'https://company.com/careers/software-engineer' } });
        
        expect(parseButton).not.toBeDisabled();
      });

      it('validates on blur and shows error message', () => {
        mockUseAIStore.mockReturnValue({
          ...defaultMockStore,
          jobDescriptions: [],
          activeJobDescriptionId: undefined,
        });
        mockUseNotifications.mockReturnValue(defaultMockNotifications);

        renderWithTheme(
          <JobDescriptionsModal
            open={true}
            onClose={jest.fn()}
            cvId="cv-1"
          />
        );

        const urlInput = screen.getByLabelText('Job Posting URL');
        const parseButton = screen.getByText('Parse & Save Job Description');

        // Enter invalid URL and blur
        fireEvent.change(urlInput, { target: { value: 'invalid-url' } });
        fireEvent.blur(urlInput);
        
        // Should show error state - button should be disabled for invalid URL
        expect(parseButton).toBeDisabled();
      });

      it('clears validation errors when user starts typing', () => {
        mockUseAIStore.mockReturnValue({
          ...defaultMockStore,
          jobDescriptions: [],
          activeJobDescriptionId: undefined,
        });
        mockUseNotifications.mockReturnValue(defaultMockNotifications);

        renderWithTheme(
          <JobDescriptionsModal
            open={true}
            onClose={jest.fn()}
            cvId="cv-1"
          />
        );

        const urlInput = screen.getByLabelText('Job Posting URL');
        const parseButton = screen.getByText('Parse & Save Job Description');

        // Enter invalid URL and blur to show error
        fireEvent.change(urlInput, { target: { value: 'invalid-url' } });
        fireEvent.blur(urlInput);
        
        expect(parseButton).toBeDisabled();

        // Start typing a valid URL
        fireEvent.change(urlInput, { target: { value: 'https://linkedin.com/jobs/view/123' } });
        
        // Error should be cleared and button enabled
        expect(parseButton).not.toBeDisabled();
      });

      it('validates on submit and prevents submission', async () => {
        mockUseAIStore.mockReturnValue({
          ...defaultMockStore,
          jobDescriptions: [],
          activeJobDescriptionId: undefined,
        });
        mockUseNotifications.mockReturnValue(defaultMockNotifications);

        renderWithTheme(
          <JobDescriptionsModal
            open={true}
            onClose={jest.fn()}
            cvId="cv-1"
          />
        );

        const urlInput = screen.getByLabelText('Job Posting URL');
        const parseButton = screen.getByText('Parse & Save Job Description');

        // Enter invalid URL and try to submit
        fireEvent.change(urlInput, { target: { value: 'invalid-url' } });
        fireEvent.click(parseButton);
        
        // Button should be disabled for invalid URL
        expect(parseButton).toBeDisabled();
        
        // Should show error message in general error area
        expect(screen.getByText('URL must start with http:// or https://')).toBeInTheDocument();
      });
    });

    it('parses URL and creates job description', async () => {
      const mockCreateJobDescription = jest.fn().mockResolvedValue(mockJobDescription);
      const mockSetActiveJobDescription = jest.fn();
      const mockOnJobDescriptionSelect = jest.fn();
      const mockOnClose = jest.fn();
      const mockShowSuccess = jest.fn();

      (aiService.parseJobDescriptionUrl as jest.Mock).mockResolvedValue({
        success: true,
        content: 'Parsed job description content',
        title: 'Parsed Title',
        company: 'Parsed Company',
        location: 'Parsed Location',
      });

      mockUseAIStore.mockReturnValue({
        ...defaultMockStore,
        createJobDescription: mockCreateJobDescription,
        setActiveJobDescription: mockSetActiveJobDescription,
        jobDescriptions: [],
        activeJobDescriptionId: undefined,
      });
      mockUseNotifications.mockReturnValue({
        ...defaultMockNotifications,
        showSuccess: mockShowSuccess,
      });

      renderWithTheme(
        <JobDescriptionsModal
          open={true}
          onClose={mockOnClose}
          cvId="cv-1"
          onJobDescriptionSelect={mockOnJobDescriptionSelect}
        />
      );

      // Enter URL
      const urlInput = screen.getByLabelText('Job Posting URL');
      fireEvent.change(urlInput, { target: { value: 'https://example.com/job' } });

      // Click parse button
      const parseButton = screen.getByText('Parse & Save Job Description');
      fireEvent.click(parseButton);

      await waitFor(() => {
        expect(aiService.parseJobDescriptionUrl).toHaveBeenCalledWith('cv-1', 'https://example.com/job');
        expect(mockCreateJobDescription).toHaveBeenCalledWith({
          content: 'Parsed job description content',
          title: 'Parsed Title',
          company: 'Parsed Company',
          location: 'Parsed Location',
          source_url: 'https://example.com/job',
        });
        expect(mockSetActiveJobDescription).toHaveBeenCalledWith(mockJobDescription.id);
        expect(mockOnJobDescriptionSelect).toHaveBeenCalledWith(mockJobDescription);
        expect(mockOnClose).toHaveBeenCalled();
        expect(mockShowSuccess).toHaveBeenCalledWith('Job description parsed and created successfully');
      });
    });

    it('shows error when URL parsing fails', async () => {
      const mockShowError = jest.fn();

      (aiService.parseJobDescriptionUrl as jest.Mock).mockRejectedValue(new Error('Parsing failed'));

      mockUseAIStore.mockReturnValue({
        ...defaultMockStore,
        jobDescriptions: [],
        activeJobDescriptionId: undefined,
      });
      mockUseNotifications.mockReturnValue({
        ...defaultMockNotifications,
        showError: mockShowError,
      });

      renderWithTheme(
        <JobDescriptionsModal
          open={true}
          onClose={jest.fn()}
          cvId="cv-1"
        />
      );

      // Enter URL
      const urlInput = screen.getByLabelText('Job Posting URL');
      fireEvent.change(urlInput, { target: { value: 'https://example.com/job' } });

      // Click parse button
      const parseButton = screen.getByText('Parse & Save Job Description');
      fireEvent.click(parseButton);

      await waitFor(() => {
        expect(screen.getByText('Unable to parse this URL. Please use the "Text" tab to enter the job description manually.')).toBeInTheDocument();
        expect(mockShowError).toHaveBeenCalledWith('URL Parsing Failed', 'Unable to parse this URL. Please use the "Text" tab to enter the job description manually.');
      });
    });

    it('validates URL input before parsing', async () => {
      mockUseAIStore.mockReturnValue({
        ...defaultMockStore,
        jobDescriptions: [],
        activeJobDescriptionId: undefined,
      });
      mockUseNotifications.mockReturnValue(defaultMockNotifications);

      renderWithTheme(
        <JobDescriptionsModal
          open={true}
          onClose={jest.fn()}
          cvId="cv-1"
        />
      );

      // Click parse button without entering URL
      const parseButton = screen.getByText('Parse & Save Job Description');
      fireEvent.click(parseButton);

      expect(screen.getByText('Please enter a URL')).toBeInTheDocument();
    });
  });

  describe('Text Input Tab', () => {
    it('creates job description from text input', async () => {
      const mockCreateJobDescription = jest.fn().mockResolvedValue(mockJobDescription);
      const mockSetActiveJobDescription = jest.fn();
      const mockOnJobDescriptionSelect = jest.fn();
      const mockOnClose = jest.fn();
      const mockShowSuccess = jest.fn();

      mockUseAIStore.mockReturnValue({
        ...defaultMockStore,
        createJobDescription: mockCreateJobDescription,
        setActiveJobDescription: mockSetActiveJobDescription,
        jobDescriptions: [],
        activeJobDescriptionId: undefined,
      });
      mockUseNotifications.mockReturnValue({
        ...defaultMockNotifications,
        showSuccess: mockShowSuccess,
      });

      renderWithTheme(
        <JobDescriptionsModal
          open={true}
          onClose={mockOnClose}
          cvId="cv-1"
          onJobDescriptionSelect={mockOnJobDescriptionSelect}
        />
      );

      // Switch to text tab
      const textTab = screen.getByText('Text');
      fireEvent.click(textTab);

      // Fill form
      fireEvent.change(screen.getByLabelText('Job Title (Optional)'), { target: { value: 'Manual Title' } });
      fireEvent.change(screen.getByLabelText('Company (Optional)'), { target: { value: 'Manual Company' } });
      fireEvent.change(screen.getByLabelText('Location (Optional)'), { target: { value: 'Manual Location' } });
      fireEvent.change(screen.getByLabelText('Job Description'), { target: { value: 'Manual job description content' } });

      // Click save button
      const saveButton = screen.getByText('Save Job Description');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockCreateJobDescription).toHaveBeenCalledWith({
          content: 'Manual job description content',
          title: 'Manual Title',
          company: 'Manual Company',
          location: 'Manual Location',
        });
        expect(mockSetActiveJobDescription).toHaveBeenCalledWith(mockJobDescription.id);
        expect(mockOnJobDescriptionSelect).toHaveBeenCalledWith(mockJobDescription);
        expect(mockOnClose).toHaveBeenCalled();
        expect(mockShowSuccess).toHaveBeenCalledWith('Job description created successfully');
      });
    });

    it('validates text input before saving', async () => {
      mockUseAIStore.mockReturnValue({
        ...defaultMockStore,
        jobDescriptions: [],
        activeJobDescriptionId: undefined,
      });
      mockUseNotifications.mockReturnValue(defaultMockNotifications);

      renderWithTheme(
        <JobDescriptionsModal
          open={true}
          onClose={jest.fn()}
          cvId="cv-1"
        />
      );

      // Switch to text tab
      const textTab = screen.getByText('Text');
      fireEvent.click(textTab);

      // Click save button without entering text
      const saveButton = screen.getByText('Save Job Description');
      fireEvent.click(saveButton);

      expect(screen.getByText('Please enter job description text')).toBeInTheDocument();
    });
  });

  describe('Edit Functionality', () => {
    it('opens edit dialog with job description data', () => {
      mockUseAIStore.mockReturnValue({
        ...defaultMockStore,
        jobDescriptions: [mockJobDescription],
        activeJobDescriptionId: undefined,
      });
      mockUseNotifications.mockReturnValue(defaultMockNotifications);

      renderWithTheme(
        <JobDescriptionsModal
          open={true}
          onClose={jest.fn()}
          cvId="cv-1"
        />
      );

      // Switch to saved tab
      const savedTab = screen.getByText('Saved');
      fireEvent.click(savedTab);

      // Click edit button
      const editButtons = screen.getAllByLabelText('Edit');
      fireEvent.click(editButtons[0]);

      expect(screen.getByText('Edit Job Description')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Software Engineer')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Test Company')).toBeInTheDocument();
      expect(screen.getByDisplayValue('San Francisco, CA')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Test job description content')).toBeInTheDocument();
    });

    it('updates job description on edit submit', async () => {
      const mockDeleteJobDescription = jest.fn().mockResolvedValue(undefined);
      const mockCreateJobDescription = jest.fn().mockResolvedValue({
        ...mockJobDescription,
        title: 'Updated Title',
        company: 'Updated Company',
        content: 'Updated content',
      });
      const mockShowSuccess = jest.fn();

      mockUseAIStore.mockReturnValue({
        ...defaultMockStore,
        deleteJobDescription: mockDeleteJobDescription,
        createJobDescription: mockCreateJobDescription,
        jobDescriptions: [mockJobDescription],
        activeJobDescriptionId: undefined,
      });
      mockUseNotifications.mockReturnValue({
        ...defaultMockNotifications,
        showSuccess: mockShowSuccess,
      });

      renderWithTheme(
        <JobDescriptionsModal
          open={true}
          onClose={jest.fn()}
          cvId="cv-1"
        />
      );

      // Switch to saved tab
      const savedTab = screen.getByText('Saved');
      fireEvent.click(savedTab);

      // Click edit button
      const editButtons = screen.getAllByLabelText('Edit');
      fireEvent.click(editButtons[0]);

      // Update form
      fireEvent.change(screen.getByLabelText('Job Title'), { target: { value: 'Updated Title' } });
      fireEvent.change(screen.getByLabelText('Company'), { target: { value: 'Updated Company' } });
      fireEvent.change(screen.getByLabelText('Job Description'), { target: { value: 'Updated content' } });

      // Submit form
      const saveButton = screen.getByText('Save Changes');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockDeleteJobDescription).toHaveBeenCalledWith('jd-1');
        expect(mockCreateJobDescription).toHaveBeenCalledWith({
          content: 'Updated content',
          title: 'Updated Title',
          company: 'Updated Company',
          location: 'San Francisco, CA',
        });
        expect(mockShowSuccess).toHaveBeenCalledWith('Job description updated successfully');
      });
    });
  });

  describe('Delete Functionality', () => {
    it('shows delete confirmation dialog', () => {
      mockUseAIStore.mockReturnValue({
        ...defaultMockStore,
        jobDescriptions: [mockJobDescription],
        activeJobDescriptionId: undefined,
      });
      mockUseNotifications.mockReturnValue(defaultMockNotifications);

      renderWithTheme(
        <JobDescriptionsModal
          open={true}
          onClose={jest.fn()}
          cvId="cv-1"
        />
      );

      // Switch to saved tab
      const savedTab = screen.getByText('Saved');
      fireEvent.click(savedTab);

      // Click delete button
      const deleteButtons = screen.getAllByLabelText('Delete');
      fireEvent.click(deleteButtons[0]);

      expect(screen.getByText('Delete Job Description')).toBeInTheDocument();
      expect(screen.getByText('Are you sure you want to delete "Software Engineer"? This action cannot be undone.')).toBeInTheDocument();
    });

    it('deletes job description on confirmation', async () => {
      const mockDeleteJobDescription = jest.fn().mockResolvedValue(undefined);
      const mockShowSuccess = jest.fn();

      mockUseAIStore.mockReturnValue({
        ...defaultMockStore,
        deleteJobDescription: mockDeleteJobDescription,
        jobDescriptions: [mockJobDescription],
        activeJobDescriptionId: undefined,
      });
      mockUseNotifications.mockReturnValue({
        ...defaultMockNotifications,
        showSuccess: mockShowSuccess,
      });

      renderWithTheme(
        <JobDescriptionsModal
          open={true}
          onClose={jest.fn()}
          cvId="cv-1"
        />
      );

      // Switch to saved tab
      const savedTab = screen.getByText('Saved');
      fireEvent.click(savedTab);

      // Click delete button
      const deleteButtons = screen.getAllByLabelText('Delete');
      fireEvent.click(deleteButtons[0]);

      // Confirm deletion
      const confirmButton = screen.getByText('Delete');
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockDeleteJobDescription).toHaveBeenCalledWith('jd-1');
        expect(mockShowSuccess).toHaveBeenCalledWith('Job description deleted successfully');
      });
    });

    it('cancels deletion when cancel button is clicked', () => {
      mockUseAIStore.mockReturnValue({
        ...defaultMockStore,
        jobDescriptions: [mockJobDescription],
        activeJobDescriptionId: undefined,
      });
      mockUseNotifications.mockReturnValue(defaultMockNotifications);

      renderWithTheme(
        <JobDescriptionsModal
          open={true}
          onClose={jest.fn()}
          cvId="cv-1"
        />
      );

      // Switch to saved tab
      const savedTab = screen.getByText('Saved');
      fireEvent.click(savedTab);

      // Click delete button
      const deleteButtons = screen.getAllByLabelText('Delete');
      fireEvent.click(deleteButtons[0]);

      // Cancel deletion
      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);

      expect(screen.queryByText('Delete Job Description')).not.toBeInTheDocument();
    });
  });

  describe('Tab Navigation', () => {
    it('switches between tabs correctly', () => {
      mockUseAIStore.mockReturnValue({
        ...defaultMockStore,
        jobDescriptions: [],
        activeJobDescriptionId: undefined,
      });
      mockUseNotifications.mockReturnValue(defaultMockNotifications);

      renderWithTheme(
        <JobDescriptionsModal
          open={true}
          onClose={jest.fn()}
          cvId="cv-1"
        />
      );

      // Initially on URL tab
      expect(screen.getByLabelText('Job Posting URL')).toBeInTheDocument();

      // Switch to text tab
      const textTab = screen.getByText('Text');
      fireEvent.click(textTab);
      expect(screen.getByLabelText('Job Description')).toBeInTheDocument();

      // Switch to saved tab
      const savedTab = screen.getByText('Saved');
      fireEvent.click(savedTab);
      expect(screen.getByText('No job descriptions saved yet')).toBeInTheDocument();
    });

    it('clears error when switching tabs', () => {
      mockUseAIStore.mockReturnValue({
        ...defaultMockStore,
        jobDescriptions: [],
        activeJobDescriptionId: undefined,
      });
      mockUseNotifications.mockReturnValue(defaultMockNotifications);

      renderWithTheme(
        <JobDescriptionsModal
          open={true}
          onClose={jest.fn()}
          cvId="cv-1"
        />
      );

      // Trigger an error on URL tab
      const parseButton = screen.getByText('Parse & Save Job Description');
      fireEvent.click(parseButton);
      expect(screen.getByText('Please enter a URL')).toBeInTheDocument();

      // Switch to text tab
      const textTab = screen.getByText('Text');
      fireEvent.click(textTab);

      // Error should be cleared
      expect(screen.queryByText('Please enter a URL')).not.toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    it('shows loading state during URL parsing', async () => {
      (aiService.parseJobDescriptionUrl as jest.Mock).mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );

      mockUseAIStore.mockReturnValue({
        ...defaultMockStore,
        jobDescriptions: [],
        activeJobDescriptionId: undefined,
      });
      mockUseNotifications.mockReturnValue(defaultMockNotifications);

      renderWithTheme(
        <JobDescriptionsModal
          open={true}
          onClose={jest.fn()}
          cvId="cv-1"
        />
      );

      // Enter URL
      const urlInput = screen.getByLabelText('Job Posting URL');
      fireEvent.change(urlInput, { target: { value: 'https://example.com/job' } });

      // Click parse button
      const parseButton = screen.getByText('Parse & Save Job Description');
      fireEvent.click(parseButton);

      expect(screen.getByText('Parsing...')).toBeInTheDocument();
      expect(parseButton).toBeDisabled();
    });

    it('shows loading state during text saving', async () => {
      const mockCreateJobDescription = jest.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );

      mockUseAIStore.mockReturnValue({
        ...defaultMockStore,
        createJobDescription: mockCreateJobDescription,
        jobDescriptions: [],
        activeJobDescriptionId: undefined,
      });
      mockUseNotifications.mockReturnValue(defaultMockNotifications);

      renderWithTheme(
        <JobDescriptionsModal
          open={true}
          onClose={jest.fn()}
          cvId="cv-1"
        />
      );

      // Switch to text tab
      const textTab = screen.getByText('Text');
      fireEvent.click(textTab);

      // Fill form
      fireEvent.change(screen.getByLabelText('Job Description'), { target: { value: 'Test content' } });

      // Click save button
      const saveButton = screen.getByText('Save Job Description');
      fireEvent.click(saveButton);

      expect(screen.getByText('Saving...')).toBeInTheDocument();
      expect(saveButton).toBeDisabled();
    });
  });

  describe('Error Handling', () => {
    it('handles job description creation error', async () => {
      const mockCreateJobDescription = jest.fn().mockRejectedValue(new Error('Creation failed'));
      const mockShowError = jest.fn();

      mockUseAIStore.mockReturnValue({
        ...defaultMockStore,
        createJobDescription: mockCreateJobDescription,
        jobDescriptions: [],
        activeJobDescriptionId: undefined,
      });
      mockUseNotifications.mockReturnValue({
        ...defaultMockNotifications,
        showError: mockShowError,
      });

      renderWithTheme(
        <JobDescriptionsModal
          open={true}
          onClose={jest.fn()}
          cvId="cv-1"
        />
      );

      // Switch to text tab
      const textTab = screen.getByText('Text');
      fireEvent.click(textTab);

      // Fill form
      fireEvent.change(screen.getByLabelText('Job Description'), { target: { value: 'Test content' } });

      // Click save button
      const saveButton = screen.getByText('Save Job Description');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('Creation failed')).toBeInTheDocument();
        expect(mockShowError).toHaveBeenCalledWith('Error', 'Creation failed');
      });
    });

    it('handles job description deletion error', async () => {
      const mockDeleteJobDescription = jest.fn().mockRejectedValue(new Error('Deletion failed'));
      const mockShowError = jest.fn();

      mockUseAIStore.mockReturnValue({
        ...defaultMockStore,
        deleteJobDescription: mockDeleteJobDescription,
        jobDescriptions: [mockJobDescription],
        activeJobDescriptionId: undefined,
      });
      mockUseNotifications.mockReturnValue({
        ...defaultMockNotifications,
        showError: mockShowError,
      });

      renderWithTheme(
        <JobDescriptionsModal
          open={true}
          onClose={jest.fn()}
          cvId="cv-1"
        />
      );

      // Switch to saved tab
      const savedTab = screen.getByText('Saved');
      fireEvent.click(savedTab);

      // Click delete button
      const deleteButtons = screen.getAllByLabelText('Delete');
      fireEvent.click(deleteButtons[0]);

      // Confirm deletion
      const confirmButton = screen.getByText('Delete');
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockShowError).toHaveBeenCalledWith('Error', 'Deletion failed');
      });
    });
  });

  describe('Modal Closing', () => {
    it('calls onClose when close button is clicked', () => {
      const mockOnClose = jest.fn();
      mockUseAIStore.mockReturnValue({
        ...defaultMockStore,
        jobDescriptions: [],
        activeJobDescriptionId: undefined,
      });
      mockUseNotifications.mockReturnValue(defaultMockNotifications);

      renderWithTheme(
        <JobDescriptionsModal
          open={true}
          onClose={mockOnClose}
          cvId="cv-1"
        />
      );

      const closeButton = screen.getByLabelText('close');
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('resets form state when modal is closed', () => {
      const mockOnClose = jest.fn();
      mockUseAIStore.mockReturnValue({
        ...defaultMockStore,
        jobDescriptions: [],
        activeJobDescriptionId: undefined,
      });
      mockUseNotifications.mockReturnValue(defaultMockNotifications);

      const { rerender } = renderWithTheme(
        <JobDescriptionsModal
          open={true}
          onClose={mockOnClose}
          cvId="cv-1"
        />
      );

      // Fill some form data
      const urlInput = screen.getByLabelText('Job Posting URL');
      fireEvent.change(urlInput, { target: { value: 'https://example.com' } });

      // Close modal
      const closeButton = screen.getByLabelText('close');
      fireEvent.click(closeButton);

      // Reopen modal
      rerender(
        <ThemeProvider theme={theme}>
          <JobDescriptionsModal
            open={true}
            onClose={mockOnClose}
            cvId="cv-1"
          />
        </ThemeProvider>
      );

      // Form should be reset
      expect(screen.getByLabelText('Job Posting URL')).toHaveValue('');
    });
  });
});
