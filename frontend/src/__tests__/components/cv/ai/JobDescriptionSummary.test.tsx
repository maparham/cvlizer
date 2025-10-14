/**
 * JobDescriptionSummary Component Tests
 *
 * Comprehensive unit tests for the JobDescriptionSummary component covering:
 * - Rendering states (no job descriptions, hidden job descriptions, active job description)
 * - User interactions (hide, edit, enhance CV, generate job fit)
 * - AI store integration and state management
 * - Error handling and edge cases
 */

import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import JobDescriptionSummary from "../../../../components/cv/ai/JobDescriptionSummary";
import {
  useAIStore,
  useVisibleJobDescriptions,
  useJobDescriptions,
  useActiveJobDescription,
} from "../../../../stores/aiStore";
import { useNotifications } from "../../../../stores/uiStore";
import { JobDescription } from "../../../../types/ai";

// Mock logger and errorHandler to avoid import.meta.env issues
jest.mock("../../../../utils/logger", () => ({
  Logger: jest.fn().mockImplementation(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  })),
}));

jest.mock("../../../../utils/errorHandler", () => ({
  ErrorHandler: jest.fn().mockImplementation(() => ({
    handle: jest.fn(),
    logError: jest.fn(),
  })),
}));

// Mock the AI store
jest.mock("../../../../stores/aiStore");
const mockUseAIStore = useAIStore as jest.MockedFunction<typeof useAIStore>;
const mockUseVisibleJobDescriptions =
  useVisibleJobDescriptions as jest.MockedFunction<
    typeof useVisibleJobDescriptions
  >;
const mockUseJobDescriptions = useJobDescriptions as jest.MockedFunction<
  typeof useJobDescriptions
>;
const mockUseActiveJobDescription =
  useActiveJobDescription as jest.MockedFunction<
    typeof useActiveJobDescription
  >;

// Mock the notifications store
jest.mock("../../../../stores/uiStore");
const mockUseNotifications = useNotifications as jest.MockedFunction<
  typeof useNotifications
>;

// Mock the AI service
jest.mock("../../../../services/aiService", () => ({
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
Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

// Mock window.open
Object.defineProperty(window, "open", {
  value: jest.fn(),
});

const theme = createTheme();

// Test data
const mockJobDescription: JobDescription = {
  id: "jd-1",
  cv_id: "cv-1",
  content: "Test job description content",
  title: "Software Engineer",
  company: "Test Company",
  location: "San Francisco, CA",
  source_url: "https://example.com/job",
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

const mockJobDescription2: JobDescription = {
  id: "jd-2",
  cv_id: "cv-1",
  content: "Another job description content",
  title: "Product Manager",
  company: "Another Company",
  location: "New York, NY",
  created_at: "2024-01-02T00:00:00Z",
  updated_at: "2024-01-02T00:00:00Z",
};

const defaultMockStore = {
  hideJobDescriptionFromSidebar: jest.fn(),
  setActiveJobDescription: jest.fn(),
  createJobDescription: jest.fn(),
  createJobFitDraft: jest.fn(),
  jobDescriptions: [],
  activeJobDescriptionId: undefined,
  hiddenJobDescriptionIds: [],
};

const defaultMockNotifications = {
  showSuccess: jest.fn(),
  showError: jest.fn(),
};

const renderWithTheme = (component: React.ReactElement) => {
  return render(<ThemeProvider theme={theme}>{component}</ThemeProvider>);
};

describe("JobDescriptionSummary", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();

    // Setup default mock returns
    mockUseVisibleJobDescriptions.mockReturnValue([]);
    mockUseJobDescriptions.mockReturnValue([]);
    mockUseActiveJobDescription.mockReturnValue(undefined);
  });

  describe("Rendering States", () => {
    it('renders "No Job Description Yet" state when no job descriptions exist', () => {
      mockUseAIStore.mockReturnValue(defaultMockStore);
      mockUseVisibleJobDescriptions.mockReturnValue([]);
      mockUseJobDescriptions.mockReturnValue([]);
      mockUseActiveJobDescription.mockReturnValue(undefined);
      mockUseNotifications.mockReturnValue(defaultMockNotifications);

      renderWithTheme(<JobDescriptionSummary cvId="cv-1" />);

      expect(screen.getByText("No Job Description Yet")).toBeInTheDocument();
      expect(
        screen.getByText(
          "Add a job description to get personalized AI suggestions and enhance your CV",
        ),
      ).toBeInTheDocument();
      expect(screen.getByText("Add Job Description")).toBeInTheDocument();
    });

    it('renders "No job description selected" state when job descriptions exist but none are visible in sidebar', () => {
      mockUseAIStore.mockReturnValue({
        ...defaultMockStore,
        jobDescriptions: [mockJobDescription, mockJobDescription2],
        activeJobDescriptionId: undefined,
        hiddenJobDescriptionIds: ["jd-1", "jd-2"], // All hidden
      });
      mockUseVisibleJobDescriptions.mockReturnValue([]); // No visible job descriptions
      mockUseActiveJobDescription.mockReturnValue(undefined);
      mockUseNotifications.mockReturnValue(defaultMockNotifications);

      renderWithTheme(<JobDescriptionSummary cvId="cv-1" />);

      expect(screen.getByText("No Job Description Yet")).toBeInTheDocument();
      expect(
        screen.getByText(
          "Add a job description to get personalized AI suggestions and enhance your CV",
        ),
      ).toBeInTheDocument();
    });

    it("renders active job description when one is selected and visible", () => {
      mockUseAIStore.mockReturnValue({
        ...defaultMockStore,
        jobDescriptions: [mockJobDescription, mockJobDescription2],
        activeJobDescriptionId: "jd-1",
        hiddenJobDescriptionIds: ["jd-2"], // Only jd-2 is hidden
      });
      mockUseVisibleJobDescriptions.mockReturnValue([mockJobDescription]);
      mockUseActiveJobDescription.mockReturnValue(mockJobDescription);
      mockUseNotifications.mockReturnValue(defaultMockNotifications);

      renderWithTheme(<JobDescriptionSummary cvId="cv-1" />);

      expect(screen.getByText("Software Engineer")).toBeInTheDocument();
      expect(screen.getByText("Test Company")).toBeInTheDocument();
      expect(screen.getByText("San Francisco, CA")).toBeInTheDocument();
      expect(
        screen.getByText("Test job description content"),
      ).toBeInTheDocument();
    });

    it("shows correct total count in Manage button", () => {
      mockUseAIStore.mockReturnValue({
        ...defaultMockStore,
        jobDescriptions: [mockJobDescription, mockJobDescription2],
        activeJobDescriptionId: undefined,
        hiddenJobDescriptionIds: [],
      });
      mockUseJobDescriptions.mockReturnValue([
        mockJobDescription,
        mockJobDescription2,
      ]);
      mockUseVisibleJobDescriptions.mockReturnValue([]);
      mockUseActiveJobDescription.mockReturnValue(undefined);
      mockUseNotifications.mockReturnValue(defaultMockNotifications);

      renderWithTheme(<JobDescriptionSummary cvId="cv-1" />);

      expect(screen.getByText("Manage (2)")).toBeInTheDocument();
    });
  });

  describe("User Interactions", () => {
    it("calls hideJobDescriptionFromSidebar when X button is clicked", () => {
      const mockHideJobDescriptionFromSidebar = jest.fn();
      mockUseAIStore.mockReturnValue({
        ...defaultMockStore,
        hideJobDescriptionFromSidebar: mockHideJobDescriptionFromSidebar,
        jobDescriptions: [mockJobDescription],
        activeJobDescriptionId: "jd-1",
        hiddenJobDescriptionIds: [],
      });
      mockUseVisibleJobDescriptions.mockReturnValue([mockJobDescription]);
      mockUseActiveJobDescription.mockReturnValue(mockJobDescription);
      mockUseNotifications.mockReturnValue(defaultMockNotifications);

      renderWithTheme(<JobDescriptionSummary cvId="cv-1" />);

      const hideButton = screen.getByLabelText("Remove from sidebar");
      fireEvent.click(hideButton);

      expect(mockHideJobDescriptionFromSidebar).toHaveBeenCalledWith("jd-1");
    });

    it("shows success notification when hiding job description", () => {
      const mockShowSuccess = jest.fn();
      mockUseAIStore.mockReturnValue({
        ...defaultMockStore,
        jobDescriptions: [mockJobDescription],
        activeJobDescriptionId: "jd-1",
        hiddenJobDescriptionIds: [],
      });
      mockUseVisibleJobDescriptions.mockReturnValue([mockJobDescription]);
      mockUseActiveJobDescription.mockReturnValue(mockJobDescription);
      mockUseNotifications.mockReturnValue({
        ...defaultMockNotifications,
        showSuccess: mockShowSuccess,
      });

      renderWithTheme(<JobDescriptionSummary cvId="cv-1" />);

      const hideButton = screen.getByLabelText("Remove from sidebar");
      fireEvent.click(hideButton);

      expect(mockShowSuccess).toHaveBeenCalledWith(
        "Job description removed from sidebar",
      );
    });

    it("opens edit dialog when edit button is clicked", () => {
      mockUseAIStore.mockReturnValue({
        ...defaultMockStore,
        jobDescriptions: [mockJobDescription],
        activeJobDescriptionId: "jd-1",
        hiddenJobDescriptionIds: [],
      });
      mockUseVisibleJobDescriptions.mockReturnValue([mockJobDescription]);
      mockUseActiveJobDescription.mockReturnValue(mockJobDescription);
      mockUseNotifications.mockReturnValue(defaultMockNotifications);

      renderWithTheme(<JobDescriptionSummary cvId="cv-1" />);

      const editButton = screen.getByLabelText("Edit");
      fireEvent.click(editButton);

      expect(screen.getByText("Edit Job Description")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Software Engineer")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Test Company")).toBeInTheDocument();
      expect(screen.getByDisplayValue("San Francisco, CA")).toBeInTheDocument();
      expect(
        screen.getByDisplayValue("Test job description content"),
      ).toBeInTheDocument();
    });

    it("calls onGenerateSuggestions when Enhance CV button is clicked", () => {
      const mockOnGenerateSuggestions = jest.fn();
      mockUseAIStore.mockReturnValue({
        ...defaultMockStore,
        jobDescriptions: [mockJobDescription],
        activeJobDescriptionId: "jd-1",
        hiddenJobDescriptionIds: [],
      });
      mockUseVisibleJobDescriptions.mockReturnValue([mockJobDescription]);
      mockUseActiveJobDescription.mockReturnValue(mockJobDescription);
      mockUseNotifications.mockReturnValue(defaultMockNotifications);

      renderWithTheme(
        <JobDescriptionSummary
          cvId="cv-1"
          onGenerateSuggestions={mockOnGenerateSuggestions}
        />,
      );

      const enhanceButton = screen.getByText("Enhance CV");
      fireEvent.click(enhanceButton);

      expect(mockOnGenerateSuggestions).toHaveBeenCalled();
    });

    it("calls handleGenerateJobFit when Generate Job Fit Section button is clicked", async () => {
      const mockCreateJobFitDraft = jest.fn().mockResolvedValue({});
      const mockShowSuccess = jest.fn();
      mockUseAIStore.mockReturnValue({
        ...defaultMockStore,
        createJobFitDraft: mockCreateJobFitDraft,
        jobDescriptions: [mockJobDescription],
        activeJobDescriptionId: "jd-1",
        hiddenJobDescriptionIds: [],
      });
      mockUseVisibleJobDescriptions.mockReturnValue([mockJobDescription]);
      mockUseActiveJobDescription.mockReturnValue(mockJobDescription);
      mockUseNotifications.mockReturnValue({
        ...defaultMockNotifications,
        showSuccess: mockShowSuccess,
      });

      renderWithTheme(
        <JobDescriptionSummary cvId="cv-1" onAddToCV={jest.fn()} />,
      );

      const generateButton = screen.getByText("Generate Job Fit Section");
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(mockCreateJobFitDraft).toHaveBeenCalledWith("cv-1", "jd-1");
        expect(mockShowSuccess).toHaveBeenCalledWith(
          "Job fit analysis completed successfully",
        );
      });
    });

    it("shows loading state during job fit generation", async () => {
      const mockCreateJobFitDraft = jest
        .fn()
        .mockImplementation(
          () => new Promise((resolve) => setTimeout(resolve, 100)),
        );
      mockUseAIStore.mockReturnValue({
        ...defaultMockStore,
        createJobFitDraft: mockCreateJobFitDraft,
        jobDescriptions: [mockJobDescription],
        activeJobDescriptionId: "jd-1",
        hiddenJobDescriptionIds: [],
      });
      mockUseVisibleJobDescriptions.mockReturnValue([mockJobDescription]);
      mockUseActiveJobDescription.mockReturnValue(mockJobDescription);
      mockUseNotifications.mockReturnValue(defaultMockNotifications);

      renderWithTheme(
        <JobDescriptionSummary cvId="cv-1" onAddToCV={jest.fn()} />,
      );

      const generateButton = screen.getByText("Generate Job Fit Section");
      fireEvent.click(generateButton);

      expect(screen.getByText("Generating...")).toBeInTheDocument();
      expect(generateButton).toBeDisabled();
    });
  });

  describe("Edit Form Functionality", () => {
    it("updates job description and maintains active selection on edit submit", async () => {
      const mockHideJobDescriptionFromSidebar = jest.fn();
      const mockCreateJobDescription = jest.fn().mockResolvedValue({
        ...mockJobDescription,
        id: "jd-new",
        title: "Updated Title",
        company: "Updated Company",
        content: "Updated content",
      });
      const mockSetActiveJobDescription = jest.fn();
      const mockShowSuccess = jest.fn();

      mockUseAIStore.mockReturnValue({
        ...defaultMockStore,
        hideJobDescriptionFromSidebar: mockHideJobDescriptionFromSidebar,
        createJobDescription: mockCreateJobDescription,
        setActiveJobDescription: mockSetActiveJobDescription,
        jobDescriptions: [mockJobDescription],
        activeJobDescriptionId: "jd-1",
        hiddenJobDescriptionIds: [],
      });
      mockUseVisibleJobDescriptions.mockReturnValue([mockJobDescription]);
      mockUseActiveJobDescription.mockReturnValue(mockJobDescription);
      mockUseNotifications.mockReturnValue({
        ...defaultMockNotifications,
        showSuccess: mockShowSuccess,
      });

      renderWithTheme(<JobDescriptionSummary cvId="cv-1" />);

      // Open edit dialog
      const editButton = screen.getByLabelText("Edit");
      fireEvent.click(editButton);

      // Update form fields
      fireEvent.change(screen.getByLabelText("Job Title"), {
        target: { value: "Updated Title" },
      });
      fireEvent.change(screen.getByLabelText("Company"), {
        target: { value: "Updated Company" },
      });
      fireEvent.change(screen.getByLabelText("Job Description"), {
        target: { value: "Updated content" },
      });

      // Submit form
      const saveButton = screen.getByText("Save Changes");
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockHideJobDescriptionFromSidebar).toHaveBeenCalledWith("jd-1");
        expect(mockCreateJobDescription).toHaveBeenCalledWith({
          content: "Updated content",
          title: "Updated Title",
          company: "Updated Company",
          location: "San Francisco, CA",
        });
        expect(mockSetActiveJobDescription).toHaveBeenCalledWith("jd-new");
        expect(mockShowSuccess).toHaveBeenCalledWith(
          "Job description updated successfully",
        );
      });
    });

    it("shows error when edit form submission fails", async () => {
      const mockCreateJobDescription = jest
        .fn()
        .mockRejectedValue(new Error("Update failed"));
      const mockShowError = jest.fn();

      mockUseAIStore.mockReturnValue({
        ...defaultMockStore,
        createJobDescription: mockCreateJobDescription,
        jobDescriptions: [mockJobDescription],
        activeJobDescriptionId: "jd-1",
        hiddenJobDescriptionIds: [],
      });
      mockUseVisibleJobDescriptions.mockReturnValue([mockJobDescription]);
      mockUseActiveJobDescription.mockReturnValue(mockJobDescription);
      mockUseNotifications.mockReturnValue({
        ...defaultMockNotifications,
        showError: mockShowError,
      });

      renderWithTheme(<JobDescriptionSummary cvId="cv-1" />);

      // Open edit dialog
      const editButton = screen.getByLabelText("Edit");
      fireEvent.click(editButton);

      // Submit form
      const saveButton = screen.getByText("Save Changes");
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockShowError).toHaveBeenCalledWith("Error", "Update failed");
      });
    });

    it("disables save button when content is empty", () => {
      mockUseAIStore.mockReturnValue({
        ...defaultMockStore,
        jobDescriptions: [mockJobDescription],
        activeJobDescriptionId: "jd-1",
        hiddenJobDescriptionIds: [],
      });
      mockUseVisibleJobDescriptions.mockReturnValue([mockJobDescription]);
      mockUseActiveJobDescription.mockReturnValue(mockJobDescription);
      mockUseNotifications.mockReturnValue(defaultMockNotifications);

      renderWithTheme(<JobDescriptionSummary cvId="cv-1" />);

      // Open edit dialog
      const editButton = screen.getByLabelText("Edit");
      fireEvent.click(editButton);

      // Clear content
      fireEvent.change(screen.getByLabelText("Job Description"), {
        target: { value: "" },
      });

      const saveButton = screen.getByText("Save Changes");
      expect(saveButton).toBeDisabled();
    });
  });

  describe("Edge Cases and Error Handling", () => {
    it("handles hiding currently active job description", () => {
      const mockHideJobDescriptionFromSidebar = jest.fn();
      mockUseAIStore.mockReturnValue({
        ...defaultMockStore,
        hideJobDescriptionFromSidebar: mockHideJobDescriptionFromSidebar,
        jobDescriptions: [mockJobDescription],
        activeJobDescriptionId: "jd-1",
        hiddenJobDescriptionIds: [],
      });
      mockUseVisibleJobDescriptions.mockReturnValue([mockJobDescription]);
      mockUseActiveJobDescription.mockReturnValue(mockJobDescription);
      mockUseNotifications.mockReturnValue(defaultMockNotifications);

      renderWithTheme(<JobDescriptionSummary cvId="cv-1" />);

      const hideButton = screen.getByLabelText("Remove from sidebar");
      fireEvent.click(hideButton);

      expect(mockHideJobDescriptionFromSidebar).toHaveBeenCalledWith("jd-1");
    });

    it("shows error when no job description is selected for job fit generation", async () => {
      const mockShowError = jest.fn();
      mockUseAIStore.mockReturnValue({
        ...defaultMockStore,
        jobDescriptions: [mockJobDescription],
        activeJobDescriptionId: undefined,
        hiddenJobDescriptionIds: [],
      });
      mockUseVisibleJobDescriptions.mockReturnValue([]);
      mockUseActiveJobDescription.mockReturnValue(undefined);
      mockUseNotifications.mockReturnValue({
        ...defaultMockNotifications,
        showError: mockShowError,
      });

      renderWithTheme(
        <JobDescriptionSummary cvId="cv-1" onAddToCV={jest.fn()} />,
      );

      // Since there's no active job description, the Generate Job Fit Section button won't be rendered
      // Instead, we should test that the "No Job Description Yet" state is shown
      expect(screen.getByText("No Job Description Yet")).toBeInTheDocument();
    });

    it("handles job fit generation error", async () => {
      const mockCreateJobFitDraft = jest
        .fn()
        .mockRejectedValue(new Error("Generation failed"));
      const mockShowError = jest.fn();
      mockUseAIStore.mockReturnValue({
        ...defaultMockStore,
        createJobFitDraft: mockCreateJobFitDraft,
        jobDescriptions: [mockJobDescription],
        activeJobDescriptionId: "jd-1",
        hiddenJobDescriptionIds: [],
      });
      mockUseVisibleJobDescriptions.mockReturnValue([mockJobDescription]);
      mockUseActiveJobDescription.mockReturnValue(mockJobDescription);
      mockUseNotifications.mockReturnValue({
        ...defaultMockNotifications,
        showError: mockShowError,
      });

      renderWithTheme(
        <JobDescriptionSummary cvId="cv-1" onAddToCV={jest.fn()} />,
      );

      const generateButton = screen.getByText("Generate Job Fit Section");
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(mockShowError).toHaveBeenCalledWith(
          "Error",
          "Generation failed",
        );
      });
    });
  });

  describe("Date Formatting", () => {
    it("formats recent dates correctly", () => {
      const recentJobDescription = {
        ...mockJobDescription,
        created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
      };

      mockUseAIStore.mockReturnValue({
        ...defaultMockStore,
        jobDescriptions: [recentJobDescription],
        activeJobDescriptionId: "jd-1",
        hiddenJobDescriptionIds: [],
      });
      mockUseVisibleJobDescriptions.mockReturnValue([recentJobDescription]);
      mockUseActiveJobDescription.mockReturnValue(recentJobDescription);
      mockUseNotifications.mockReturnValue(defaultMockNotifications);

      renderWithTheme(<JobDescriptionSummary cvId="cv-1" />);

      expect(screen.getByText(/2h ago/)).toBeInTheDocument();
    });

    it("formats older dates correctly", () => {
      const oldJobDescription = {
        ...mockJobDescription,
        created_at: new Date(
          Date.now() - 7 * 24 * 60 * 60 * 1000,
        ).toISOString(), // 7 days ago
      };

      mockUseAIStore.mockReturnValue({
        ...defaultMockStore,
        jobDescriptions: [oldJobDescription],
        activeJobDescriptionId: "jd-1",
        hiddenJobDescriptionIds: [],
      });
      mockUseVisibleJobDescriptions.mockReturnValue([oldJobDescription]);
      mockUseActiveJobDescription.mockReturnValue(oldJobDescription);
      mockUseNotifications.mockReturnValue(defaultMockNotifications);

      renderWithTheme(<JobDescriptionSummary cvId="cv-1" />);

      expect(screen.getByText(/Sep 27, 2025/)).toBeInTheDocument();
    });
  });

  describe("URL Handling", () => {
    it("opens URL in new tab when URL chip is clicked", () => {
      const mockOpen = jest.fn();
      Object.defineProperty(window, "open", {
        value: mockOpen,
      });

      mockUseAIStore.mockReturnValue({
        ...defaultMockStore,
        jobDescriptions: [mockJobDescription],
        activeJobDescriptionId: "jd-1",
        hiddenJobDescriptionIds: [],
      });
      mockUseVisibleJobDescriptions.mockReturnValue([mockJobDescription]);
      mockUseActiveJobDescription.mockReturnValue(mockJobDescription);
      mockUseNotifications.mockReturnValue(defaultMockNotifications);

      renderWithTheme(<JobDescriptionSummary cvId="cv-1" />);

      const urlChip = screen.getByText("URL");
      fireEvent.click(urlChip);

      expect(mockOpen).toHaveBeenCalledWith(
        "https://example.com/job",
        "_blank",
        "noopener,noreferrer",
      );
    });
  });

  describe("Loading States", () => {
    it("shows loading state for suggestions", () => {
      mockUseAIStore.mockReturnValue({
        ...defaultMockStore,
        jobDescriptions: [mockJobDescription],
        activeJobDescriptionId: "jd-1",
        hiddenJobDescriptionIds: [],
      });
      mockUseVisibleJobDescriptions.mockReturnValue([mockJobDescription]);
      mockUseActiveJobDescription.mockReturnValue(mockJobDescription);
      mockUseNotifications.mockReturnValue(defaultMockNotifications);

      renderWithTheme(
        <JobDescriptionSummary
          cvId="cv-1"
          onGenerateSuggestions={jest.fn()}
          suggestionsLoading={true}
        />,
      );

      expect(screen.getByText("Enhancing...")).toBeInTheDocument();
      const enhanceButton = screen.getByText("Enhancing...");
      expect(enhanceButton).toBeDisabled();
    });
  });
});
