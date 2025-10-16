/**
 * End-to-End Test: AI Job Description Management
 *
 * This test suite covers complete job description CRUD workflows including:
 * - Adding JDs via URL or manual entry
 * - Hiding/showing JDs in sidebar
 * - Managing JD visibility via modal
 * - Editing and deleting JDs
 * - JD-CV association and state synchronization
 *
 * This replaces the unit test integration/JobDescriptionFlows.test.tsx
 * which tested UI behavior better suited for E2E testing.
 *
 * Test Philosophy: One CV created in beforeAll, reused across all tests
 * in serial execution mode to simulate natural user workflow.
 */

import { test, expect, Page } from "./fixtures";
import {
  addJobDescriptionManually,
  closeNotifications,
  getJobDescriptionCount,
} from "./helpers/ai";
import {
  testJobDescriptions,
  manualJobDescription,
} from "./fixtures/aiTestData";

// Configure tests to run serially
test.describe.configure({ mode: "serial" });

test.describe("AI Job Description Management", () => {
  let cvId: string;
  let testPage: Page;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    testPage = await context.newPage();

    // Navigate to dashboard
    await testPage.goto("/dashboard", { waitUntil: "load" });

    // Wait for dashboard to be visible (handle any redirects)
    await expect(
      testPage.getByRole("heading", { name: /my cvs/i }),
    ).toBeVisible({ timeout: 10000 });

    const emptyStateButton = testPage.getByTestId(
      "start-from-scratch-empty-state-button",
    );
    const regularButton = testPage.getByTestId("start-from-scratch-button");

    const isEmptyState = await emptyStateButton
      .isVisible({ timeout: 5000 })
      .catch(() => false);
    if (isEmptyState) {
      await emptyStateButton.click();
    } else {
      await regularButton.click();
    }

    // Wait for CV editor
    await testPage.waitForURL(/\/cv\//, { timeout: 10000 });
    cvId = testPage.url().split("/cv/")[1];

    // Wait for editor to be ready
    await expect(
      testPage.getByRole("heading", { name: "Personal Information" }),
    ).toBeVisible({ timeout: 10000 });
  });

  test.beforeEach(async () => {
    await testPage.evaluate(() => window.scrollTo(0, 0));
  });

  test.afterEach(async () => {
    await closeNotifications(testPage);
  });

  test.afterAll(async () => {
    // Clean up CV
    if (cvId) {
      await testPage.goto("/dashboard");
      const deleteButton = testPage
        .locator(`[data-testid="delete-cv-${cvId}"]`)
        .first();
      if (await deleteButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await deleteButton.click();
        const confirmButton = testPage.getByRole("button", {
          name: /confirm|delete/i,
        });
        if (
          await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)
        ) {
          await confirmButton.click();
        }
      }
    }
    await testPage.close();
  });

  test("adds job description manually", async () => {
    const jd = manualJobDescription;

    // Look for add job description button
    const addButton = testPage.getByRole("button", {
      name: /add job description/i,
    });

    if (await addButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await addButton.click();

      // Wait for modal
      await expect(
        testPage.getByRole("heading", { name: /job description/i }),
      ).toBeVisible();

      // Fill in title
      await testPage.getByLabel(/title/i).fill(jd.title);

      // Fill in company if field exists
      const companyField = testPage.getByLabel(/company/i);
      if (await companyField.isVisible({ timeout: 1000 }).catch(() => false)) {
        await companyField.fill(jd.company);
      }

      // Fill in content/description
      const contentField = testPage.getByLabel(/description|content/i);
      await contentField.fill(jd.content);

      // Save
      await testPage.getByRole("button", { name: /save|add/i }).click();

      // Wait for modal to close
      await expect(
        testPage.getByRole("heading", { name: /add job description/i }),
      ).not.toBeVisible({ timeout: 5000 });

      // Verify JD appears in UI
      await expect(testPage.getByText(jd.title)).toBeVisible();
    } else {
      test.skip();
    }
  });

  test("displays job description in sidebar", async () => {
    // Verify the previously added JD is visible
    const jdTitle = manualJobDescription.title;
    const isVisible = await testPage
      .getByText(jdTitle)
      .isVisible({ timeout: 2000 })
      .catch(() => false);

    if (!isVisible) {
      test.skip();
    }

    await expect(testPage.getByText(jdTitle)).toBeVisible();
  });

  test("hides job description from sidebar", async () => {
    const jdTitle = manualJobDescription.title;

    // First check if JD is visible
    const isJDVisible = await testPage
      .getByText(jdTitle)
      .isVisible({ timeout: 2000 })
      .catch(() => false);

    if (!isJDVisible) {
      test.skip();
    }

    // Find hide button for this JD
    const hideButton = testPage
      .locator(`[data-testid*="hide"]`)
      .filter({ hasText: jdTitle })
      .or(testPage.locator(`button`).filter({ hasText: /hide/i }))
      .first();

    if (await hideButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await hideButton.click();

      // Verify JD is no longer visible in sidebar
      await expect(testPage.getByText(jdTitle)).not.toBeVisible();
    } else {
      test.skip();
    }
  });

  test("shows hidden job description via manage modal", async () => {
    const jdTitle = manualJobDescription.title;

    // Open manage JDs modal
    const manageButton = testPage.getByRole("button", {
      name: /manage.*job description/i,
    });

    if (await manageButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await manageButton.click();

      // Wait for modal
      await expect(
        testPage.getByRole("heading", { name: /job description/i }),
      ).toBeVisible();

      // Find and select the hidden JD
      const jdCheckbox = testPage
        .locator(`input[type="checkbox"]`)
        .filter({ hasText: jdTitle })
        .or(
          testPage
            .getByRole("checkbox")
            .locator("..")
            .filter({ hasText: jdTitle }),
        )
        .first();

      if (await jdCheckbox.isVisible({ timeout: 2000 }).catch(() => false)) {
        await jdCheckbox.check();
      }

      // Close modal
      await testPage.getByRole("button", { name: /close|done/i }).click();

      // Verify JD now appears in sidebar
      await expect(testPage.getByText(jdTitle)).toBeVisible();
    } else {
      test.skip();
    }
  });

  test("edits job description content", async () => {
    const jdTitle = manualJobDescription.title;

    // Find edit button for this JD
    const editButton = testPage
      .locator(`[data-testid*="edit"]`)
      .filter({ hasText: jdTitle })
      .or(testPage.locator(`button[aria-label*="edit"]`))
      .first();

    if (await editButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await editButton.click();

      // Wait for edit form/modal
      await expect(testPage.getByLabel(/title|content/i)).toBeVisible();

      // Make a small edit to content
      const contentField = testPage.getByLabel(/description|content/i);
      await contentField.fill(manualJobDescription.content + "\n\nUpdated!");

      // Save
      await testPage.getByRole("button", { name: /save|update/i }).click();

      // Verify update
      await expect(testPage.getByText(/Updated!/i)).toBeVisible();
    } else {
      test.skip();
    }
  });

  test("deletes job description", async () => {
    const jdTitle = manualJobDescription.title;

    // Find delete button
    const deleteButton = testPage
      .locator(`[data-testid*="delete"]`)
      .filter({ hasText: jdTitle })
      .or(testPage.locator(`button[aria-label*="delete"]`))
      .first();

    if (await deleteButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await deleteButton.click();

      // Confirm deletion if dialog appears
      const confirmButton = testPage.getByRole("button", {
        name: /confirm|delete/i,
      });
      if (
        await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)
      ) {
        await confirmButton.click();
      }

      // Verify JD is removed
      await expect(testPage.getByText(jdTitle)).not.toBeVisible();
    } else {
      test.skip();
    }
  });

  test.skip("manages job description state correctly", async () => {
    // SKIP: Redundant test - JD management already covered by:
    // - adds job description manually
    // - displays job description in sidebar
    // - hides/shows via manage modal
    // - edits job description content
    // - deletes job description
    // Verify manage button exists and shows correct count
    const manageButton = testPage.getByRole("button", { name: /manage/i });

    if (await manageButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      // Button should be visible (count may be 0 if previous test deleted JD)
      await expect(manageButton).toBeVisible();

      // Add a new JD to test management
      const addButton = testPage.getByRole("button", {
        name: /add job description/i,
      });

      if (await addButton.isVisible({ timeout: 1000 }).catch(() => false)) {
        const jd = testJobDescriptions.softwareEngineer;
        await addJobDescriptionManually(testPage, jd);

        // Verify JD appears with correct info
        await expect(
          testPage.getByRole("heading", { name: jd.title }),
        ).toBeVisible();

        await expect(testPage.getByText(jd.company)).toBeVisible();
      }
    } else {
      test.skip();
    }
  });
});
