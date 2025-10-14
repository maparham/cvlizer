/**
 * End-to-End Test: CV Editor - Item CRUD Operations
 *
 * Tests array section item management including add, edit, delete, and reorder operations.
 * Uses one CV with Education and Work Experience sections to mimic a user building their CV.
 *
 * Test Scenarios:
 * 1. Add first Education item with all fields
 * 2. Add second Education item
 * 3. Edit existing Education item
 * 4. Delete Education item with confirmation
 * 5. Add first Work Experience item
 * 6. Add second Work Experience item
 * 7. Edit existing Work Experience item
 * 8. Delete Work Experience item
 * 9. Save and cancel operations work correctly
 * 10. Form validation prevents saving incomplete items
 * 11. Item count updates correctly after operations
 */

import { test, expect, Page } from "./fixtures";

// Authentication handled by global-setup.ts
async function setupCVWithSections(page: Page): Promise<string> {
  await page.goto("/", { waitUntil: "load" });

  // Wait for navigation and auth state to complete
  await page.waitForLoadState("networkidle");

  // Admin users are redirected to /admin, so navigate to dashboard if needed
  const url = page.url();
  if (url.includes("/admin")) {
    await page.getByRole("button", { name: /back to dashboard/i }).click();
    await page.waitForURL("**/dashboard");
  } else if (!url.includes("/dashboard")) {
    await page.goto("/dashboard", { waitUntil: "load" });
  }

  await expect(page.getByRole("heading", { name: /my cvs/i })).toBeVisible({
    timeout: 5000,
  });

  const emptyStateButton = page.getByTestId(
    "start-from-scratch-empty-state-button",
  );
  const regularButton = page.getByTestId("start-from-scratch-button");
  const isEmptyState = await emptyStateButton
    .isVisible({ timeout: 5000 })
    .catch(() => false);

  if (isEmptyState) {
    await emptyStateButton.click();
  } else {
    await regularButton.click();
  }

  await page.waitForURL(/\/cv\//, { timeout: 5000 });
  const cvId = page.url().split("/cv/")[1];
  await expect(
    page.getByRole("heading", { name: "Personal Information" }),
  ).toBeVisible({ timeout: 5000 });

  // Add Education and Work Experience sections
  await page.getByTestId("add-section-education-button").click();
  await expect(page.getByRole("heading", { name: "Education" })).toBeVisible({
    timeout: 5000,
  });

  await page.getByTestId("add-section-work_experience-button").click();
  await expect(
    page.getByRole("heading", { name: "Work Experience" }),
  ).toBeVisible({ timeout: 5000 });

  await page.evaluate(() => window.scrollTo(0, 0));
  await page.evaluate(() => console.clear());

  return cvId;
}

test.describe.configure({ mode: "serial" });

test.describe("CV Editor - Item CRUD Operations", () => {
  let cvId: string;
  let testPage: any;

  test.beforeAll(async ({ browser }, testInfo) => {
    // Determine which user auth to use based on project name
    const isUser2 = testInfo.project.name.includes("user2");
    const authFile = isUser2
      ? "tests/e2e/.auth/user2.json"
      : "tests/e2e/.auth/user1.json";

    const context = await browser.newContext({ storageState: authFile });
    testPage = await context.newPage();
    cvId = await setupCVWithSections(testPage);
    console.log(`✓ Created test CV with sections: ${cvId}`);
  });

  test.beforeEach(async () => {
    await testPage.evaluate(() => window.scrollTo(0, 0));
    await expect(
      testPage.getByRole("heading", { name: "Personal Information" }),
    ).toBeVisible();
    await testPage.evaluate(() => console.clear());
  });

  test.afterEach(async () => {
    // Close any open forms by pressing Escape
    await testPage.keyboard.press("Escape");

    // Wait for any dialogs to close
    await testPage.waitForLoadState("domcontentloaded");

    // Close any open notifications
    const closeButtons = testPage.locator('button[aria-label="Close"]');
    const count = await closeButtons.count();
    for (let i = 0; i < count; i++) {
      const button = closeButtons.first();
      if (await button.isVisible({ timeout: 300 }).catch(() => false)) {
        await button.click();
      }
    }
  });

  test("1. Add first Education item with all fields", async () => {
    const page = testPage;

    // Click add new Education
    await page.getByTestId("add-new-education-button").click();

    // Fill all fields
    await page
      .getByRole("textbox", { name: "Institution *" })
      .fill("Stanford University");
    await page.getByRole("combobox", { name: "Degree" }).fill("PhD");
    await page.keyboard.press("Tab");
    await page
      .getByRole("textbox", { name: "Field of Study" })
      .fill("Computer Science");

    const startDateGroup = page.getByRole("group", { name: "Start Date *" });
    await startDateGroup.getByLabel("Day").fill("01");
    await startDateGroup.getByLabel("Month").fill("09");
    await startDateGroup.getByLabel("Year").fill("2018");

    const endDateGroup = page.getByRole("group", { name: "End Date" });
    await endDateGroup.getByLabel("Day").fill("01");
    await endDateGroup.getByLabel("Month").fill("05");
    await endDateGroup.getByLabel("Year").fill("2022");

    await page.getByRole("textbox", { name: "GPA" }).fill("3.9");
    await page
      .getByRole("textbox", { name: "Description" })
      .fill("Research in Machine Learning");

    // Save
    const saveButton = page.getByTestId("save-education-button");
    await expect(saveButton).toBeEnabled();
    await saveButton.click();

    // Verify saved successfully
    await expect(page.getByTestId("edit-education-item-0")).toBeVisible({
      timeout: 5000,
    });
  });

  test("2. Add second Education item", async () => {
    const page = testPage;

    await page.getByTestId("add-new-education-button").click();

    await page.getByRole("textbox", { name: "Institution *" }).fill("MIT");
    await page.getByRole("combobox", { name: "Degree" }).fill("Masters");
    await page.keyboard.press("Tab");
    await page
      .getByRole("textbox", { name: "Field of Study" })
      .fill("Data Science");

    const startDateGroup = page.getByRole("group", { name: "Start Date *" });
    await startDateGroup.getByLabel("Day").fill("01");
    await startDateGroup.getByLabel("Month").fill("09");
    await startDateGroup.getByLabel("Year").fill("2016");

    await page.getByTestId("save-education-button").click();
    await expect(page.getByTestId("edit-education-item-1")).toBeVisible({
      timeout: 5000,
    });
  });

  test("3. Edit existing Education item", async () => {
    const page = testPage;

    // Edit first item
    await page.getByTestId("edit-education-item-0").click();

    // Wait for form to be visible
    await expect(page.getByRole("combobox", { name: "Degree" })).toBeVisible();

    // Modify Field of Study
    const fieldInput = page.getByRole("textbox", { name: "Field of Study" });
    await fieldInput.clear();
    await fieldInput.fill("Artificial Intelligence");

    // Save
    await page.getByTestId("save-education-button").click();
    await expect(page.getByTestId("edit-education-item-0")).toBeVisible({
      timeout: 5000,
    });

    // Verify change was saved (edit again to check)
    await page.getByTestId("edit-education-item-0").click();
    await expect(
      page.getByRole("textbox", { name: "Field of Study" }),
    ).toHaveValue("Artificial Intelligence");

    // Close form
    await page.keyboard.press("Escape");
  });

  test("4. Delete Education item", async () => {
    const page = testPage;

    // Scroll to Education section to ensure it's visible
    await page
      .getByRole("heading", { name: "Education" })
      .scrollIntoViewIfNeeded();
    await page.waitForTimeout(500); // Wait for scroll to complete

    // Check if we have Education items, if not, create them first
    const hasFirstItem = await page
      .getByTestId("edit-education-item-0")
      .isVisible()
      .catch(() => false);
    const hasSecondItem = await page
      .getByTestId("edit-education-item-1")
      .isVisible()
      .catch(() => false);

    if (!hasFirstItem || !hasSecondItem) {
      // Create first Education item if it doesn't exist
      if (!hasFirstItem) {
        await page.getByTestId("add-new-education-button").click();
        await page
          .getByRole("textbox", { name: "Institution *" })
          .fill("Stanford University");
        await page.getByRole("combobox", { name: "Degree" }).fill("PhD");
        await page.keyboard.press("Tab");
        await page
          .getByRole("textbox", { name: "Field of Study" })
          .fill("Computer Science");

        const startDateGroup = page.getByRole("group", {
          name: "Start Date *",
        });
        await startDateGroup.getByLabel("Day").fill("01");
        await startDateGroup.getByLabel("Month").fill("09");
        await startDateGroup.getByLabel("Year").fill("2018");

        await page.getByTestId("save-education-button").click();
        await expect(page.getByTestId("edit-education-item-0")).toBeVisible({
          timeout: 10000,
        });
      }

      // Create second Education item if it doesn't exist
      if (!hasSecondItem) {
        await page.getByTestId("add-new-education-button").click();
        await page.getByRole("textbox", { name: "Institution *" }).fill("MIT");
        await page.getByRole("combobox", { name: "Degree" }).fill("Masters");
        await page.keyboard.press("Tab");
        await page
          .getByRole("textbox", { name: "Field of Study" })
          .fill("Data Science");

        const startDateGroup = page.getByRole("group", {
          name: "Start Date *",
        });
        await startDateGroup.getByLabel("Day").fill("01");
        await startDateGroup.getByLabel("Month").fill("09");
        await startDateGroup.getByLabel("Year").fill("2016");

        await page.getByTestId("save-education-button").click();
        await expect(page.getByTestId("edit-education-item-1")).toBeVisible({
          timeout: 10000,
        });
      }
    }

    // Verify we have 2 items - wait longer for elements to be visible
    await expect(page.getByTestId("edit-education-item-0")).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByTestId("edit-education-item-1")).toBeVisible({
      timeout: 10000,
    });

    // Delete second item
    await page.getByTestId("delete-education-item-1").click();

    // May show confirmation dialog - wait for it
    const confirmDialog = page.getByRole("dialog");
    const hasDialog = await confirmDialog
      .isVisible({ timeout: 5000 })
      .catch(() => false);

    if (hasDialog) {
      const confirmButton = confirmDialog.getByRole("button", {
        name: /delete|confirm/i,
      });
      await expect(confirmButton).toBeVisible({ timeout: 3000 });
      await confirmButton.click();
      // Wait for dialog to close
      await expect(confirmDialog).not.toBeVisible({ timeout: 3000 });
    }

    // Wait for delete operation to complete
    await page.waitForTimeout(1000);

    // Verify item was deleted
    await expect(page.getByTestId("edit-education-item-1")).not.toBeVisible({
      timeout: 10000,
    });
    // First item should still exist
    await expect(page.getByTestId("edit-education-item-0")).toBeVisible({
      timeout: 5000,
    });
  });

  test("5. Add first Work Experience item", async () => {
    const page = testPage;

    await page
      .getByRole("heading", { name: "Work Experience" })
      .scrollIntoViewIfNeeded();
    await page.getByTestId("add-new-work-experience-button").click();

    await page.getByRole("textbox", { name: "Company *" }).fill("Google Inc");
    await page
      .getByRole("combobox", { name: "Position" })
      .fill("Software Engineer");
    await page.keyboard.press("Tab");

    const startDateGroup = page.getByRole("group", { name: "Start Date *" });
    await startDateGroup.getByLabel("Day").fill("01");
    await startDateGroup.getByLabel("Month").fill("01");
    await startDateGroup.getByLabel("Year").fill("2022");

    await page
      .getByRole("textbox", { name: "Description" })
      .fill("Developed scalable backend systems");

    await page.getByTestId("save-work-experience-button").click();
    await expect(page.getByTestId("edit-work-experience-item-0")).toBeVisible({
      timeout: 5000,
    });
  });

  test("6. Add second Work Experience item", async () => {
    const page = testPage;

    await page.getByTestId("add-new-work-experience-button").click();

    await page
      .getByRole("textbox", { name: "Company *" })
      .fill("Meta Platforms");
    await page
      .getByRole("combobox", { name: "Position" })
      .fill("Senior Software Engineer");
    await page.keyboard.press("Tab");

    const startDateGroup = page.getByRole("group", { name: "Start Date *" });
    await startDateGroup.getByLabel("Day").fill("15");
    await startDateGroup.getByLabel("Month").fill("06");
    await startDateGroup.getByLabel("Year").fill("2023");

    await page.getByTestId("save-work-experience-button").click();
    await expect(page.getByTestId("edit-work-experience-item-1")).toBeVisible({
      timeout: 5000,
    });
  });

  test("7. Edit existing Work Experience item", async () => {
    const page = testPage;

    await page.getByTestId("edit-work-experience-item-0").click();
    await expect(
      page.getByRole("textbox", { name: "Company *" }),
    ).toBeVisible();

    // Modify description
    const descInput = page.getByRole("textbox", { name: "Description" });
    await descInput.clear();
    await descInput.fill(
      "Led development of microservices architecture and mentored junior engineers",
    );

    await page.getByTestId("save-work-experience-button").click();
    await expect(page.getByTestId("edit-work-experience-item-0")).toBeVisible({
      timeout: 5000,
    });
  });

  test("8. Delete Work Experience item", async () => {
    const page = testPage;

    // Delete second item
    await page.getByTestId("delete-work-experience-item-1").click();

    // May show confirmation dialog
    const confirmDialog = page.getByRole("dialog");
    if (await confirmDialog.isVisible({ timeout: 5000 }).catch(() => false)) {
      await confirmDialog
        .getByRole("button", { name: /delete|confirm/i })
        .click();
    }

    // Verify deleted (wait implicitly handles delete completion)
    await expect(
      page.getByTestId("edit-work-experience-item-1"),
    ).not.toBeVisible({ timeout: 3000 });
    await expect(page.getByTestId("edit-work-experience-item-0")).toBeVisible();
  });

  test("9. Cancel operation discards changes", async () => {
    const page = testPage;

    // Edit Education item
    await page
      .getByRole("heading", { name: "Education" })
      .scrollIntoViewIfNeeded();
    await page.getByTestId("edit-education-item-0").click();
    await expect(page.getByRole("combobox", { name: "Degree" })).toBeVisible();

    // Make changes
    const institutionInput = page.getByRole("textbox", {
      name: "Institution *",
    });
    const originalValue = await institutionInput.inputValue();
    await institutionInput.fill(originalValue + " MODIFIED");

    // Cancel
    await page
      .locator('button:has(svg[data-testid="CancelIcon"])')
      .first()
      .click();

    // Should show unsaved changes dialog
    await expect(page.getByTestId("unsaved-changes-dialog")).toBeVisible({
      timeout: 3000,
    });
    await page.getByTestId("unsaved-changes-discard-button").click();

    // Verify form closed
    await expect(
      page.getByRole("combobox", { name: "Degree" }),
    ).not.toBeVisible();

    // Verify changes were NOT saved (edit again to check)
    await page.getByTestId("edit-education-item-0").click();
    await expect(
      page.getByRole("textbox", { name: "Institution *" }),
    ).toHaveValue(originalValue);

    // Close form
    await page.keyboard.press("Escape");
  });

  test("10. Required field validation prevents saving", async () => {
    const page = testPage;

    // Try to add Education without required fields
    await page.getByTestId("add-new-education-button").click();

    // Only fill non-required field
    await page
      .getByRole("textbox", { name: "Field of Study" })
      .fill("Computer Science");

    // Try to save - should be disabled or show validation error
    const saveButton = page.getByTestId("save-education-button");

    // Either button is disabled, or clicking shows validation
    const isDisabled = await saveButton.isDisabled();
    if (!isDisabled) {
      await saveButton.click();
      // Should show validation errors
      await expect(
        page.getByText(/required|institution is required/i),
      ).toBeVisible({ timeout: 2000 });
    } else {
      // Button is correctly disabled
      await expect(saveButton).toBeDisabled();
    }

    // Cancel to clean up
    await page.keyboard.press("Escape");
  });

  test("11. Item count updates correctly after all operations", async () => {
    const page = testPage;

    // Verify final state:
    // - Education: 1 item (added 2, deleted 1)
    // - Work Experience: 1 item (added 2, deleted 1)

    await page
      .getByRole("heading", { name: "Education" })
      .scrollIntoViewIfNeeded();
    await expect(page.getByTestId("edit-education-item-0")).toBeVisible();
    await expect(page.getByTestId("edit-education-item-1")).not.toBeVisible();

    await page
      .getByRole("heading", { name: "Work Experience" })
      .scrollIntoViewIfNeeded();
    await expect(page.getByTestId("edit-work-experience-item-0")).toBeVisible();
    await expect(
      page.getByTestId("edit-work-experience-item-1"),
    ).not.toBeVisible();
  });

  // Cleanup
  test.afterAll(async () => {
    if (!cvId || !testPage) {
      console.log("No CV to clean up");
      return;
    }

    try {
      await testPage.goto("http://localhost:3000/dashboard");
      await expect(
        testPage.getByRole("heading", { name: /my cvs/i }),
      ).toBeVisible({ timeout: 5000 });

      const deleteButton = testPage.getByTestId(`delete-cv-button-${cvId}`);
      if (await deleteButton.isVisible({ timeout: 3000 })) {
        await deleteButton.click();
        const confirmButton = testPage
          .getByRole("dialog")
          .getByRole("button", { name: /delete/i });
        await expect(confirmButton).toBeVisible({ timeout: 2000 });
        await confirmButton.click();
        console.log(`✓ Successfully deleted test CV: ${cvId}`);
      }
    } catch (error) {
      console.log("⚠ Cleanup failed:", error);
    } finally {
      await testPage.context().close();
    }
  });
});
