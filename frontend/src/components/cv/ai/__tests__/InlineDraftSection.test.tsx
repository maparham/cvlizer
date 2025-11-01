/**
 * Inline Draft Section Component Tests
 *
 * This module tests the InlineDraftSection component functionality including
 * draft display, approval/rejection workflows, and integration with CV editor.
 */

// import React from 'react';
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ThemeProvider } from "@mui/material/styles";
import { createTheme } from "@mui/material/styles";
import InlineDraftSection from "../InlineDraftSection";
import { useAIStore } from "../../../../stores/ai";
import { useNotifications } from "../../../../packages/notifications";
import { useCVStore } from "../../../../stores/cv";
import { useCVEditor } from "../../../../contexts/CVEditorContext";
import { DraftResponse } from "../../../../types/ai";

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

// Mock the API service first to avoid import.meta issues
jest.mock("../../../../services/api", () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

// Mock the stores and contexts
jest.mock("../../../../stores/ai");
jest.mock("../../../../packages/notifications");
jest.mock("../../../../stores/cv");
jest.mock("../../../../contexts/CVEditorContext");

const mockUseAIStore = useAIStore as jest.MockedFunction<typeof useAIStore>;
const mockUseNotifications = useNotifications as jest.MockedFunction<
  typeof useNotifications
>;
const mockUseCVStore = useCVStore as jest.MockedFunction<typeof useCVStore>;
const mockUseCVEditor = useCVEditor as jest.MockedFunction<typeof useCVEditor>;

const theme = createTheme();

const mockDraft: DraftResponse = {
  id: "test-draft-1",
  cv_id: "test-cv-1",
  section_type: "why_good_fit",
  draft_data: {
    fit_analysis:
      "This is a test draft content that explains why the candidate is a good fit.",
    confidence_score: 85,
    key_matches: ["React", "TypeScript", "Leadership"],
    missing_skills: ["Python", "Docker"],
  },
  ai_model: "gpt-4",
  generation_time: 2500,
  tokens_used: 150,
  created_at: "2024-01-15T10:30:00Z",
  job_description_id: "test-job-1",
  is_generating: false,
  generation_error: undefined,
};

const mockApprovalResult = {
  message: "Draft approved and committed successfully",
  cv: {
    id: "test-cv-1",
    parsed_data: {
      personal_info: {},
      professional_summary: {},
      why_good_fit: {
        content:
          "This is a test draft content that explains why the candidate is a good fit.",
        confidence_score: 85,
      },
    },
  },
};

describe("InlineDraftSection", () => {
  const mockApproveDraft = jest.fn();
  const mockDeleteDraft = jest.fn();
  const mockShowSuccess = jest.fn();
  const mockShowError = jest.fn();
  const mockOnUpdateCV = jest.fn();
  const mockSetCurrentCV = jest.fn();
  const mockOnApproved = jest.fn();
  const mockOnRejected = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseAIStore.mockReturnValue({
      approveWhyGoodFitDraft: mockApproveDraft,
      deleteWhyGoodFitDraft: mockDeleteDraft,
    } as any);

    mockUseNotifications.mockReturnValue({
      showSuccess: mockShowSuccess,
      showError: mockShowError,
    } as any);

    mockUseCVStore.mockReturnValue({
      setCurrentCV: mockSetCurrentCV,
    } as any);

    mockUseCVEditor.mockReturnValue({
      onUpdateCV: mockOnUpdateCV,
    } as any);

    mockApproveDraft.mockResolvedValue(mockApprovalResult);
    mockDeleteDraft.mockResolvedValue(undefined);
  });

  const renderComponent = () => {
    return render(
      <ThemeProvider theme={theme}>
        <InlineDraftSection
          cvId="test-cv-1"
          draft={mockDraft}
          onApproved={mockOnApproved}
          onRejected={mockOnRejected}
        />
      </ThemeProvider>,
    );
  };

  it("renders draft content correctly", () => {
    renderComponent();

    expect(screen.getByText("AI Draft")).toBeInTheDocument();
    expect(screen.getByText("Why I'm a Good Fit")).toBeInTheDocument();
    expect(
      screen.getByText(mockDraft.draft_data!.fit_analysis!),
    ).toBeInTheDocument();
    expect(screen.getByText("Approve & Add to CV")).toBeInTheDocument();
    expect(screen.getByText("Discard")).toBeInTheDocument();
  });

  it("shows draft metadata in accordion", async () => {
    renderComponent();

    // Click to expand the accordion
    fireEvent.click(screen.getByText("View Analysis Details"));

    await waitFor(() => {
      expect(screen.getByText("Confidence Score")).toBeInTheDocument();
      expect(screen.getByText("85%")).toBeInTheDocument();
      expect(screen.getByText("Key Matches")).toBeInTheDocument();
      expect(screen.getByText("React")).toBeInTheDocument();
      expect(screen.getByText("Missing Skills")).toBeInTheDocument();
      expect(screen.getByText("Python")).toBeInTheDocument();
    });
  });

  it("handles draft approval successfully", async () => {
    renderComponent();

    const approveButton = screen.getByText("Approve & Add to CV");
    fireEvent.click(approveButton);

    expect(screen.getByText("Approving...")).toBeInTheDocument();

    await waitFor(() => {
      expect(mockApproveDraft).toHaveBeenCalledWith(
        "test-cv-1",
        "test-draft-1",
      );
      expect(mockSetCurrentCV).toHaveBeenCalledWith(mockApprovalResult.cv);
      expect(mockOnUpdateCV).toHaveBeenCalledWith(
        mockApprovalResult.cv.parsed_data,
      );
      expect(mockShowSuccess).toHaveBeenCalledWith(
        "Draft approved and added to CV successfully",
      );
      expect(mockOnApproved).toHaveBeenCalled();
    });
  });

  it("handles draft rejection successfully", async () => {
    renderComponent();

    const rejectButton = screen.getByText("Discard");
    fireEvent.click(rejectButton);

    expect(screen.getByText("Discarding...")).toBeInTheDocument();

    await waitFor(() => {
      expect(mockDeleteDraft).toHaveBeenCalledWith("test-cv-1");
      expect(mockShowSuccess).toHaveBeenCalledWith(
        "Draft discarded successfully",
      );
      expect(mockOnRejected).toHaveBeenCalled();
    });
  });

  it("handles approval errors gracefully", async () => {
    const errorMessage = "Failed to approve draft";
    mockApproveDraft.mockRejectedValue(new Error(errorMessage));

    renderComponent();

    const approveButton = screen.getByText("Approve & Add to CV");
    fireEvent.click(approveButton);

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith("Error", errorMessage);
      expect(mockOnApproved).not.toHaveBeenCalled();
    });
  });

  it("handles rejection errors gracefully", async () => {
    const errorMessage = "Failed to discard draft";
    mockDeleteDraft.mockRejectedValue(new Error(errorMessage));

    renderComponent();

    const rejectButton = screen.getByText("Discard");
    fireEvent.click(rejectButton);

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith("Error", errorMessage);
      expect(mockOnRejected).not.toHaveBeenCalled();
    });
  });

  it("disables buttons during approval process", async () => {
    // Mock a slow approval process
    mockApproveDraft.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100)),
    );

    renderComponent();

    const approveButton = screen.getByText("Approve & Add to CV");
    const rejectButton = screen.getByText("Discard");

    fireEvent.click(approveButton);

    // Check that both buttons are disabled during approval
    expect(approveButton).toBeDisabled();
    expect(rejectButton).toBeDisabled();
  });

  it("disables buttons during rejection process", async () => {
    // Mock a slow rejection process
    mockDeleteDraft.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100)),
    );

    renderComponent();

    const approveButton = screen.getByText("Approve & Add to CV");
    const rejectButton = screen.getByText("Discard");

    fireEvent.click(rejectButton);

    // Check that both buttons are disabled during rejection
    expect(approveButton).toBeDisabled();
    expect(rejectButton).toBeDisabled();
  });
});
