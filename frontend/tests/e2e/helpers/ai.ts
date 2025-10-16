/**
 * Helper functions for AI feature E2E tests
 *
 * This module provides reusable helper functions for testing AI features
 * including drafts, job descriptions, content enhancement, and job fit analysis.
 */

import { expect, Page } from "@playwright/test";
import { TestJobDescription } from "../fixtures/aiTestData";

/**
 * Wait for AI parsing to complete on a CV
 */
export async function waitForAIParsing(
  page: Page,
  timeout: number = 30000,
): Promise<void> {
  // Wait for parsing status indicator or completion message
  await expect(page.getByText(/parsing complete|ready/i)).toBeVisible({
    timeout,
  });
}

/**
 * Add a job description via URL
 */
export async function addJobDescriptionViaUrl(
  page: Page,
  jd: TestJobDescription,
): Promise<void> {
  // Click AI Tools tab to reveal job description button
  const aiToolsTab = page.getByRole("tab", { name: /ai tools/i });
  const tabVisible = await aiToolsTab
    .isVisible({ timeout: 2000 })
    .catch(() => false);

  if (tabVisible) {
    // Check if tab is not already selected
    const isSelected = await aiToolsTab.getAttribute("aria-selected");
    if (isSelected !== "true") {
      await aiToolsTab.click();
      // Small delay to let tab content render
      await page.waitForTimeout(500);
    }
  }

  // Wait for and click the add button
  const addButton = page.getByRole("button", { name: /add job description/i });
  await addButton.waitFor({ state: "visible", timeout: 10000 });
  await addButton.scrollIntoViewIfNeeded();
  await addButton.click();

  // Wait for modal to appear - heading is "Job Description" not "Add Job Description"
  await expect(
    page.getByRole("heading", { name: /^job description$/i }),
  ).toBeVisible();

  // Select URL tab if present
  const urlTab = page.getByRole("tab", { name: /url/i });
  if (await urlTab.isVisible().catch(() => false)) {
    await urlTab.click();
  }

  // Fill in URL if provided
  if (jd.url) {
    await page.getByLabel(/url/i).fill(jd.url);
    await page.getByRole("button", { name: /fetch|parse/i }).click();

    // Wait for parsing
    await expect(page.getByText(/parsing/i)).toBeVisible();
    await expect(page.getByText(/parsing/i)).not.toBeVisible({ timeout: 15000 });
  }

  // Save
  await page.getByRole("button", { name: /save|add/i }).click();

  // Wait for modal dialog to close (not just heading - sidebar has same heading)
  await expect(
    page.getByRole("dialog", { name: /job description/i }),
  ).not.toBeVisible();
}

/**
 * Add a job description manually (paste content)
 */
export async function addJobDescriptionManually(
  page: Page,
  jd: TestJobDescription,
): Promise<void> {
  // Click AI Tools tab to reveal job description button
  const aiToolsTab = page.getByRole("tab", { name: /ai tools/i });
  const tabVisible = await aiToolsTab
    .isVisible({ timeout: 2000 })
    .catch(() => false);

  if (tabVisible) {
    // Check if tab is not already selected
    const isSelected = await aiToolsTab.getAttribute("aria-selected");
    if (isSelected !== "true") {
      await aiToolsTab.click();
      // Small delay to let tab content render
      await page.waitForTimeout(500);
    }
  }

  // Wait for and click the add button
  const addButton = page.getByRole("button", { name: /add job description/i });
  await addButton.waitFor({ state: "visible", timeout: 10000 });
  await addButton.scrollIntoViewIfNeeded();
  await addButton.click();

  // Wait for modal to appear - heading is "Job Description" not "Add Job Description"
  await expect(
    page.getByRole("heading", { name: /^job description$/i }),
  ).toBeVisible();

  // Select manual/text tab if present
  const manualTab = page.getByRole("tab", { name: /manual|text|paste/i });
  if (await manualTab.isVisible().catch(() => false)) {
    await manualTab.click();
  }

  // Fill in title and company
  const titleField = page.getByLabel(/title/i).first();
  await titleField.fill(jd.title);

  const companyField = page.getByLabel(/company/i).first();
  await companyField.fill(jd.company);

  // Fill in content - use role to avoid strict mode violation
  const contentField = page.getByRole("textbox", { name: /job description/i });
  await contentField.fill(jd.content);

  // Save
  await page.getByRole("button", { name: /save|add/i }).click();

  // Wait for modal dialog to close (not just heading - sidebar has same heading)
  await expect(
    page.getByRole("dialog", { name: /job description/i }),
  ).not.toBeVisible();
}

/**
 * Generate a draft for a specific section
 */
export async function generateDraft(
  page: Page,
  sectionName: string,
): Promise<void> {
  // Find and click the generate/draft button for the section
  const generateButton = page.getByRole("button", {
    name: new RegExp(`generate.*${sectionName}|draft.*${sectionName}`, "i"),
  });

  await generateButton.scrollIntoViewIfNeeded();
  await generateButton.click();

  // Wait for generation to start
  await expect(page.getByText(/generating|creating draft/i)).toBeVisible();
}

/**
 * Wait for draft generation to complete
 */
export async function waitForDraftGeneration(
  page: Page,
  timeout: number = 30000,
): Promise<void> {
  // Wait for loading indicator to disappear
  await expect(page.getByText(/generating|creating draft/i)).not.toBeVisible({
    timeout,
  });

  // Wait for draft content or approve/discard buttons
  await expect(
    page.getByRole("button", { name: /approve|discard/i }),
  ).toBeVisible({ timeout });
}

/**
 * Approve a draft
 */
export async function approveDraft(page: Page): Promise<void> {
  const approveButton = page.getByRole("button", { name: /approve/i });
  await approveButton.click();

  // Wait for button to be processed
  await expect(approveButton).not.toBeVisible();
}

/**
 * Discard a draft
 */
export async function discardDraft(page: Page): Promise<void> {
  const discardButton = page.getByRole("button", { name: /discard/i });
  await discardButton.click();

  // Wait for button to be processed
  await expect(discardButton).not.toBeVisible();
}

/**
 * Trigger content enhancement on a text field
 */
export async function triggerContentEnhancement(
  page: Page,
  fieldLabel: string,
): Promise<void> {
  // Focus on the field
  const field = page.getByLabel(new RegExp(fieldLabel, "i"));
  await field.scrollIntoViewIfNeeded();
  await field.click();

  // Click enhance button (usually appears near focused field)
  const enhanceButton = page.getByRole("button", {
    name: /enhance|improve|ai/i,
  });
  await enhanceButton.click();

  // Wait for enhancement modal
  await expect(
    page.getByRole("heading", { name: /enhance content/i }),
  ).toBeVisible();
}

/**
 * Wait for enhancement suggestions to load
 */
export async function waitForEnhancementSuggestions(
  page: Page,
  timeout: number = 30000,
): Promise<void> {
  // Wait for loading to finish
  await expect(page.getByText(/generating.*suggestions/i)).not.toBeVisible({
    timeout,
  });

  // Wait for suggestions to appear
  await expect(page.getByRole("radio")).toBeVisible({ timeout });
}

/**
 * Select an enhancement suggestion by index
 */
export async function selectEnhancementSuggestion(
  page: Page,
  index: number,
): Promise<void> {
  const radioButtons = page.getByRole("radio");
  await radioButtons.nth(index).click();
}

/**
 * Accept the selected enhancement
 */
export async function acceptEnhancement(page: Page): Promise<void> {
  await page.getByRole("button", { name: /use this version/i }).click();

  // Wait for modal to close
  await expect(
    page.getByRole("heading", { name: /enhance content/i }),
  ).not.toBeVisible();
}

/**
 * Copy enhancement suggestion to clipboard
 */
export async function copyEnhancementToClipboard(page: Page): Promise<void> {
  await page.getByRole("button", { name: /copy/i }).click();

  // Wait for success notification
  await expect(page.getByText(/copied to clipboard/i)).toBeVisible();
}

/**
 * Regenerate enhancement suggestions
 */
export async function regenerateEnhancement(page: Page): Promise<void> {
  const regenerateButton = page.getByLabel(/regenerate suggestions/i);
  await regenerateButton.click();

  // Wait for regeneration
  await expect(page.getByText(/generating.*suggestions/i)).toBeVisible();
  await waitForEnhancementSuggestions(page);
}

/**
 * Hide a job description from sidebar
 */
export async function hideJobDescription(
  page: Page,
  jdTitle: string,
): Promise<void> {
  const hideButton = page
    .locator(`[data-testid*="hide-job-description"]`)
    .filter({ hasText: jdTitle })
    .first();
  await hideButton.click();
}

/**
 * Show a hidden job description via modal
 */
export async function showJobDescriptionViaModal(
  page: Page,
  jdTitle: string,
): Promise<void> {
  // Open manage modal
  await page.getByRole("button", { name: /manage job descriptions/i }).click();

  // Wait for modal
  await expect(
    page.getByRole("heading", { name: /job descriptions/i }),
  ).toBeVisible();

  // Select the hidden JD
  const checkbox = page
    .locator(`input[type="checkbox"]`)
    .filter({ hasText: jdTitle });
  await checkbox.check();

  // Close modal
  await page.getByRole("button", { name: /close|done/i }).click();
}

/**
 * Delete a job description
 */
export async function deleteJobDescription(
  page: Page,
  jdTitle: string,
): Promise<void> {
  const deleteButton = page
    .locator(`[data-testid*="delete-job-description"]`)
    .filter({ hasText: jdTitle })
    .first();
  await deleteButton.click();

  // Confirm deletion if confirmation dialog appears
  const confirmButton = page.getByRole("button", { name: /confirm|delete/i });
  if (await confirmButton.isVisible({ timeout: 1000 }).catch(() => false)) {
    await confirmButton.click();
  }
}

/**
 * Wait for job fit analysis to complete
 */
export async function waitForJobFitAnalysis(
  page: Page,
  timeout: number = 30000,
): Promise<void> {
  // Wait for analysis to complete
  await expect(page.getByText(/analyzing|calculating fit/i)).not.toBeVisible({
    timeout,
  });

  // Wait for results to appear
  await expect(page.getByText(/confidence score|fit analysis/i)).toBeVisible({
    timeout,
  });
}

/**
 * Get the current count of job descriptions from the UI
 */
export async function getJobDescriptionCount(page: Page): Promise<number> {
  const countElement = page.locator('[data-testid="job-description-count"]');
  if (await countElement.isVisible().catch(() => false)) {
    const text = await countElement.textContent();
    const match = text?.match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
  }
  return 0;
}

/**
 * Close any open notifications
 */
export async function closeNotifications(page: Page): Promise<void> {
  const closeButtons = page.locator('button[aria-label="Close"]');
  const count = await closeButtons.count();
  for (let i = 0; i < count; i++) {
    await closeButtons.first().click().catch(() => {});
  }
}
