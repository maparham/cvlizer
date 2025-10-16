/**
 * End-to-End Test: Critical User Journeys
 *
 * Tests complete, realistic user workflows from start to finish.
 * Each test represents a common user journey through the application.
 *
 * Test Scenarios:
 * 1. Complete CV creation journey: Create → Add sections → Fill data → Save
 * 2. Edit existing CV journey: Open → Edit multiple sections → Save
 * 3. CV lifecycle journey: Create → Edit → Duplicate → Delete original
 * 4. Multi-section workflow: Add Education → Add Experience → Add Skills → Preview all
 */

import { test, expect, Page } from "./fixtures";
import {
  TEST_TIMEOUT,
  VALIDATION_WAIT,
  EXTERNAL_SERVICE_TIMEOUT,
} from "./test-constants";

test.describe("Critical User Journeys", () => {
  test("1. Complete CV creation journey: Create → Add sections → Fill data", async ({
    page,
    testUser,
  }) => {
    // Authentication handled by global-setup.ts
    await page.goto("/");

    const url = page.url();
    if (url.includes("/admin")) {
      await page.getByRole("button", { name: /back to dashboard/i }).click();
      await page.waitForURL("**/dashboard");
    } else if (!url.includes("/dashboard")) {
      await page.goto("/dashboard");
    }

    await expect(page.getByRole("heading", { name: /my cvs/i })).toBeVisible();

    // Create new CV
    const startButton = (await page
      .getByTestId("start-from-scratch-empty-state-button")
      .isVisible({ timeout: TEST_TIMEOUT })
      .catch(() => false))
      ? page.getByTestId("start-from-scratch-empty-state-button")
      : page.getByTestId("start-from-scratch-button");

    await startButton.click();
    await page.waitForURL(/\/cv\//, { timeout: TEST_TIMEOUT });
    const cvId = page.url().split("/cv/")[1];

    // Fill Personal Information
    await page.getByTestId("edit-section-personal_info-button").click();

    // Wait for form to render by checking for first input field
    const nameInput = page
      .getByTestId("personal-info-full-name-input")
      .locator("input");
    await expect(nameInput).toBeVisible({ timeout: TEST_TIMEOUT });

    await nameInput.click();
    await page
      .getByTestId("personal-info-full-name-input")
      .locator("input")
      .fill(testUser.displayName);

    await page
      .getByTestId("personal-info-email-input")
      .locator("input")
      .click();
    await page
      .getByTestId("personal-info-email-input")
      .locator("input")
      .fill(testUser.email);

    await page
      .getByTestId("personal-info-phone-input")
      .locator("input")
      .click();
    await page
      .getByTestId("personal-info-phone-input")
      .locator("input")
      .fill("+1 555-0123");

    await page.getByRole("combobox", { name: "Location" }).click();
    await page.getByRole("combobox", { name: "Location" }).fill("New York, NY");
    await page.keyboard.press("Tab"); // Close autocomplete
    await page.waitForTimeout(VALIDATION_WAIT);

    const saveButton = page
      .locator('button:has(svg[data-testid="SaveIcon"])')
      .first();
    await expect(saveButton).toBeEnabled({ timeout: TEST_TIMEOUT });

    // Get current temp CV ID
    const tempCvId = page.url().split("/cv/")[1];

    // Click save - this will save the temp CV and navigate to the saved CV with real ID
    await saveButton.click();

    // Wait for navigation from temp ID to real ID (happens after first save of new CV)
    await page.waitForURL(
      (url) =>
        url.pathname.includes("/cv/") && !url.pathname.includes(tempCvId),
      { timeout: TEST_TIMEOUT },
    );

    // Add Education
    await page.getByTestId("add-section-education-button").click();
    await expect(page.getByRole("heading", { name: "Education" })).toBeVisible({
      timeout: TEST_TIMEOUT,
    });

    await page.getByTestId("add-new-education-button").click();

    // Wait for form to be visible
    const institutionInput = page.getByRole("textbox", {
      name: "Institution *",
    });
    await expect(institutionInput).toBeVisible({ timeout: TEST_TIMEOUT });

    await institutionInput.fill("Harvard University");
    await page.getByRole("combobox", { name: "Degree" }).fill("MBA");
    await page.keyboard.press("Tab");

    const eduStartDate = page.getByRole("group", { name: "Start Date *" });
    await eduStartDate.getByLabel("Day").fill("01");
    await eduStartDate.getByLabel("Month").fill("09");
    await eduStartDate.getByLabel("Year").fill("2015");

    await page.getByTestId("save-education-button").click();
    await expect(page.getByTestId("edit-education-item-0")).toBeVisible({
      timeout: TEST_TIMEOUT,
    });

    // Add Work Experience
    await page.getByTestId("add-section-work_experience-button").click();
    await expect(
      page.getByRole("heading", { name: "Work Experience" }),
    ).toBeVisible({ timeout: TEST_TIMEOUT });

    await page.getByTestId("add-new-work-experience-button").click();
    await page.getByRole("textbox", { name: "Company *" }).fill("Amazon");
    await page
      .getByRole("combobox", { name: "Position" })
      .fill("Product Manager");
    await page.keyboard.press("Tab");

    const expStartDate = page.getByRole("group", { name: "Start Date *" });
    await expStartDate.getByLabel("Day").fill("01");
    await expStartDate.getByLabel("Month").fill("01");
    await expStartDate.getByLabel("Year").fill("2017");

    await page
      .getByRole("textbox", { name: "Description" })
      .fill("Led product strategy for AWS services");

    await page.getByTestId("save-work-experience-button").click();
    await expect(page.getByTestId("edit-work-experience-item-0")).toBeVisible({
      timeout: TEST_TIMEOUT,
    });

    // Add Professional Summary
    await page.getByTestId("add-section-professional_summary-button").click();
    await expect(
      page.getByRole("heading", { name: "Professional Summary" }),
    ).toBeVisible({ timeout: TEST_TIMEOUT });

    await page.getByTestId("edit-section-professional_summary-button").click();

    // Wait for textarea to render - increase timeout for slower rendering
    const summaryTextarea = page.getByTestId("professional-summary-textarea");
    await expect(summaryTextarea).toBeVisible({ timeout: 10000 });

    await summaryTextarea.click();
    await page
      .getByTestId("professional-summary-textarea")
      .fill(
        "Experienced product manager with a strong background in technology and business strategy.",
      );

    await page
      .locator('button:has(svg[data-testid="SaveIcon"])')
      .first()
      .click();

    // Verify complete CV has all sections
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(
      page.getByRole("heading", { name: "Personal Information" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Education" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Work Experience" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Professional Summary" }).first(),
    ).toBeVisible();

    // Go back to dashboard
    await page.getByTestId("cv-editor-back-button").click();
    await page.waitForURL("**/dashboard");

    console.log(`✓ Created complete CV: ${cvId}`);
  });

  test("2. Edit existing CV journey: Open → Edit multiple sections", async ({
    page,
    testUser,
  }) => {
    // Authentication handled by global-setup.ts
    await page.goto("/");

    const url = page.url();
    if (url.includes("/admin")) {
      await page.getByRole("button", { name: /back to dashboard/i }).click();
      await page.waitForURL("**/dashboard");
    } else if (!url.includes("/dashboard")) {
      await page.goto("/dashboard");
    }

    await expect(page.getByRole("heading", { name: /my cvs/i })).toBeVisible();

    // Create a CV first
    const startButton = (await page
      .getByTestId("start-from-scratch-empty-state-button")
      .isVisible({ timeout: TEST_TIMEOUT })
      .catch(() => false))
      ? page.getByTestId("start-from-scratch-empty-state-button")
      : page.getByTestId("start-from-scratch-button");

    await startButton.click();
    await page.waitForURL(/\/cv\//, { timeout: TEST_TIMEOUT });

    // Save personal info to convert temp CV to real CV with UUID
    await page.getByTestId("edit-section-personal_info-button").click();

    // Wait for form to fully render
    const nameInput = page
      .getByTestId("personal-info-full-name-input")
      .locator("input");
    await expect(nameInput).toBeVisible({ timeout: TEST_TIMEOUT });

    await nameInput.click();
    await page
      .getByTestId("personal-info-full-name-input")
      .locator("input")
      .fill(testUser.displayName);

    await page
      .getByTestId("personal-info-email-input")
      .locator("input")
      .click();
    await page
      .getByTestId("personal-info-email-input")
      .locator("input")
      .fill(testUser.email);

    await page.getByRole("combobox", { name: "Location" }).click();
    await page.getByRole("combobox", { name: "Location" }).fill("Boston, MA");
    await page.keyboard.press("Tab"); // Close autocomplete
    await page.waitForTimeout(VALIDATION_WAIT);

    const saveButton = page
      .locator('button:has(svg[data-testid="SaveIcon"])')
      .first();
    // Wait for save button to become enabled after validation
    await expect(saveButton).toBeEnabled({ timeout: TEST_TIMEOUT });

    const tempCvId = page.url().split("/cv/")[1];
    await saveButton.click();

    // Wait for navigation from temp ID to real ID
    await page.waitForURL(
      (url) =>
        url.pathname.includes("/cv/") && !url.pathname.includes(tempCvId),
      { timeout: TEST_TIMEOUT },
    );

    // Extract the real CV ID
    const cvId = page.url().split("/cv/")[1];

    // Go back to dashboard
    await page.getByTestId("cv-editor-back-button").click();
    await page.waitForURL("**/dashboard");

    // Now open the CV for editing
    await page.getByTestId(`edit-cv-button-${cvId}`).click();
    await page.waitForURL(`**/cv/${cvId}`);
    await expect(
      page.getByRole("heading", { name: "Personal Information" }),
    ).toBeVisible();

    // Edit Personal Info
    await page.getByTestId("edit-section-personal_info-button").click();

    // Wait for form to render
    const phoneInput = page
      .getByTestId("personal-info-phone-input")
      .locator("input");
    await expect(phoneInput).toBeVisible({ timeout: TEST_TIMEOUT });

    await phoneInput.click();
    await page
      .getByTestId("personal-info-phone-input")
      .locator("input")
      .fill("+1 555-9999");
    await page
      .locator('button:has(svg[data-testid="SaveIcon"])')
      .first()
      .click();

    // Add Education section first
    await page.getByTestId("add-section-education-button").click();
    await page.getByTestId("add-new-education-button").click();
    await page.getByRole("combobox", { name: "Degree" }).fill("MBA");
    await page.keyboard.press("Tab");
    await page.getByRole("textbox", { name: "Institution *" }).fill("Harvard");
    const eduStart = page.getByRole("group", { name: "Start Date *" });
    await eduStart.getByLabel("Day").fill("01");
    await eduStart.getByLabel("Month").fill("09");
    await eduStart.getByLabel("Year").fill("2015");
    await page.getByTestId("save-education-button").click();

    // Now edit the Education item
    await page
      .getByRole("heading", { name: "Education" })
      .scrollIntoViewIfNeeded();
    await page.getByTestId("edit-education-item-0").click();
    const gpaInput = page.getByRole("textbox", { name: "GPA" });
    await gpaInput.fill("3.8");
    await page.getByTestId("save-education-button").click();
    await expect(page.getByTestId("edit-education-item-0")).toBeVisible({
      timeout: TEST_TIMEOUT,
    });

    // Add Work Experience section first
    await page.getByTestId("add-section-work_experience-button").click();
    await page.getByTestId("add-new-work-experience-button").click();
    await page.getByRole("combobox", { name: "Position" }).fill("Manager");
    await page.keyboard.press("Tab");
    await page.getByRole("textbox", { name: "Company *" }).fill("Google");
    const expStart = page.getByRole("group", { name: "Start Date *" });
    await expStart.getByLabel("Day").fill("01");
    await expStart.getByLabel("Month").fill("01");
    await expStart.getByLabel("Year").fill("2018");
    await page.getByTestId("save-work-experience-button").click();

    // Now edit Work Experience
    await page
      .getByRole("heading", { name: "Work Experience" })
      .scrollIntoViewIfNeeded();
    await page.getByTestId("edit-work-experience-item-0").click();

    const descInput = page.getByRole("textbox", { name: "Description" });
    await descInput.fill("Led product strategy and launched 5 major features");

    await page.getByTestId("save-work-experience-button").click();
    await expect(page.getByTestId("edit-work-experience-item-0")).toBeVisible({
      timeout: TEST_TIMEOUT,
    });

    // Return to dashboard
    await page.getByTestId("cv-editor-back-button").click();
    await page.waitForURL("**/dashboard");

    console.log(`✓ Edited CV across multiple sections: ${cvId}`);
  });

  test("3. CV lifecycle journey: Create → Edit → Duplicate → Delete original", async ({
    page,
    testUser,
  }) => {
    // Authentication handled by global-setup.ts
    await page.goto("/");

    const url = page.url();
    if (url.includes("/admin")) {
      await page.getByRole("button", { name: /back to dashboard/i }).click();
      await page.waitForURL("**/dashboard");
    } else if (!url.includes("/dashboard")) {
      await page.goto("/dashboard");
    }

    await expect(page.getByRole("heading", { name: /my cvs/i })).toBeVisible();

    // Create new CV
    const startButton = (await page
      .getByTestId("start-from-scratch-empty-state-button")
      .isVisible({ timeout: TEST_TIMEOUT })
      .catch(() => false))
      ? page.getByTestId("start-from-scratch-empty-state-button")
      : page.getByTestId("start-from-scratch-button");

    await startButton.click();
    await page.waitForURL(/\/cv\//, { timeout: TEST_TIMEOUT });

    // Add some content
    await page.getByTestId("edit-section-personal_info-button").click();

    // Wait for form to render
    const nameInput = page
      .getByTestId("personal-info-full-name-input")
      .locator("input");
    await expect(nameInput).toBeVisible({ timeout: TEST_TIMEOUT });

    await nameInput.click();
    await page
      .getByTestId("personal-info-full-name-input")
      .locator("input")
      .fill(testUser.displayName);

    await page
      .getByTestId("personal-info-email-input")
      .locator("input")
      .click();
    await page
      .getByTestId("personal-info-email-input")
      .locator("input")
      .fill(testUser.email);

    await page.getByRole("combobox", { name: "Location" }).click();
    await page
      .getByRole("combobox", { name: "Location" })
      .fill("San Francisco, CA");
    await page.keyboard.press("Tab"); // Close autocomplete
    await page.waitForTimeout(VALIDATION_WAIT);

    const saveButton = page
      .locator('button:has(svg[data-testid="SaveIcon"])')
      .first();
    // Wait for save button to become enabled after validation
    await expect(saveButton).toBeEnabled({ timeout: TEST_TIMEOUT });

    const tempCvId = page.url().split("/cv/")[1];
    await saveButton.click();

    // Wait for navigation from temp ID to real ID
    await page.waitForURL(
      (url) =>
        url.pathname.includes("/cv/") && !url.pathname.includes(tempCvId),
      { timeout: TEST_TIMEOUT },
    );

    // Extract the real CV ID after save
    const realCvId = page.url().split("/cv/")[1];

    // Back to dashboard
    await page.getByTestId("cv-editor-back-button").click();
    await page.waitForURL("**/dashboard");

    // Open the 3-dot menu and duplicate
    const cvCard = page
      .locator(`[data-testid="edit-cv-button-${realCvId}"]`)
      .locator("..");
    const moreButton = cvCard.locator(
      'button:has(svg[data-testid="MoreVertIcon"])',
    );
    await moreButton.click();
    await page.getByTestId(`duplicate-cv-button-${realCvId}`).click();
    await expect(page.getByText(/duplicated successfully/i)).toBeVisible({
      timeout: TEST_TIMEOUT,
    });

    // Delete the original
    await expect(page.getByTestId(`delete-cv-button-${realCvId}`)).toBeVisible({
      timeout: TEST_TIMEOUT,
    });
    await page.getByTestId(`delete-cv-button-${realCvId}`).click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: /delete/i })
      .click();
    await expect(page.getByText(/deleted successfully/i)).toBeVisible({
      timeout: TEST_TIMEOUT,
    });

    console.log(
      `✓ Completed CV lifecycle: create → duplicate → delete original`,
    );
  });

  test("4. Multi-section workflow: Build complete CV incrementally", async ({
    page,
  }) => {
    // Authentication handled by global-setup.ts
    await page.goto("/");

    const url = page.url();
    if (url.includes("/admin")) {
      await page.getByRole("button", { name: /back to dashboard/i }).click();
      await page.waitForURL("**/dashboard");
    } else if (!url.includes("/dashboard")) {
      await page.goto("/dashboard");
    }

    await expect(page.getByRole("heading", { name: /my cvs/i })).toBeVisible();

    // Create new CV
    const startButton = (await page
      .getByTestId("start-from-scratch-empty-state-button")
      .isVisible({ timeout: TEST_TIMEOUT })
      .catch(() => false))
      ? page.getByTestId("start-from-scratch-empty-state-button")
      : page.getByTestId("start-from-scratch-button");

    await startButton.click();
    await page.waitForURL(/\/cv\//, { timeout: TEST_TIMEOUT });
    const cvId = page.url().split("/cv/")[1];

    // Add Education with item
    await page
      .getByTestId("add-section-education-button")
      .scrollIntoViewIfNeeded();
    await page.getByTestId("add-section-education-button").click();
    await expect(page.getByRole("heading", { name: "Education" })).toBeVisible({
      timeout: TEST_TIMEOUT,
    });

    await page.getByTestId("add-new-education-button").click();

    // Wait for the form to appear with proper state checks
    const degreeField = page.getByRole("combobox", { name: "Degree" });
    await degreeField.waitFor({ state: "attached" });
    await degreeField.waitFor({ state: "visible" });

    // Now interact with it
    await degreeField.click();
    await page.getByRole("combobox", { name: "Degree" }).fill("MBA");
    await page.keyboard.press("Tab");

    await page.getByRole("textbox", { name: "Institution *" }).click();
    await page
      .getByRole("textbox", { name: "Institution *" })
      .fill("UC Berkeley");

    const eduStart = page.getByRole("group", { name: "Start Date *" });
    await eduStart.getByLabel("Day").fill("01");
    await eduStart.getByLabel("Month").fill("09");
    await eduStart.getByLabel("Year").fill("2010");
    await page.getByTestId("save-education-button").click();
    await expect(page.getByTestId("edit-education-item-0")).toBeVisible({
      timeout: TEST_TIMEOUT,
    });

    // Add Work Experience with item
    await page
      .getByTestId("add-section-work_experience-button")
      .scrollIntoViewIfNeeded();
    await page.getByTestId("add-section-work_experience-button").click();
    await expect(
      page.getByRole("heading", { name: "Work Experience" }),
    ).toBeVisible({ timeout: TEST_TIMEOUT });

    await page.getByTestId("add-new-work-experience-button").click();

    // Wait for form to be visible
    await expect(page.getByRole("combobox", { name: "Position" })).toBeVisible({
      timeout: TEST_TIMEOUT,
    });

    await page.getByRole("combobox", { name: "Position" }).click();
    await page
      .getByRole("combobox", { name: "Position" })
      .fill("Software Engineer");
    await page.keyboard.press("Tab");

    await page.getByRole("textbox", { name: "Company *" }).click();
    await page.getByRole("textbox", { name: "Company *" }).fill("Tesla");

    const expStart = page.getByRole("group", { name: "Start Date *" });
    await expStart.getByLabel("Day").fill("01");
    await expStart.getByLabel("Month").fill("06");
    await expStart.getByLabel("Year").fill("2014");
    await page.getByTestId("save-work-experience-button").click();
    await expect(page.getByTestId("edit-work-experience-item-0")).toBeVisible({
      timeout: TEST_TIMEOUT,
    });

    // Add Skills
    await page.getByTestId("add-section-skills-button").click();
    await expect(page.getByRole("heading", { name: "Skills" })).toBeVisible({
      timeout: TEST_TIMEOUT,
    });

    // Verify all sections present
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(
      page.getByRole("heading", { name: "Personal Information" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Education" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Work Experience" }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "Skills" })).toBeVisible();

    // Return to dashboard
    await page.getByTestId("cv-editor-back-button").click();
    await page.waitForURL("**/dashboard");

    console.log(`✓ Built complete CV incrementally: ${cvId}`);
  });

  // Note: Tests create CVs but don't clean them up automatically
  // Manual cleanup can be done through the dashboard if needed
});
