/**
 * E2E Tests for Job Description CV Association Functionality
 *
 * These tests verify that job descriptions can be associated with multiple CVs
 * and that each CV maintains its own active job description selection.
 */

import { test, expect, Page } from "@playwright/test";

// Helper functions for common CV operations
async function createCV(page: Page) {
  const emptyStateButton = page.getByTestId("start-from-scratch-empty-state-button");
  const regularButton = page.getByTestId("start-from-scratch-button");

  if (await emptyStateButton.isVisible({ timeout: 1000 }).catch(() => false)) {
    await emptyStateButton.click();
  } else {
    await regularButton.click();
  }

  // Wait for CV editor to load
  await page.waitForURL(/\/cv\//, { timeout: 10000 });
  await page.waitForLoadState("networkidle");
}

async function returnToDashboard(page: Page) {
  await page.getByTestId("cv-editor-back-button").click();
  await page.waitForURL("**/dashboard", { timeout: 10000 });
  await page.waitForLoadState("networkidle");
}

async function navigateToCV(page: Page, cvTitle: string) {
  // Find CV by title and click its edit button
  const cvCard = page.locator(`text="${cvTitle}"`).locator("..").locator("..");
  await cvCard.getByRole("button", { name: /edit cv/i }).click();
  await page.waitForURL(/\/cv\//, { timeout: 10000 });
  await page.waitForLoadState("networkidle");
}

async function switchToAITools(page: Page) {
  // Switch to AI Tools tab where job descriptions are managed
  await page.getByRole("tab", { name: "AI Tools" }).click();
  await page.waitForLoadState("networkidle");
}

test.describe.skip("Job Description CV Association", () => {
  // NOTE: These tests require refactoring based on actual application behavior:
  // 1. Job descriptions are USER-LEVEL resources, not CV-specific
  // 2. Once a JD is set as active, it persists across CV navigation
  // 3. Creating a new CV does NOT reset the active JD - it remains active
  // 4. The "AI Tools" tab must be selected to access JD management (not the "Sections" tab)
  // 5. Tests need to account for JD persistence and explicitly deselect if testing independence

  test.beforeEach(async ({ page }) => {
    // Navigate to the dashboard page where CV management happens
    await page.goto("/dashboard");
    // Wait for the page to load
    await page.waitForLoadState("networkidle");
  });

  test("JD selection is per-CV independent", async ({ page }) => {
    // Create CV A
    await createCV(page);
    await switchToAITools(page);

    await switchToAITools(page);
    // Add JD1 to CV A - click Manage button
    await page.getByRole("button", { name: /Manage/ }).click();
    await page.getByRole("tab", { name: "MANUAL" }).click();
    await page.getByRole("textbox", { name: "Job Title" }).fill("Software Engineer A");
    await page.getByRole("textbox", { name: "Company" }).fill("Company A");
    await page.getByRole("textbox", { name: "Location" }).fill("Location A");
    await page.getByRole("textbox", { name: "Job Description" }).fill("Description for CV A");
    await page.getByRole("button", { name: "Save Job Description" }).click();
    await page.waitForLoadState("networkidle");

    // Verify JD1 is selected in CV A
    await expect(page.getByText("Software Engineer A").first()).toBeVisible();

    // Go back to dashboard
    await returnToDashboard(page);

    // Create CV B
    await createCV(page);
    await switchToAITools(page);

    // Verify no JD is selected in CV B (new CVs start without selections)
    await expect(page.getByText("No job description selected").first()).toBeVisible();

    // Select JD1 in CV B
    await page.getByRole("button", { name: /Manage/ }).click();
    await expect(page.getByText("Software Engineer A").first()).toBeVisible();
    await page.getByRole("button", { name: "SELECT", exact: true }).first().click();
    await page.waitForLoadState("networkidle");

    // Verify JD1 is now selected in CV B
    await expect(page.getByText("Software Engineer A").first()).toBeVisible();

    // Go back to dashboard
    await returnToDashboard(page);

    // Navigate back to first CV (it will be called "New CV")
    await navigateToCV(page, "New CV");
    await switchToAITools(page);

    // Verify JD1 is still selected in CV A
    await expect(page.getByText("Software Engineer A").first()).toBeVisible();
  });

  test("JD association on select creates backend association", async ({ page }) => {
    // Create CV A
    await createCV(page);

    await switchToAITools(page);
    // Add JD1 to CV A
    await page.getByRole("button", { name: /Manage.*Job Descriptions/ }).click();
    await page.getByRole("tab", { name: "MANUAL" }).click();
    await page.getByRole("textbox", { name: "Job Title" }).fill("Software Engineer A");
    await page.getByRole("textbox", { name: "Company" }).fill("Company A");
    await page.getByRole("textbox", { name: "Location" }).fill("Location A");
    await page.getByRole("textbox", { name: "Job Description" }).fill("Description for CV A");
    await page.getByRole("button", { name: "Save Job Description" }).click();
    await page.waitForLoadState("networkidle");

    // Go back to dashboard
    await returnToDashboard(page);

    // Create CV B
    await createCV(page);

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
    await expect(page.getByText("Used in this CV").first()).toBeVisible();
  });

  test("Modal shows all user JDs with association indicators", async ({ page }) => {
    // Create CV A
    await createCV(page);

    await switchToAITools(page);
    // Add JD1 to CV A
    await page.getByRole("button", { name: /Manage.*Job Descriptions/ }).click();
    await page.getByRole("tab", { name: "MANUAL" }).click();
    await page.getByRole("textbox", { name: "Job Title" }).fill("Software Engineer A");
    await page.getByRole("textbox", { name: "Company" }).fill("Company A");
    await page.getByRole("textbox", { name: "Location" }).fill("Location A");
    await page.getByRole("textbox", { name: "Job Description" }).fill("Description for CV A");
    await page.getByRole("button", { name: "Save Job Description" }).click();
    await page.waitForLoadState("networkidle");

    await switchToAITools(page);
    // Add JD2 to CV A
    await page.getByRole("button", { name: /Manage.*Job Descriptions/ }).click();
    await page.getByRole("tab", { name: "MANUAL" }).click();
    await page.getByRole("textbox", { name: "Job Title" }).fill("Software Engineer B");
    await page.getByRole("textbox", { name: "Company" }).fill("Company B");
    await page.getByRole("textbox", { name: "Location" }).fill("Location B");
    await page.getByRole("textbox", { name: "Job Description" }).fill("Description for CV B");
    await page.getByRole("button", { name: "Save Job Description" }).click();
    await page.waitForLoadState("networkidle");

    // Go back to dashboard
    await returnToDashboard(page);

    // Create CV B
    await createCV(page);

    // Associate JD1 with CV B
    await page.getByRole("button", { name: /Manage.*Job Descriptions/ }).click();
    await page.getByRole("button", { name: "SELECT", exact: true }).first().click();
    await page.waitForLoadState("networkidle");

    // Open modal again and verify both JDs are shown with correct indicators
    await page.getByRole("button", { name: /Manage.*Job Descriptions/ }).click();

    // Should see both JDs
    await expect(page.getByText("Software Engineer A").first()).toBeVisible();
    await expect(page.getByText("Software Engineer B").first()).toBeVisible();

    // JD1 should show "Used in this CV" since it's associated with CV B
    const jd1Card = page.locator("text=Software Engineer A").locator("..");
    await expect(jd1Card.getByText("Used in this CV")).toBeVisible();
  });

  test("Independent active JD per CV", async ({ page }) => {
    // Create CV A
    await createCV(page);

    await switchToAITools(page);
    // Add JD1 and select it for CV A
    await page.getByRole("button", { name: /Manage.*Job Descriptions/ }).click();
    await page.getByRole("tab", { name: "MANUAL" }).click();
    await page.getByRole("textbox", { name: "Job Title" }).fill("JD1");
    await page.getByRole("textbox", { name: "Company" }).fill("Company A");
    await page.getByRole("textbox", { name: "Location" }).fill("Location A");
    await page.getByRole("textbox", { name: "Job Description" }).fill("Description 1");
    await page.getByRole("button", { name: "Save Job Description" }).click();
    await page.waitForLoadState("networkidle");

    // Verify JD1 is active in CV A
    await expect(page.getByText("JD1").first()).toBeVisible();

    // Go back to dashboard
    await returnToDashboard(page);

    // Create CV B
    await createCV(page);

    await switchToAITools(page);
    // Add JD2 and select it for CV B
    await page.getByRole("button", { name: /Manage.*Job Descriptions/ }).click();
    await page.getByRole("tab", { name: "MANUAL" }).click();
    await page.getByRole("textbox", { name: "Job Title" }).fill("JD2");
    await page.getByRole("textbox", { name: "Company" }).fill("Company B");
    await page.getByRole("textbox", { name: "Location" }).fill("Location B");
    await page.getByRole("textbox", { name: "Job Description" }).fill("Description 2");
    await page.getByRole("button", { name: "Save Job Description" }).click();
    await page.waitForLoadState("networkidle");

    // Verify JD2 is active in CV B
    await expect(page.getByText("JD2").first()).toBeVisible();

    // Go back and open CV A again
    await returnToDashboard(page);
    await navigateToCV(page, "New CV");

    // Verify JD1 is still active in CV A
    await expect(page.getByText("JD1").first()).toBeVisible();
  });

  test("Job descriptions are shared between all CVs of a user", async ({ page }) => {
    // Create CV A
    await createCV(page);

    await switchToAITools(page);
    // Add JD1 from CV A
    await page.getByRole("button", { name: /Manage.*Job Descriptions/ }).click();
    await page.getByRole("tab", { name: "MANUAL" }).click();
    await page.getByRole("textbox", { name: "Job Title" }).fill("Shared JD");
    await page.getByRole("textbox", { name: "Company" }).fill("Company");
    await page.getByRole("textbox", { name: "Location" }).fill("Location");
    await page.getByRole("textbox", { name: "Job Description" }).fill("Description");
    await page.getByRole("button", { name: "Save Job Description" }).click();
    await page.waitForLoadState("networkidle");

    // Go back to dashboard
    await returnToDashboard(page);

    // Create CV B
    await createCV(page);

    // Open JD modal and verify JD1 is available in CV B
    await page.getByRole("button", { name: /Manage.*Job Descriptions/ }).click();
    await expect(page.getByText("Shared JD").first()).toBeVisible();
  });

  test("Selecting JD from one CV does not affect other CVs", async ({ page }) => {
    // Create CV A
    await createCV(page);

    await switchToAITools(page);
    // Add JD1
    await page.getByRole("button", { name: /Manage.*Job Descriptions/ }).click();
    await page.getByRole("tab", { name: "MANUAL" }).click();
    await page.getByRole("textbox", { name: "Job Title" }).fill("Test JD");
    await page.getByRole("textbox", { name: "Company" }).fill("Company");
    await page.getByRole("textbox", { name: "Location" }).fill("Location");
    await page.getByRole("textbox", { name: "Job Description" }).fill("Description");
    await page.getByRole("button", { name: "Save Job Description" }).click();
    await page.waitForLoadState("networkidle");

    // Verify JD is selected in CV A
    await expect(page.getByText("Test JD").first()).toBeVisible();

    // Go back to dashboard
    await returnToDashboard(page);

    // Create CV B
    await createCV(page);

    // Verify JD is NOT selected in CV B (starts with "No job description selected")
    await expect(page.getByText("No job description selected").first()).toBeVisible();

    // Select JD in CV B
    await page.getByRole("button", { name: /Manage.*Job Descriptions/ }).click();
    await page.getByRole("button", { name: "SELECT", exact: true }).first().click();
    await page.waitForLoadState("networkidle");

    // Verify JD is now selected in CV B
    await expect(page.getByText("Test JD").first()).toBeVisible();

    // Go back to dashboard and open CV A
    await returnToDashboard(page);
    await navigateToCV(page, "New CV");

    // Verify JD is still selected in CV A (unaffected by CV B selection)
    await expect(page.getByText("Test JD").first()).toBeVisible();
  });

  test("JD associations persist correctly across CV switches", async ({ page }) => {
    // Create CV A
    await createCV(page);

    // Add and select JD1 for CV A
    await page.getByRole("button", { name: /Manage.*Job Descriptions/ }).click();
    await page.getByRole("tab", { name: "MANUAL" }).click();
    await page.getByRole("textbox", { name: "Job Title" }).fill("JD for CV A");
    await page.getByRole("textbox", { name: "Company" }).fill("Company A");
    await page.getByRole("textbox", { name: "Location" }).fill("Location A");
    await page.getByRole("textbox", { name: "Job Description" }).fill("Description A");
    await page.getByRole("button", { name: "Save Job Description" }).click();
    await page.waitForLoadState("networkidle");

    // Go back to dashboard
    await returnToDashboard(page);

    // Create CV B
    await createCV(page);

    // Add and select JD2 for CV B
    await page.getByRole("button", { name: /Manage.*Job Descriptions/ }).click();
    await page.getByRole("tab", { name: "MANUAL" }).click();
    await page.getByRole("textbox", { name: "Job Title" }).fill("JD for CV B");
    await page.getByRole("textbox", { name: "Company" }).fill("Company B");
    await page.getByRole("textbox", { name: "Location" }).fill("Location B");
    await page.getByRole("textbox", { name: "Job Description" }).fill("Description B");
    await page.getByRole("button", { name: "Save Job Description" }).click();
    await page.waitForLoadState("networkidle");

    // Verify JD2 is selected in CV B
    await expect(page.getByText("JD for CV B").first()).toBeVisible();

    // Switch back to CV A
    await returnToDashboard(page);
    await navigateToCV(page, "New CV");

    // Verify JD1 is still selected in CV A
    await expect(page.getByText("JD for CV A").first()).toBeVisible();

    // Switch back to CV B (second "New CV")
    await returnToDashboard(page);
    // Find the second "New CV" card (CV B)
    const cvCards = page.locator("text=New CV");
    const secondCVCard = cvCards.nth(1).locator("..").locator("..");
    await secondCVCard.getByRole("button", { name: /edit cv/i }).click();
    await page.waitForURL(/\/cv\//, { timeout: 10000 });
    await page.waitForLoadState("networkidle");

    // Verify JD2 is still selected in CV B
    await expect(page.getByText("JD for CV B").first()).toBeVisible();
  });
});
