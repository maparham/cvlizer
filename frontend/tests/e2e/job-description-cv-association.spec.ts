/**
 * E2E Tests for Job Description CV Association Functionality
 *
 * These tests verify that job descriptions can be associated with multiple CVs
 * and that each CV maintains its own active job description selection.
 */

import { test, expect } from "@playwright/test";

test.describe("Job Description CV Association", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the CV editor page
    await page.goto("/");
    // Wait for the page to load
    await page.waitForLoadState("networkidle");
  });

  test("JD selection is per-CV independent", async ({ page }) => {
    // Create CV A
    await page.getByRole("button", { name: "Create New CV" }).click();
    await page.getByRole("textbox", { name: "CV Title" }).fill("Test CV A");
    await page.getByRole("button", { name: "Create CV" }).click();
    await page.waitForLoadState("networkidle");

    // Add JD1 to CV A
    await page.getByRole("button", { name: /Manage.*Job Descriptions/ }).click();
    await page.getByRole("tab", { name: "MANUAL" }).click();
    await page.getByRole("textbox", { name: "Job Title" }).fill("Software Engineer A");
    await page.getByRole("textbox", { name: "Company" }).fill("Company A");
    await page.getByRole("textbox", { name: "Location" }).fill("Location A");
    await page.getByRole("textbox", { name: "Job Description" }).fill("Description for CV A");
    await page.getByRole("button", { name: "Save Job Description" }).click();

    // Verify JD1 is selected in CV A
    await expect(page.getByText("Software Engineer A")).toBeVisible();
    await expect(page.getByRole("button", { name: "SELECTED" })).toBeVisible();

    // Create CV B
    await page.getByRole("button", { name: "Create New CV" }).click();
    await page.getByRole("textbox", { name: "CV Title" }).fill("Test CV B");
    await page.getByRole("button", { name: "Create CV" }).click();
    await page.waitForLoadState("networkidle");

    // Verify no JD is selected in CV B
    await expect(page.getByText("No job description selected")).toBeVisible();

    // Select JD1 in CV B
    await page.getByRole("button", { name: /Manage.*Job Descriptions/ }).click();
    await expect(page.getByText("Software Engineer A")).toBeVisible();
    await page.getByRole("button", { name: "SELECT", exact: true }).first().click();

    // Verify JD1 is now selected in CV B
    await expect(page.getByRole("button", { name: "SELECTED" })).toBeVisible();

    // Switch back to CV A
    await page.getByRole("button", { name: "Test CV A" }).click();
    await page.waitForLoadState("networkidle");

    // Verify JD1 is still selected in CV A
    await expect(page.getByText("Software Engineer A")).toBeVisible();
    await expect(page.getByRole("button", { name: "SELECTED" })).toBeVisible();
  });

  test("JD association on select creates backend association", async ({ page }) => {
    // Create CV A with JD1
    await page.getByRole("button", { name: "Create New CV" }).click();
    await page.getByRole("textbox", { name: "CV Title" }).fill("Test CV A");
    await page.getByRole("button", { name: "Create CV" }).click();
    await page.waitForLoadState("networkidle");

    // Add JD1 to CV A
    await page.getByRole("button", { name: /Manage.*Job Descriptions/ }).click();
    await page.getByRole("tab", { name: "MANUAL" }).click();
    await page.getByRole("textbox", { name: "Job Title" }).fill("Software Engineer A");
    await page.getByRole("textbox", { name: "Company" }).fill("Company A");
    await page.getByRole("textbox", { name: "Location" }).fill("Location A");
    await page.getByRole("textbox", { name: "Job Description" }).fill("Description for CV A");
    await page.getByRole("button", { name: "Save Job Description" }).click();

    // Create CV B
    await page.getByRole("button", { name: "Create New CV" }).click();
    await page.getByRole("textbox", { name: "CV Title" }).fill("Test CV B");
    await page.getByRole("button", { name: "Create CV" }).click();
    await page.waitForLoadState("networkidle");

    // Monitor network requests for association API call
    const associationPromise = page.waitForRequest(request =>
      request.url().includes("/api/job-descriptions/") &&
      request.url().includes("/cvs/") &&
      request.method() === "POST"
    );

    // Open JD modal in CV B and select JD1
    await page.getByRole("button", { name: /Manage.*Job Descriptions/ }).click();
    await page.getByRole("button", { name: "SELECT", exact: true }).first().click();

    // Verify association API call was made
    await associationPromise;

    // Verify JD1 is now associated with CV B (shows "Used in this CV" indicator)
    await page.getByRole("button", { name: /Manage.*Job Descriptions/ }).click();
    await expect(page.getByText("Used in this CV")).toBeVisible();
  });

  test("Modal shows all user JDs with association indicators", async ({ page }) => {
    // Create CV A with JD1
    await page.getByRole("button", { name: "Create New CV" }).click();
    await page.getByRole("textbox", { name: "CV Title" }).fill("Test CV A");
    await page.getByRole("button", { name: "Create CV" }).click();
    await page.waitForLoadState("networkidle");

    // Add JD1 to CV A
    await page.getByRole("button", { name: /Manage.*Job Descriptions/ }).click();
    await page.getByRole("tab", { name: "MANUAL" }).click();
    await page.getByRole("textbox", { name: "Job Title" }).fill("Software Engineer A");
    await page.getByRole("textbox", { name: "Company" }).fill("Company A");
    await page.getByRole("textbox", { name: "Location" }).fill("Location A");
    await page.getByRole("textbox", { name: "Job Description" }).fill("Description for CV A");
    await page.getByRole("button", { name: "Save Job Description" }).click();

    // Add JD2 to CV A
    await page.getByRole("button", { name: /Manage.*Job Descriptions/ }).click();
    await page.getByRole("tab", { name: "MANUAL" }).click();
    await page.getByRole("textbox", { name: "Job Title" }).fill("Software Engineer B");
    await page.getByRole("textbox", { name: "Company" }).fill("Company B");
    await page.getByRole("textbox", { name: "Location" }).fill("Location B");
    await page.getByRole("textbox", { name: "Job Description" }).fill("Description for CV B");
    await page.getByRole("button", { name: "Save Job Description" }).click();

    // Create CV B
    await page.getByRole("button", { name: "Create New CV" }).click();
    await page.getByRole("textbox", { name: "CV Title" }).fill("Test CV B");
    await page.getByRole("button", { name: "Create CV" }).click();
    await page.waitForLoadState("networkidle");

    // Open JD modal in CV B
    await page.getByRole("button", { name: /Manage.*Job Descriptions/ }).click();

    // Verify modal shows both JD1 and JD2
    await expect(page.getByText("Software Engineer A")).toBeVisible();
    await expect(page.getByText("Software Engineer B")).toBeVisible();

    // Verify both JDs are visible (not filtered by association)

    // Verify neither is marked as selected for CV B
    await expect(page.getByRole("button", { name: "SELECTED" })).not.toBeVisible();
  });

  test("Independent active JD per CV", async ({ page }) => {
    // Create CV A
    await page.getByRole("button", { name: "Create New CV" }).click();
    await page.getByRole("textbox", { name: "CV Title" }).fill("Test CV A");
    await page.getByRole("button", { name: "Create CV" }).click();
    await page.waitForLoadState("networkidle");

    // Add JD1 to CV A
    await page.getByRole("button", { name: /Manage.*Job Descriptions/ }).click();
    await page.getByRole("tab", { name: "MANUAL" }).click();
    await page.getByRole("textbox", { name: "Job Title" }).fill("Software Engineer A");
    await page.getByRole("textbox", { name: "Company" }).fill("Company A");
    await page.getByRole("textbox", { name: "Location" }).fill("Location A");
    await page.getByRole("textbox", { name: "Job Description" }).fill("Description for CV A");
    await page.getByRole("button", { name: "Save Job Description" }).click();

    // Create CV B
    await page.getByRole("button", { name: "Create New CV" }).click();
    await page.getByRole("textbox", { name: "CV Title" }).fill("Test CV B");
    await page.getByRole("button", { name: "Create CV" }).click();
    await page.waitForLoadState("networkidle");

    // Add JD2 to CV B
    await page.getByRole("button", { name: /Manage.*Job Descriptions/ }).click();
    await page.getByRole("tab", { name: "MANUAL" }).click();
    await page.getByRole("textbox", { name: "Job Title" }).fill("Software Engineer B");
    await page.getByRole("textbox", { name: "Company" }).fill("Company B");
    await page.getByRole("textbox", { name: "Location" }).fill("Location B");
    await page.getByRole("textbox", { name: "Job Description" }).fill("Description for CV B");
    await page.getByRole("button", { name: "Save Job Description" }).click();

    // Switch to CV A - verify JD1 is active
    await page.getByRole("button", { name: "Test CV A" }).click();
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("Software Engineer A")).toBeVisible();

    // Switch to CV B - verify JD2 is active
    await page.getByRole("button", { name: "Test CV B" }).click();
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("Software Engineer B")).toBeVisible();

    // Switch back to CV A - verify JD1 is still active
    await page.getByRole("button", { name: "Test CV A" }).click();
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("Software Engineer A")).toBeVisible();
  });

  test("Job descriptions are shared between all CVs of a user", async ({ page }) => {
    // Create CV A and add JD1
    await page.getByRole("button", { name: "Create New CV" }).click();
    await page.getByRole("textbox", { name: "CV Title" }).fill("CV A");
    await page.getByRole("button", { name: "Create CV" }).click();
    await page.waitForLoadState("networkidle");

    // Add JD1 to CV A
    await page.getByRole("button", { name: /Manage.*Job Descriptions/ }).click();
    await page.getByRole("tab", { name: "MANUAL" }).click();
    await page.getByRole("textbox", { name: "Job Title" }).fill("Software Engineer at TechCorp");
    await page.getByRole("textbox", { name: "Company" }).fill("TechCorp");
    await page.getByRole("textbox", { name: "Location" }).fill("San Francisco");
    await page.getByRole("textbox", { name: "Job Description" }).fill("Build amazing software");
    await page.getByRole("button", { name: "Save Job Description" }).click();
    await page.waitForTimeout(1000); // Wait for JD to be saved

    // Add JD2 to CV A
    await page.getByRole("button", { name: /Manage.*Job Descriptions/ }).click();
    await page.getByRole("tab", { name: "MANUAL" }).click();
    await page.getByRole("textbox", { name: "Job Title" }).fill("Product Manager at StartupCo");
    await page.getByRole("textbox", { name: "Company" }).fill("StartupCo");
    await page.getByRole("textbox", { name: "Location" }).fill("New York");
    await page.getByRole("textbox", { name: "Job Description" }).fill("Lead product development");
    await page.getByRole("button", { name: "Save Job Description" }).click();
    await page.waitForTimeout(1000); // Wait for JD to be saved

    // Create CV B
    await page.getByRole("button", { name: "Create New CV" }).click();
    await page.getByRole("textbox", { name: "CV Title" }).fill("CV B");
    await page.getByRole("button", { name: "Create CV" }).click();
    await page.waitForLoadState("networkidle");

    // Open JD modal in CV B - should show both JD1 and JD2
    await page.getByRole("button", { name: /Manage.*Job Descriptions/ }).click();

    // Verify both JDs are visible in CV B's modal
    await expect(page.getByText("Software Engineer at TechCorp")).toBeVisible();
    await expect(page.getByText("Product Manager at StartupCo")).toBeVisible();

    // Verify both show company and location info
    await expect(page.getByText("TechCorp")).toBeVisible();
    await expect(page.getByText("San Francisco")).toBeVisible();
    await expect(page.getByText("StartupCo")).toBeVisible();
    await expect(page.getByText("New York")).toBeVisible();

    // Close modal
    await page.getByRole("button", { name: "Close" }).click();

    // Create CV C
    await page.getByRole("button", { name: "Create New CV" }).click();
    await page.getByRole("textbox", { name: "CV Title" }).fill("CV C");
    await page.getByRole("button", { name: "Create CV" }).click();
    await page.waitForLoadState("networkidle");

    // Open JD modal in CV C - should also show both JD1 and JD2
    await page.getByRole("button", { name: /Manage.*Job Descriptions/ }).click();

    // Verify both JDs are visible in CV C's modal too
    await expect(page.getByText("Software Engineer at TechCorp")).toBeVisible();
    await expect(page.getByText("Product Manager at StartupCo")).toBeVisible();
  });

  test("Selecting JD from one CV does not affect other CVs", async ({ page }) => {
    // Create CV A and add JD1
    await page.getByRole("button", { name: "Create New CV" }).click();
    await page.getByRole("textbox", { name: "CV Title" }).fill("CV A");
    await page.getByRole("button", { name: "Create CV" }).click();
    await page.waitForLoadState("networkidle");

    // Add JD1 to CV A
    await page.getByRole("button", { name: /Manage.*Job Descriptions/ }).click();
    await page.getByRole("tab", { name: "MANUAL" }).click();
    await page.getByRole("textbox", { name: "Job Title" }).fill("Engineer Role");
    await page.getByRole("textbox", { name: "Company" }).fill("Company A");
    await page.getByRole("textbox", { name: "Location" }).fill("City A");
    await page.getByRole("textbox", { name: "Job Description" }).fill("Engineering work");
    await page.getByRole("button", { name: "Save Job Description" }).click();
    await page.waitForTimeout(1000);

    // Add JD2 to CV A
    await page.getByRole("button", { name: /Manage.*Job Descriptions/ }).click();
    await page.getByRole("tab", { name: "MANUAL" }).click();
    await page.getByRole("textbox", { name: "Job Title" }).fill("Manager Role");
    await page.getByRole("textbox", { name: "Company" }).fill("Company B");
    await page.getByRole("textbox", { name: "Location" }).fill("City B");
    await page.getByRole("textbox", { name: "Job Description" }).fill("Management work");
    await page.getByRole("button", { name: "Save Job Description" }).click();
    await page.waitForTimeout(1000);

    // Select JD1 in CV A
    await page.getByRole("button", { name: /Manage.*Job Descriptions/ }).click();
    await page.getByRole("button", { name: "SELECT", exact: true }).first().click();
    await page.waitForTimeout(500);

    // Verify JD1 is active in CV A (should show in sidebar)
    await expect(page.getByText("Engineer Role")).toBeVisible();
    await expect(page.getByText("Company A")).toBeVisible();

    // Create CV B
    await page.getByRole("button", { name: "Create New CV" }).click();
    await page.getByRole("textbox", { name: "CV Title" }).fill("CV B");
    await page.getByRole("button", { name: "Create CV" }).click();
    await page.waitForLoadState("networkidle");

    // Verify CV B has no active JD initially (sidebar should be empty or show placeholder)
    await expect(page.getByText("Engineer Role")).not.toBeVisible();
    await expect(page.getByText("Company A")).not.toBeVisible();

    // Open JD modal in CV B and select JD2
    await page.getByRole("button", { name: /Manage.*Job Descriptions/ }).click();
    await page.getByRole("button", { name: "SELECT", exact: true }).nth(1).click(); // Select second JD
    await page.waitForTimeout(500);

    // Verify JD2 is now active in CV B
    await expect(page.getByText("Manager Role")).toBeVisible();
    await expect(page.getByText("Company B")).toBeVisible();
    // JD1 should not be visible in CV B
    await expect(page.getByText("Engineer Role")).not.toBeVisible();

    // Switch back to CV A - should still have JD1 active
    await page.getByRole("button", { name: "CV A" }).click();
    await page.waitForLoadState("networkidle");

    // Verify CV A still has JD1 active
    await expect(page.getByText("Engineer Role")).toBeVisible();
    await expect(page.getByText("Company A")).toBeVisible();
    // JD2 should not be visible in CV A
    await expect(page.getByText("Manager Role")).not.toBeVisible();

    // Switch back to CV B - should still have JD2 active
    await page.getByRole("button", { name: "CV B" }).click();
    await page.waitForLoadState("networkidle");

    // Verify CV B still has JD2 active
    await expect(page.getByText("Manager Role")).toBeVisible();
    await expect(page.getByText("Company B")).toBeVisible();
    await expect(page.getByText("Engineer Role")).not.toBeVisible();
  });

  test("JD associations persist correctly across CV switches", async ({ page }) => {
    // Create CV A and add JD1
    await page.getByRole("button", { name: "Create New CV" }).click();
    await page.getByRole("textbox", { name: "CV Title" }).fill("CV A");
    await page.getByRole("button", { name: "Create CV" }).click();
    await page.waitForLoadState("networkidle");

    // Add JD1 to CV A
    await page.getByRole("button", { name: /Manage.*Job Descriptions/ }).click();
    await page.getByRole("tab", { name: "MANUAL" }).click();
    await page.getByRole("textbox", { name: "Job Title" }).fill("Shared Role");
    await page.getByRole("textbox", { name: "Company" }).fill("Shared Company");
    await page.getByRole("textbox", { name: "Location" }).fill("Shared City");
    await page.getByRole("textbox", { name: "Job Description" }).fill("This role should be shared");
    await page.getByRole("button", { name: "Save Job Description" }).click();
    await page.waitForTimeout(1000);

    // Select JD1 in CV A
    await page.getByRole("button", { name: /Manage.*Job Descriptions/ }).click();
    await page.getByRole("button", { name: "SELECT", exact: true }).first().click();
    await page.waitForTimeout(500);

    // Create CV B
    await page.getByRole("button", { name: "Create New CV" }).click();
    await page.getByRole("textbox", { name: "CV Title" }).fill("CV B");
    await page.getByRole("button", { name: "Create CV" }).click();
    await page.waitForLoadState("networkidle");

    // Select the same JD1 in CV B
    await page.getByRole("button", { name: /Manage.*Job Descriptions/ }).click();
    await page.getByRole("button", { name: "SELECT", exact: true }).first().click();
    await page.waitForTimeout(500);

    // Verify JD1 is active in CV B
    await expect(page.getByText("Shared Role")).toBeVisible();

    // Switch back to CV A
    await page.getByRole("button", { name: "CV A" }).click();
    await page.waitForLoadState("networkidle");

    // Verify JD1 is still active in CV A
    await expect(page.getByText("Shared Role")).toBeVisible();

    // Create CV C
    await page.getByRole("button", { name: "Create New CV" }).click();
    await page.getByRole("textbox", { name: "CV Title" }).fill("CV C");
    await page.getByRole("button", { name: "Create CV" }).click();
    await page.waitForLoadState("networkidle");

    // Verify JD1 is available in CV C's modal
    await page.getByRole("button", { name: /Manage.*Job Descriptions/ }).click();
    await expect(page.getByText("Shared Role")).toBeVisible();
    await expect(page.getByText("Shared Company")).toBeVisible();

    // Select JD1 in CV C
    await page.getByRole("button", { name: "SELECT", exact: true }).first().click();
    await page.waitForTimeout(500);

    // Verify JD1 is now active in CV C
    await expect(page.getByText("Shared Role")).toBeVisible();

    // Switch back to CV A - should still work
    await page.getByRole("button", { name: "CV A" }).click();
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("Shared Role")).toBeVisible();

    // Switch back to CV B - should still work
    await page.getByRole("button", { name: "CV B" }).click();
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("Shared Role")).toBeVisible();
  });

});
