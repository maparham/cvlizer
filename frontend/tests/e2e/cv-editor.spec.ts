import { test, expect } from '@playwright/test';
import { DashboardPage, CVEditorPage } from './page-objects';
import { loginUser, DEFAULT_TEST_USER } from './helpers/auth';
import { TEST_PERSONAL_INFO, TEST_WORK_EXPERIENCE, TEST_EDUCATION } from './fixtures/testData';

/**
 * CV Editor Tests
 * 
 * Tests for CV editing functionality
 */

test.describe('CV Editor - Basic Functionality', () => {
  let dashboardPage: DashboardPage;
  let cvEditorPage: CVEditorPage;
  let testCvId: string;

  test.beforeEach(async ({ page }) => {
    dashboardPage = new DashboardPage(page);
    cvEditorPage = new CVEditorPage(page);
    
    // Login and navigate to dashboard
    await page.goto('/');
    await loginUser(page, DEFAULT_TEST_USER);
    await dashboardPage.goto();
    await dashboardPage.waitForLoad();
    
    // Create a new CV for testing
    await dashboardPage.createNewCV();
    
    // Extract CV ID from URL
    await page.waitForURL(/\/cv\/.+/);
    const url = page.url();
    testCvId = url.split('/cv/')[1];
    
    // Wait for CV editor to load
    await cvEditorPage.waitForLoad();
  });

  test('should load CV editor correctly', async ({ page }) => {
    // Verify we're in the CV editor
    await expect(page).toHaveURL(`/cv/${testCvId}`);
    await expect(cvEditorPage.backButton).toBeVisible();
    await expect(cvEditorPage.userMenuButton).toBeVisible();
  });

  test('should edit personal information', async ({ page }) => {
    await cvEditorPage.editPersonalInfo({
      fullName: TEST_PERSONAL_INFO.fullName,
      email: TEST_PERSONAL_INFO.email,
      phone: TEST_PERSONAL_INFO.phone
    });
    
    // Wait for auto-save
    await cvEditorPage.waitForAutoSave();
    
    // Verify the information was saved
    await expect(page.getByText(TEST_PERSONAL_INFO.fullName)).toBeVisible();
    await expect(page.getByText(TEST_PERSONAL_INFO.email)).toBeVisible();
  });

  test('should add work experience', async ({ page }) => {
    await cvEditorPage.addWorkExperience({
      position: TEST_WORK_EXPERIENCE.position,
      company: TEST_WORK_EXPERIENCE.company,
      location: TEST_WORK_EXPERIENCE.location,
      startDate: TEST_WORK_EXPERIENCE.startDate,
      endDate: TEST_WORK_EXPERIENCE.endDate,
      description: TEST_WORK_EXPERIENCE.description
    });
    
    // Verify work experience was added
    await expect(page.getByText(TEST_WORK_EXPERIENCE.position)).toBeVisible();
    await expect(page.getByText(TEST_WORK_EXPERIENCE.company)).toBeVisible();
  });

  test('should edit existing work experience', async ({ page }) => {
    // First add a work experience
    await cvEditorPage.addWorkExperience({
      position: 'Original Position',
      company: 'Original Company',
      description: 'Original description'
    });
    
    // Then edit it
    await cvEditorPage.editWorkExperience(0, {
      position: 'Updated Position',
      company: 'Updated Company',
      description: 'Updated description'
    });
    
    // Verify changes
    await expect(page.getByText('Updated Position')).toBeVisible();
    await expect(page.getByText('Updated Company')).toBeVisible();
    await expect(page.getByText('Original Position')).not.toBeVisible();
  });

  test('should delete work experience', async ({ page }) => {
    // First add a work experience
    await cvEditorPage.addWorkExperience({
      position: TEST_WORK_EXPERIENCE.position,
      company: TEST_WORK_EXPERIENCE.company
    });
    
    // Verify it exists
    await expect(page.getByText(TEST_WORK_EXPERIENCE.position)).toBeVisible();
    
    // Delete it
    await cvEditorPage.deleteWorkExperience(0);
    
    // Verify it's gone
    await expect(page.getByText(TEST_WORK_EXPERIENCE.position)).not.toBeVisible();
  });

  test('should add education', async ({ page }) => {
    await cvEditorPage.addEducation({
      institution: TEST_EDUCATION.institution,
      degree: TEST_EDUCATION.degree,
      fieldOfStudy: TEST_EDUCATION.fieldOfStudy,
      startDate: TEST_EDUCATION.startDate,
      endDate: TEST_EDUCATION.endDate
    });
    
    // Verify education was added
    await expect(page.getByText(TEST_EDUCATION.institution)).toBeVisible();
    await expect(page.getByText(TEST_EDUCATION.degree)).toBeVisible();
  });

  test('should navigate back to dashboard', async ({ page }) => {
    await cvEditorPage.goBack();
    
    // Should return to dashboard
    await expect(page).toHaveURL('/dashboard');
  });

  test('should handle unsaved changes warning', async ({ page }) => {
    // Make some changes
    await cvEditorPage.editPersonalInfo({
      fullName: 'Test Name'
    });
    
    // Don't save, try to navigate back
    await cvEditorPage.goBackWithUnsavedChanges(false); // Stay
    
    // Should still be in CV editor
    await expect(page).toHaveURL(`/cv/${testCvId}`);
    
    // Try again and leave
    await cvEditorPage.goBackWithUnsavedChanges(true); // Leave anyway
    
    // Should navigate to dashboard
    await expect(page).toHaveURL('/dashboard');
  });
});

test.describe('CV Editor - Advanced Features', () => {
  let dashboardPage: DashboardPage;
  let cvEditorPage: CVEditorPage;

  test.beforeEach(async ({ page }) => {
    dashboardPage = new DashboardPage(page);
    cvEditorPage = new CVEditorPage(page);
    
    // Login and get to a CV with some data
    await page.goto('/');
    await loginUser(page, DEFAULT_TEST_USER);
    await dashboardPage.goto();
    await dashboardPage.waitForLoad();
  });

  test('should work with existing CV data', async ({ page }) => {
    // Get existing CV count
    const cvCount = await dashboardPage.getCVCount();
    
    if (cvCount === 0) {
      // Create a new CV if none exist
      await dashboardPage.createNewCV();
      await cvEditorPage.waitForLoad();
      
      // Add some basic data
      await cvEditorPage.editPersonalInfo({
        fullName: 'Test User',
        email: 'test@example.com'
      });
      
      await cvEditorPage.waitForAutoSave();
    } else {
      // Use existing CV
      const firstEditButton = page.locator('[data-testid^="edit-cv-button-"]').first();
      const cvId = await firstEditButton.getAttribute('data-testid');
      const extractedId = cvId?.replace('edit-cv-button-', '') || '';
      
      await dashboardPage.waitForCVProcessing(extractedId);
      await dashboardPage.editCV(extractedId);
      await cvEditorPage.waitForLoad();
    }
    
    // Verify we can interact with the CV
    await expect(cvEditorPage.backButton).toBeVisible();
  });

  test('should handle form validation', async ({ page }) => {
    // Create new CV
    await dashboardPage.createNewCV();
    await cvEditorPage.waitForLoad();
    
    // Try to save personal info without required fields
    await cvEditorPage.personalInfoFullNameInput.click();
    await cvEditorPage.personalInfoFullNameInput.fill('');
    await cvEditorPage.personalInfoEmailInput.click();
    await cvEditorPage.personalInfoEmailInput.fill('');
    
    // Try to save (press Enter)
    await cvEditorPage.personalInfoFullNameInput.press('Enter');
    
    // Should show validation errors
    await expect(page.getByText('Full name is required')).toBeVisible();
    await expect(page.getByText('Email is required')).toBeVisible();
  });
});
