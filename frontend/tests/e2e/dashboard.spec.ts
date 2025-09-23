import { test, expect } from '@playwright/test';
import { DashboardPage } from './page-objects';
import { loginUser, DEFAULT_TEST_USER } from './helpers/auth';
import { TEST_FILES } from './fixtures/testData';

/**
 * Dashboard Tests
 * 
 * Tests for CV management functionality on the dashboard
 */

test.describe('Dashboard - CV Management', () => {
  let dashboardPage: DashboardPage;

  test.beforeEach(async ({ page }) => {
    dashboardPage = new DashboardPage(page);
    
    // Navigate to home and login
    await page.goto('/');
    await loginUser(page, DEFAULT_TEST_USER);
    
    // Navigate to dashboard
    await dashboardPage.goto();
    await dashboardPage.waitForLoad();
  });

  test('should display dashboard correctly', async ({ page }) => {
    // Verify page title and main elements
    await expect(page.locator('h1')).toContainText('My CVs');
    await expect(dashboardPage.userMenuButton).toBeVisible();
  });

  test('should create new CV from scratch', async ({ page }) => {
    await dashboardPage.createNewCV();
    
    // Should navigate to CV editor for new CV
    await expect(page).toHaveURL('/cv/new');
  });

  test('should upload CV file successfully', async ({ page }) => {
    const initialCvCount = await dashboardPage.getCVCount();
    
    await dashboardPage.uploadCV(TEST_FILES.SAMPLE_PDF);
    
    // Wait for upload to process
    await page.waitForTimeout(2000);
    
    // Should have one more CV
    const newCvCount = await dashboardPage.getCVCount();
    expect(newCvCount).toBeGreaterThan(initialCvCount);
  });

  test('should search CVs', async ({ page }) => {
    // First ensure we have some CVs
    const cvCount = await dashboardPage.getCVCount();
    
    if (cvCount === 0) {
      // Upload a test CV first
      await dashboardPage.uploadCV(TEST_FILES.SAMPLE_PDF);
      await page.waitForTimeout(2000);
    }
    
    // Test search functionality
    await dashboardPage.searchCVs('sample');
    
    // Should filter results (exact behavior depends on CV names)
    await page.waitForTimeout(1000);
  });

  test('should edit CV', async ({ page }) => {
    // Ensure we have at least one CV
    let cvCount = await dashboardPage.getCVCount();
    
    if (cvCount === 0) {
      await dashboardPage.uploadCV(TEST_FILES.SAMPLE_PDF);
      await page.waitForTimeout(2000);
      cvCount = await dashboardPage.getCVCount();
    }
    
    // Get the first CV ID (this is a simplified approach)
    const firstEditButton = page.locator('[data-testid^="edit-cv-button-"]').first();
    const cvId = await firstEditButton.getAttribute('data-testid');
    const extractedId = cvId?.replace('edit-cv-button-', '') || '';
    
    // Wait for CV to be processed before editing
    await dashboardPage.waitForCVProcessing(extractedId);
    
    // Edit the CV
    await dashboardPage.editCV(extractedId);
    
    // Should navigate to CV editor
    await expect(page).toHaveURL(`/cv/${extractedId}`);
  });

  test('should duplicate CV', async ({ page }) => {
    // Ensure we have at least one processed CV
    let cvCount = await dashboardPage.getCVCount();
    
    if (cvCount === 0) {
      await dashboardPage.uploadCV(TEST_FILES.SAMPLE_PDF);
      await page.waitForTimeout(2000);
      cvCount = await dashboardPage.getCVCount();
    }
    
    const firstEditButton = page.locator('[data-testid^="edit-cv-button-"]').first();
    const cvId = await firstEditButton.getAttribute('data-testid');
    const extractedId = cvId?.replace('edit-cv-button-', '') || '';
    
    // Wait for CV to be processed
    await dashboardPage.waitForCVProcessing(extractedId);
    
    // Duplicate the CV
    await dashboardPage.duplicateCV(extractedId);
    
    // Should have one more CV
    const newCvCount = await dashboardPage.getCVCount();
    expect(newCvCount).toBe(cvCount + 1);
  });

  test('should delete CV', async ({ page }) => {
    // Ensure we have at least one CV
    let cvCount = await dashboardPage.getCVCount();
    
    if (cvCount === 0) {
      await dashboardPage.uploadCV(TEST_FILES.SAMPLE_PDF);
      await page.waitForTimeout(2000);
      cvCount = await dashboardPage.getCVCount();
    }
    
    const firstEditButton = page.locator('[data-testid^="edit-cv-button-"]').first();
    const cvId = await firstEditButton.getAttribute('data-testid');
    const extractedId = cvId?.replace('edit-cv-button-', '') || '';
    
    // Delete the CV
    await dashboardPage.deleteCV(extractedId);
    
    // Should have one less CV
    const newCvCount = await dashboardPage.getCVCount();
    expect(newCvCount).toBe(cvCount - 1);
  });

  test('should logout successfully', async ({ page }) => {
    await dashboardPage.logout();
    
    // Should redirect to home page
    await expect(page).toHaveURL('/');
  });
});
