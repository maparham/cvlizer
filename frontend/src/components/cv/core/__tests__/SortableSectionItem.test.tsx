/**
 * Tests for SortableSectionItem component
 *
 * Tests the section visibility toggle button, especially the disabled state
 * for personal_info section which should always be visible.
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { DndContext } from "@dnd-kit/core";
import SortableSectionItem from "../SortableSectionItem";
import { CVEditorProvider } from "../../../../contexts/CVEditorContext";

// Mock the CVEditorContext
jest.mock("../../../../contexts/CVEditorContext", () => ({
  ...jest.requireActual("../../../../contexts/CVEditorContext"),
  useCVEditor: () => ({
    validationErrors: [], // Empty array, not object
    editingSection: null,
    editingIndividualItem: null,
    hasUnsavedChanges: false,
  }),
}));

// Wrapper component to provide DndContext
const DndWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <DndContext>{children}</DndContext>;
};

describe("SortableSectionItem", () => {
  const mockOnToggleVisibility = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Personal Info Section", () => {
    it("should disable hide button for personal_info section", () => {
      const section = {
        id: "personal_info",
        type: "personal_info" as const,
        title: "Personal Information",
        visible: true,
        order: 1,
      };

      render(
        <DndWrapper>
          <SortableSectionItem
            section={section}
            onToggleVisibility={mockOnToggleVisibility}
          />
        </DndWrapper>
      );

      const hideButton = screen.getByTestId("hide-section-personal_info-button");
      expect(hideButton).toBeDisabled();
    });

    it("should show explanatory tooltip for personal_info section", () => {
      const section = {
        id: "personal_info",
        type: "personal_info" as const,
        title: "Personal Information",
        visible: true,
        order: 1,
      };

      render(
        <DndWrapper>
          <SortableSectionItem
            section={section}
            onToggleVisibility={mockOnToggleVisibility}
          />
        </DndWrapper>
      );

      const hideButton = screen.getByTestId("hide-section-personal_info-button");
      const tooltipWrapper = hideButton.parentElement!;

      // Check the aria-label (Material-UI sets this on the tooltip wrapper)
      expect(tooltipWrapper).toHaveAttribute(
        "aria-label",
        "Personal information is always visible and cannot be hidden"
      );
    });

    it("should not call onToggleVisibility when personal_info button is clicked", () => {
      const section = {
        id: "personal_info",
        type: "personal_info" as const,
        title: "Personal Information",
        visible: true,
        order: 1,
      };

      render(
        <DndWrapper>
          <SortableSectionItem
            section={section}
            onToggleVisibility={mockOnToggleVisibility}
          />
        </DndWrapper>
      );

      const hideButton = screen.getByTestId("hide-section-personal_info-button");

      // Try to click the disabled button
      fireEvent.click(hideButton);

      // Should not have been called
      expect(mockOnToggleVisibility).not.toHaveBeenCalled();
    });
  });

  describe("Other Sections", () => {
    it("should enable hide button for work_experience section", () => {
      const section = {
        id: "work_experience",
        type: "work_experience" as const,
        title: "Work Experience",
        visible: true,
        order: 2,
      };

      render(
        <DndWrapper>
          <SortableSectionItem
            section={section}
            onToggleVisibility={mockOnToggleVisibility}
          />
        </DndWrapper>
      );

      const hideButton = screen.getByTestId("hide-section-work_experience-button");
      expect(hideButton).not.toBeDisabled();
    });

    it("should enable hide button for professional_summary section", () => {
      const section = {
        id: "professional_summary",
        type: "professional_summary" as const,
        title: "Professional Summary",
        visible: true,
        order: 1,
      };

      render(
        <DndWrapper>
          <SortableSectionItem
            section={section}
            onToggleVisibility={mockOnToggleVisibility}
          />
        </DndWrapper>
      );

      const hideButton = screen.getByTestId(
        "hide-section-professional_summary-button"
      );
      expect(hideButton).not.toBeDisabled();
    });

    it("should call onToggleVisibility when hide button is clicked on other sections", () => {
      const section = {
        id: "skills",
        type: "skills" as const,
        title: "Skills",
        visible: true,
        order: 3,
      };

      render(
        <DndWrapper>
          <SortableSectionItem
            section={section}
            onToggleVisibility={mockOnToggleVisibility}
          />
        </DndWrapper>
      );

      const hideButton = screen.getByTestId("hide-section-skills-button");
      fireEvent.click(hideButton);

      expect(mockOnToggleVisibility).toHaveBeenCalledWith("skills");
    });

    it("should show 'Hide this section' tooltip for visible sections", () => {
      const section = {
        id: "education",
        type: "education" as const,
        title: "Education",
        visible: true,
        order: 4,
      };

      render(
        <DndWrapper>
          <SortableSectionItem
            section={section}
            onToggleVisibility={mockOnToggleVisibility}
          />
        </DndWrapper>
      );

      const hideButton = screen.getByTestId("hide-section-education-button");
      const tooltipWrapper = hideButton.parentElement!;

      expect(tooltipWrapper).toHaveAttribute("aria-label", "Hide this section");
    });

    it("should show 'Show this section' tooltip for hidden sections", () => {
      const section = {
        id: "certifications",
        type: "certifications" as const,
        title: "Certifications",
        visible: false,
        order: 5,
      };

      render(
        <DndWrapper>
          <SortableSectionItem
            section={section}
            onToggleVisibility={mockOnToggleVisibility}
          />
        </DndWrapper>
      );

      const hideButton = screen.getByTestId("hide-section-certifications-button");
      const tooltipWrapper = hideButton.parentElement!;

      expect(tooltipWrapper).toHaveAttribute("aria-label", "Show this section");
    });
  });

  describe("All Sections Can Toggle Except Personal Info", () => {
    const sections = [
      { id: "personal_info", canToggle: false },
      { id: "professional_summary", canToggle: true },
      { id: "work_experience", canToggle: true },
      { id: "education", canToggle: true },
      { id: "skills", canToggle: true },
      { id: "certifications", canToggle: true },
      { id: "projects", canToggle: true },
      { id: "awards", canToggle: true },
      { id: "publications", canToggle: true },
      { id: "volunteer_experience", canToggle: true },
    ];

    sections.forEach(({ id, canToggle }) => {
      it(`${id} section should ${canToggle ? "be" : "not be"} toggleable`, () => {
        const section = {
          id,
          type: id as any,
          title: id.replace(/_/g, " "),
          visible: true,
          order: 1,
        };

        render(
          <DndWrapper>
            <SortableSectionItem
              section={section}
              onToggleVisibility={mockOnToggleVisibility}
            />
          </DndWrapper>
        );

        const hideButton = screen.getByTestId(`hide-section-${id}-button`);

        if (canToggle) {
          expect(hideButton).not.toBeDisabled();
        } else {
          expect(hideButton).toBeDisabled();
        }
      });
    });
  });

  describe("Visual Feedback", () => {
    it("should display ViewIcon when section is visible", () => {
      const section = {
        id: "skills",
        type: "skills" as const,
        title: "Skills",
        visible: true,
        order: 1,
      };

      render(
        <DndWrapper>
          <SortableSectionItem
            section={section}
            onToggleVisibility={mockOnToggleVisibility}
          />
        </DndWrapper>
      );

      // Check that ViewIcon is rendered (by checking for VisibilityIcon testid)
      const viewIcon = screen.getByTestId("VisibilityIcon");
      expect(viewIcon).toBeInTheDocument();
    });

    it("should display HideIcon when section is hidden", () => {
      const section = {
        id: "awards",
        type: "awards" as const,
        title: "Awards",
        visible: false,
        order: 1,
      };

      render(
        <DndWrapper>
          <SortableSectionItem
            section={section}
            onToggleVisibility={mockOnToggleVisibility}
          />
        </DndWrapper>
      );

      // Check that HideIcon is rendered (by checking for VisibilityOffIcon testid)
      const hideIcon = screen.getByTestId("VisibilityOffIcon");
      expect(hideIcon).toBeInTheDocument();
    });

    it("should render list item for both visible and hidden sections", () => {
      const visibleSection = {
        id: "projects",
        type: "projects" as const,
        title: "Projects",
        visible: true,
        order: 1,
      };

      const { rerender } = render(
        <DndWrapper>
          <SortableSectionItem
            section={visibleSection}
            onToggleVisibility={mockOnToggleVisibility}
          />
        </DndWrapper>
      );

      // Check visible section renders
      expect(screen.getByText("Projects")).toBeInTheDocument();

      // Rerender with hidden section
      const hiddenSection = { ...visibleSection, visible: false };
      rerender(
        <DndWrapper>
          <SortableSectionItem
            section={hiddenSection}
            onToggleVisibility={mockOnToggleVisibility}
          />
        </DndWrapper>
      );

      // Check hidden section still renders
      expect(screen.getByText("Projects")).toBeInTheDocument();
    });
  });
});
