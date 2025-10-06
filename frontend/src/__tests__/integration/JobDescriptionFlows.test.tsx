/**
 * Job Description Integration Flow Tests
 * 
 * Comprehensive integration tests covering complete user interaction flows:
 * - Add JD → hide from sidebar → select in modal → appears in sidebar
 * - Add multiple JDs → hide some → manage count shows total
 * - Edit JD in sidebar → changes persist in modal
 * - Complete CRUD operations and state management
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import JobDescriptionSummary from '../../components/cv/ai/JobDescriptionSummary';
import JobDescriptionsModal from '../../components/cv/ai/JobDescriptionsModal';
import { useAIStore } from '../../stores/aiStore';
import { useNotifications } from '../../stores/uiStore';
import { JobDescription } from '../../types/ai';
import { aiService } from '../../services/aiService';

// Mock the AI store
jest.mock('../../stores/aiStore');
const mockUseAIStore = useAIStore as jest.MockedFunction<typeof useAIStore>;

// Mock the notifications store
jest.mock('../../stores/uiStore');
const mockUseNotifications = useNotifications as jest.MockedFunction<typeof useNotifications>;

// Mock the AI service
jest.mock('../../services/aiService', () => ({
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
const mockJobDescription1: JobDescription = {
  id: 'jd-1',
  cv_id: 'cv-1',
  content: 'First job description content',
  title: 'Software Engineer',
  company: 'Company A',
  location: 'San Francisco, CA',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const mockJobDescription2: JobDescription = {
  id: 'jd-2',
  cv_id: 'cv-1',
  content: 'Second job description content',
  title: 'Product Manager',
  company: 'Company B',
  location: 'New York, NY',
  created_at: '2024-01-02T00:00:00Z',
  updated_at: '2024-01-02T00:00:00Z',
};

const mockJobDescription3: JobDescription = {
  id: 'jd-3',
  cv_id: 'cv-1',
  content: 'Third job description content',
  title: 'Designer',
  company: 'Company C',
  location: 'Seattle, WA',
  created_at: '2024-01-03T00:00:00Z',
  updated_at: '2024-01-03T00:00:00Z',
};

const defaultMockStore = {
  hideJobDescriptionFromSidebar: jest.fn(),
  setActiveJobDescription: jest.fn(),
  createJobDescription: jest.fn(),
  createJobFitDraft: jest.fn(),
  loadJobDescriptions: jest.fn(),
  deleteJobDescription: jest.fn(),
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

describe('Job Description Integration Flows', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
  });

  describe('Complete Flow: Add JD → Hide from Sidebar → Select in Modal → Appears in Sidebar', () => {
    it('completes the full cycle of job description management', async () => {
      const mockCreateJobDescription = jest.fn()
        .mockResolvedValueOnce(mockJobDescription1)
        .mockResolvedValueOnce(mockJobDescription2);
      const mockSetActiveJobDescription = jest.fn();
      const mockShowJobDescriptionInSidebar = jest.fn();
      const mockShowSuccess = jest.fn();

      // Start with no job descriptions
      let storeState = {
        ...defaultMockStore,
        createJobDescription: mockCreateJobDescription,
        setActiveJobDescription: mockSetActiveJobDescription,
        showJobDescriptionInSidebar: mockShowJobDescriptionInSidebar,
        jobDescriptions: [],
        activeJobDescriptionId: undefined,
        hiddenJobDescriptionIds: [],
      };

      mockUseAIStore.mockReturnValue(storeState);
      mockUseNotifications.mockReturnValue({
        ...defaultMockNotifications,
        showSuccess: mockShowSuccess,
      });

      const { rerender } = renderWithTheme(
        <JobDescriptionSummary cvId="cv-1" />
      );

      // Step 1: Initially shows "No Job Description Yet"
      expect(screen.getByText('No Job Description Yet')).toBeInTheDocument();

      // Step 2: Open modal and add first job description
      const addButton = screen.getByText('Add Job Description');
      fireEvent.click(addButton);

      // Modal should be open
      expect(screen.getByText('Job Descriptions')).toBeInTheDocument();

      // Switch to text tab and add job description
      const textTab = screen.getByText('Text');
      fireEvent.click(textTab);

      fireEvent.change(screen.getByLabelText('Job Title (Optional)'), { 
        target: { value: 'Software Engineer' } 
      });
      fireEvent.change(screen.getByLabelText('Company (Optional)'), { 
        target: { value: 'Company A' } 
      });
      fireEvent.change(screen.getByLabelText('Job Description'), { 
        target: { value: 'First job description content' } 
      });

      const saveButton = screen.getByText('Save Job Description');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockCreateJobDescription).toHaveBeenCalledWith({
          content: 'First job description content',
          title: 'Software Engineer',
          company: 'Company A',
          location: 'Unknown Location',
        });
      });

      // Update store state to reflect new job description
      storeState = {
        ...storeState,
        jobDescriptions: [mockJobDescription1],
        activeJobDescriptionId: 'jd-1',
      };
      mockUseAIStore.mockReturnValue(storeState);

      // Re-render to show updated state
      rerender(
        <ThemeProvider theme={theme}>
          <JobDescriptionSummary cvId="cv-1" />
        </ThemeProvider>
      );

      // Step 3: Job description should now be visible in sidebar
      expect(screen.getByText('Software Engineer')).toBeInTheDocument();
      expect(screen.getByText('Company A')).toBeInTheDocument();

      // Step 4: Hide job description from sidebar
      const hideButton = screen.getByLabelText('Remove from sidebar');
      fireEvent.click(hideButton);

      expect(defaultMockStore.hideJobDescriptionFromSidebar).toHaveBeenCalledWith('jd-1');

      // Update store state to reflect hidden job description
      storeState = {
        ...storeState,
        hiddenJobDescriptionIds: ['jd-1'],
      };
      mockUseAIStore.mockReturnValue(storeState);

      rerender(
        <ThemeProvider theme={theme}>
          <JobDescriptionSummary cvId="cv-1" />
        </ThemeProvider>
      );

      // Step 5: Should show "No job description selected" state
      expect(screen.getByText('No job description selected')).toBeInTheDocument();

      // Step 6: Add second job description
      const manageButton = screen.getByText('Manage (1)');
      fireEvent.click(manageButton);

      // Switch to text tab and add second job description
      const textTab2 = screen.getByText('Text');
      fireEvent.click(textTab2);

      fireEvent.change(screen.getByLabelText('Job Title (Optional)'), { 
        target: { value: 'Product Manager' } 
      });
      fireEvent.change(screen.getByLabelText('Company (Optional)'), { 
        target: { value: 'Company B' } 
      });
      fireEvent.change(screen.getByLabelText('Job Description'), { 
        target: { value: 'Second job description content' } 
      });

      const saveButton2 = screen.getByText('Save Job Description');
      fireEvent.click(saveButton2);

      await waitFor(() => {
        expect(mockCreateJobDescription).toHaveBeenCalledWith({
          content: 'Second job description content',
          title: 'Product Manager',
          company: 'Company B',
          location: 'Unknown Location',
        });
      });

      // Update store state
      storeState = {
        ...storeState,
        jobDescriptions: [mockJobDescription1, mockJobDescription2],
        activeJobDescriptionId: 'jd-2',
      };
      mockUseAIStore.mockReturnValue(storeState);

      rerender(
        <ThemeProvider theme={theme}>
          <JobDescriptionSummary cvId="cv-1" />
        </ThemeProvider>
      );

      // Step 7: Second job description should be visible in sidebar
      expect(screen.getByText('Product Manager')).toBeInTheDocument();
      expect(screen.getByText('Company B')).toBeInTheDocument();

      // Step 8: Open modal and select first job description (which was hidden)
      const manageButton2 = screen.getByText('Manage (2)');
      fireEvent.click(manageButton2);

      // Switch to saved tab
      const savedTab = screen.getByText('Saved');
      fireEvent.click(savedTab);

      // Both job descriptions should be visible in modal
      expect(screen.getByText('Software Engineer')).toBeInTheDocument();
      expect(screen.getByText('Product Manager')).toBeInTheDocument();

      // Select the first job description
      const selectButtons = screen.getAllByText('Select');
      fireEvent.click(selectButtons[0]); // Select Software Engineer

      expect(mockSetActiveJobDescription).toHaveBeenCalledWith('jd-1');
      expect(mockShowJobDescriptionInSidebar).toHaveBeenCalledWith('jd-1');

      // Update store state
      storeState = {
        ...storeState,
        activeJobDescriptionId: 'jd-1',
        hiddenJobDescriptionIds: [],
      };
      mockUseAIStore.mockReturnValue(storeState);

      rerender(
        <ThemeProvider theme={theme}>
          <JobDescriptionSummary cvId="cv-1" />
        </ThemeProvider>
      );

      // Step 9: First job description should now be visible in sidebar
      expect(screen.getByText('Software Engineer')).toBeInTheDocument();
      expect(screen.getByText('Company A')).toBeInTheDocument();
    });
  });

  describe('Complete Flow: Add Multiple JDs → Hide Some → Manage Count Shows Total', () => {
    it('manages multiple job descriptions with correct counts', async () => {
      const mockCreateJobDescription = jest.fn()
        .mockResolvedValueOnce(mockJobDescription1)
        .mockResolvedValueOnce(mockJobDescription2)
        .mockResolvedValueOnce(mockJobDescription3);

      let storeState = {
        ...defaultMockStore,
        createJobDescription: mockCreateJobDescription,
        jobDescriptions: [],
        activeJobDescriptionId: undefined,
        hiddenJobDescriptionIds: [],
      };

      mockUseAIStore.mockReturnValue(storeState);
      mockUseNotifications.mockReturnValue(defaultMockNotifications);

      const { rerender } = renderWithTheme(
        <JobDescriptionSummary cvId="cv-1" />
      );

      // Add first job description
      const addButton = screen.getByText('Add Job Description');
      fireEvent.click(addButton);

      const textTab = screen.getByText('Text');
      fireEvent.click(textTab);

      fireEvent.change(screen.getByLabelText('Job Description'), { 
        target: { value: 'First job description content' } 
      });

      const saveButton = screen.getByText('Save Job Description');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockCreateJobDescription).toHaveBeenCalled();
      });

      // Update store state
      storeState = {
        ...storeState,
        jobDescriptions: [mockJobDescription1],
        activeJobDescriptionId: 'jd-1',
      };
      mockUseAIStore.mockReturnValue(storeState);

      rerender(
        <ThemeProvider theme={theme}>
          <JobDescriptionSummary cvId="cv-1" />
        </ThemeProvider>
      );

      // Should show count of 1
      expect(screen.getByText('Manage (1)')).toBeInTheDocument();

      // Add second job description
      const manageButton = screen.getByText('Manage (1)');
      fireEvent.click(manageButton);

      const textTab2 = screen.getByText('Text');
      fireEvent.click(textTab2);

      fireEvent.change(screen.getByLabelText('Job Description'), { 
        target: { value: 'Second job description content' } 
      });

      const saveButton2 = screen.getByText('Save Job Description');
      fireEvent.click(saveButton2);

      await waitFor(() => {
        expect(mockCreateJobDescription).toHaveBeenCalledTimes(2);
      });

      // Update store state
      storeState = {
        ...storeState,
        jobDescriptions: [mockJobDescription1, mockJobDescription2],
        activeJobDescriptionId: 'jd-2',
      };
      mockUseAIStore.mockReturnValue(storeState);

      rerender(
        <ThemeProvider theme={theme}>
          <JobDescriptionSummary cvId="cv-1" />
        </ThemeProvider>
      );

      // Should show count of 2
      expect(screen.getByText('Manage (2)')).toBeInTheDocument();

      // Add third job description
      const manageButton2 = screen.getByText('Manage (2)');
      fireEvent.click(manageButton2);

      const textTab3 = screen.getByText('Text');
      fireEvent.click(textTab3);

      fireEvent.change(screen.getByLabelText('Job Description'), { 
        target: { value: 'Third job description content' } 
      });

      const saveButton3 = screen.getByText('Save Job Description');
      fireEvent.click(saveButton3);

      await waitFor(() => {
        expect(mockCreateJobDescription).toHaveBeenCalledTimes(3);
      });

      // Update store state
      storeState = {
        ...storeState,
        jobDescriptions: [mockJobDescription1, mockJobDescription2, mockJobDescription3],
        activeJobDescriptionId: 'jd-3',
      };
      mockUseAIStore.mockReturnValue(storeState);

      rerender(
        <ThemeProvider theme={theme}>
          <JobDescriptionSummary cvId="cv-1" />
        </ThemeProvider>
      );

      // Should show count of 3
      expect(screen.getByText('Manage (3)')).toBeInTheDocument();

      // Hide one job description
      const hideButton = screen.getByLabelText('Remove from sidebar');
      fireEvent.click(hideButton);

      // Update store state
      storeState = {
        ...storeState,
        hiddenJobDescriptionIds: ['jd-3'],
        activeJobDescriptionId: undefined,
      };
      mockUseAIStore.mockReturnValue(storeState);

      rerender(
        <ThemeProvider theme={theme}>
          <JobDescriptionSummary cvId="cv-1" />
        </ThemeProvider>
      );

      // Should still show count of 3 (total count, not visible count)
      expect(screen.getByText('Manage (3)')).toBeInTheDocument();
      expect(screen.getByText('No job description selected')).toBeInTheDocument();
    });
  });

  describe('Complete Flow: Edit JD in Sidebar → Changes Persist in Modal', () => {
    it('maintains consistency between sidebar and modal after editing', async () => {
      const mockCreateJobDescription = jest.fn()
        .mockResolvedValueOnce({
          ...mockJobDescription1,
          id: 'jd-1-updated',
          title: 'Updated Software Engineer',
          company: 'Updated Company A',
          content: 'Updated job description content',
        });

      let storeState = {
        ...defaultMockStore,
        createJobDescription: mockCreateJobDescription,
        jobDescriptions: [mockJobDescription1],
        activeJobDescriptionId: 'jd-1',
        hiddenJobDescriptionIds: [],
      };

      mockUseAIStore.mockReturnValue(storeState);
      mockUseNotifications.mockReturnValue(defaultMockNotifications);

      const { rerender } = renderWithTheme(
        <JobDescriptionSummary cvId="cv-1" />
      );

      // Job description should be visible in sidebar
      expect(screen.getByText('Software Engineer')).toBeInTheDocument();
      expect(screen.getByText('Company A')).toBeInTheDocument();

      // Edit job description in sidebar
      const editButton = screen.getByLabelText('Edit');
      fireEvent.click(editButton);

      // Update form fields
      fireEvent.change(screen.getByLabelText('Job Title'), { 
        target: { value: 'Updated Software Engineer' } 
      });
      fireEvent.change(screen.getByLabelText('Company'), { 
        target: { value: 'Updated Company A' } 
      });
      fireEvent.change(screen.getByLabelText('Job Description'), { 
        target: { value: 'Updated job description content' } 
      });

      // Submit form
      const saveButton = screen.getByText('Save Changes');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockCreateJobDescription).toHaveBeenCalledWith({
          content: 'Updated job description content',
          title: 'Updated Software Engineer',
          company: 'Updated Company A',
          location: 'San Francisco, CA',
        });
      });

      // Update store state to reflect the new job description
      storeState = {
        ...storeState,
        jobDescriptions: [{
          ...mockJobDescription1,
          id: 'jd-1-updated',
          title: 'Updated Software Engineer',
          company: 'Updated Company A',
          content: 'Updated job description content',
        }],
        activeJobDescriptionId: 'jd-1-updated',
      };
      mockUseAIStore.mockReturnValue(storeState);

      rerender(
        <ThemeProvider theme={theme}>
          <JobDescriptionSummary cvId="cv-1" />
        </ThemeProvider>
      );

      // Updated job description should be visible in sidebar
      expect(screen.getByText('Updated Software Engineer')).toBeInTheDocument();
      expect(screen.getByText('Updated Company A')).toBeInTheDocument();

      // Open modal to verify changes persist
      const manageButton = screen.getByText('Manage (1)');
      fireEvent.click(manageButton);

      // Switch to saved tab
      const savedTab = screen.getByText('Saved');
      fireEvent.click(savedTab);

      // Updated job description should be visible in modal
      expect(screen.getByText('Updated Software Engineer')).toBeInTheDocument();
      expect(screen.getByText('Updated Company A')).toBeInTheDocument();
    });
  });

  describe('Error Handling and Recovery', () => {
    it('handles errors gracefully and maintains state consistency', async () => {
      const mockCreateJobDescription = jest.fn()
        .mockRejectedValueOnce(new Error('Creation failed'))
        .mockResolvedValueOnce(mockJobDescription1);

      let storeState = {
        ...defaultMockStore,
        createJobDescription: mockCreateJobDescription,
        jobDescriptions: [],
        activeJobDescriptionId: undefined,
        hiddenJobDescriptionIds: [],
      };

      mockUseAIStore.mockReturnValue(storeState);
      mockUseNotifications.mockReturnValue(defaultMockNotifications);

      const { rerender } = renderWithTheme(
        <JobDescriptionSummary cvId="cv-1" />
      );

      // Try to add job description (will fail)
      const addButton = screen.getByText('Add Job Description');
      fireEvent.click(addButton);

      const textTab = screen.getByText('Text');
      fireEvent.click(textTab);

      fireEvent.change(screen.getByLabelText('Job Description'), { 
        target: { value: 'Test content' } 
      });

      const saveButton = screen.getByText('Save Job Description');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('Creation failed')).toBeInTheDocument();
      });

      // Try again (should succeed)
      fireEvent.change(screen.getByLabelText('Job Description'), { 
        target: { value: 'Test content 2' } 
      });

      const saveButton2 = screen.getByText('Save Job Description');
      fireEvent.click(saveButton2);

      await waitFor(() => {
        expect(mockCreateJobDescription).toHaveBeenCalledTimes(2);
      });

      // Update store state
      storeState = {
        ...storeState,
        jobDescriptions: [mockJobDescription1],
        activeJobDescriptionId: 'jd-1',
      };
      mockUseAIStore.mockReturnValue(storeState);

      rerender(
        <ThemeProvider theme={theme}>
          <JobDescriptionSummary cvId="cv-1" />
        </ThemeProvider>
      );

      // Should now show the job description
      expect(screen.getByText('Software Engineer')).toBeInTheDocument();
    });
  });

  describe('localStorage Persistence', () => {
    it('persists state across component unmounts and remounts', () => {
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'activeJobDescriptionId') return 'jd-1';
        if (key === 'hiddenJobDescriptionIds') return JSON.stringify(['jd-2']);
        return null;
      });

      let storeState = {
        ...defaultMockStore,
        jobDescriptions: [mockJobDescription1, mockJobDescription2, mockJobDescription3],
        activeJobDescriptionId: 'jd-1',
        hiddenJobDescriptionIds: ['jd-2'],
      };

      mockUseAIStore.mockReturnValue(storeState);
      mockUseNotifications.mockReturnValue(defaultMockNotifications);

      const { unmount, rerender } = renderWithTheme(
        <JobDescriptionSummary cvId="cv-1" />
      );

      // Should show active job description
      expect(screen.getByText('Software Engineer')).toBeInTheDocument();

      // Unmount component
      unmount();

      // Remount component
      rerender(
        <ThemeProvider theme={theme}>
          <JobDescriptionSummary cvId="cv-1" />
        </ThemeProvider>
      );

      // Should still show active job description (state persisted)
      expect(screen.getByText('Software Engineer')).toBeInTheDocument();
    });
  });
});
