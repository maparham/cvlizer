/**
 * End-to-End Test: CV Editor - Section Management
 * 
 * Tests section CRUD operations in the CV editor including adding, hiding, showing,
 * and deleting sections. Uses one CV for all tests to mimic natural user workflow
 * where a user creates one CV and manages its sections.
 * 
 * Test Scenarios:
 * 1. Add Education section from sidebar
 * 2. Add Work Experience section
 * 3. Add Skills section
 * 4. Add Professional Summary section
 * 5. Hide a section via section manager
 * 6. Show a hidden section
 * 7. Section visibility persists after actions
 * 8. Multiple sections can be managed in sequence
 */

import { test, expect, Page } from '@playwright/test';

// Authentication handled by global-setup.ts
async function setupCV(page: Page): Promise<string> {
  await page.goto('/', { waitUntil: 'load' });
  
  // Wait for auth state to be processed
  await page.waitForTimeout(200);
  
  // Admin users are redirected to /admin, so navigate to dashboard if needed
  const url = page.url();
  if (url.includes('/admin')) {
    await page.getByRole('button', { name: /back to dashboard/i }).click();
    await page.waitForURL('**/dashboard');
  } else if (!url.includes('/dashboard')) {
    await page.goto('/dashboard', { waitUntil: 'load' });
  }
  
  await expect(page.getByRole('heading', { name: /my cvs/i })).toBeVisible({ timeout: 5000 });
  
  // Create new CV
  const emptyStateButton = page.getByTestId('start-from-scratch-empty-state-button');
  const regularButton = page.getByTestId('start-from-scratch-button');
  
  const isEmptyState = await emptyStateButton.isVisible({ timeout: 5000 }).catch(() => false);
  if (isEmptyState) {
    await emptyStateButton.click();
  } else {
    await regularButton.click();
  }
  
  await page.waitForURL(/\/cv\//, { timeout: 5000 });
  const cvUrl = page.url();
  const cvId = cvUrl.split('/cv/')[1];
  
  await expect(page.getByRole('heading', { name: 'Personal Information' })).toBeVisible({ timeout: 5000 });
  await page.evaluate(() => console.clear());
  
  return cvId;
}

test.describe.configure({ mode: 'serial' }); // User works on one CV sequentially

test.describe('CV Editor - Section Management', () => {
  let cvId: string;
  let testPage: any;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext({ storageState: 'tests/e2e/.auth/user.json' });
    testPage = await context.newPage();
    cvId = await setupCV(testPage);
    console.log(`✓ Created test CV: ${cvId} (will be reused for all section tests)`);
  });

  test.beforeEach(async () => {
    // Scroll to top for consistency
    await testPage.evaluate(() => window.scrollTo(0, 0));
    
    // Ensure page is ready and stable
    await expect(testPage.getByRole('heading', { name: 'Personal Information' })).toBeVisible({ timeout: 5000 });
    await testPage.waitForLoadState('networkidle');
    await testPage.evaluate(() => console.clear());
  });

  test.afterEach(async () => {
    // Close any open notifications/snackbars that might accumulate
    const closeButtons = testPage.locator('button[aria-label="Close"]');
    const count = await closeButtons.count();
    for (let i = 0; i < count; i++) {
      const button = closeButtons.first();
      if (await button.isVisible({ timeout: 300 }).catch(() => false)) {
        await button.click();
      }
    }
  });

  test('1. Add Education section from sidebar', async () => {
    const page = testPage;
    
    // Verify Education section doesn't exist initially
    const educationHeading = page.getByRole('heading', { name: 'Education', exact: true });
    await expect(educationHeading).not.toBeVisible();
    
    // Add Education section
    await page.getByTestId('add-section-education-button').click();
    
    // Verify section was added
    await expect(educationHeading).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/education section added/i)).toBeVisible({ timeout: 3000 });
    
    // Verify the "Add new" button is visible
    await expect(page.getByTestId('add-new-education-button')).toBeVisible();
  });

  test('2. Add Work Experience section', async () => {
    const page = testPage;
    
    // Verify Work Experience doesn't exist
    const experienceHeading = page.getByRole('heading', { name: 'Work Experience', exact: true });
    await expect(experienceHeading).not.toBeVisible();
    
    // Add Work Experience section
    await page.getByTestId('add-section-work_experience-button').click();
    
    // Verify section was added
    await expect(experienceHeading).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/work experience section added/i)).toBeVisible({ timeout: 3000 });
    await expect(page.getByTestId('add-new-work-experience-button')).toBeVisible();
  });

  test('3. Add Skills section', async () => {
    const page = testPage;
    
    // Verify Skills doesn't exist
    const skillsHeading = page.getByRole('heading', { name: 'Skills', exact: true });
    await expect(skillsHeading).not.toBeVisible();
    
    // Add Skills section
    await page.getByTestId('add-section-skills-button').click();
    
    // Verify section was added
    await expect(skillsHeading).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/skills section added/i)).toBeVisible({ timeout: 3000 });
  });

  test('4. Add Professional Summary section', async () => {
    const page = testPage;
    
    // Verify Professional Summary doesn't exist
    const summaryHeading = page.getByRole('heading', { name: 'Professional Summary', exact: true });
    await expect(summaryHeading).not.toBeVisible();
    
    // Add Professional Summary section
    await page.getByTestId('add-section-professional_summary-button').click();
    
    // Verify section was added
    await expect(summaryHeading).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/professional summary section added/i)).toBeVisible({ timeout: 3000 });
  });

  test('5. Hide Education section via section manager', async () => {
    const page = testPage;
    
    // Verify Education is currently visible
    const educationHeading = page.getByRole('heading', { name: 'Education', exact: true });
    await expect(educationHeading).toBeVisible();
    
    // Click hide button for Education section
    await page.getByTestId('hide-section-education-button').click();
    
    // Wait for hide action to complete and any async updates
    await page.waitForTimeout(1000);
    
    // Verify section is hidden (actually deleted since it's empty)
    await expect(educationHeading).not.toBeVisible({ timeout: 3000 });
    
    // Ensure page is still stable
    await expect(page.getByRole('heading', { name: 'Personal Information' })).toBeVisible();
  });

  test('6. Re-add Education section after hiding it', async () => {
    const page = testPage;
    
    // Verify Education is in "Available Sections" (was removed by test 5)
    const educationHeading = page.getByRole('heading', { name: 'Education', exact: true });
    await expect(educationHeading).not.toBeVisible();
    
    // Re-add the section using the add button
    await page.getByTestId('add-section-education-button').click();
    
    // Wait for add action to complete
    await page.waitForTimeout(500);
    
    // Verify section is now visible again
    await expect(educationHeading).toBeVisible({ timeout: 3000 });
  });

  test('7. Add Projects section', async () => {
    const page = testPage;
    
    const projectsHeading = page.getByRole('heading', { name: 'Projects', exact: true });
    await expect(projectsHeading).not.toBeVisible();
    
    await page.getByTestId('add-section-projects-button').click();
    await expect(projectsHeading).toBeVisible({ timeout: 5000 });
  });

  test('8. All added sections are still visible (persistence check)', async () => {
    const page = testPage;
    
    // Verify all sections are present: Personal Info + 5 added (Education, Work Exp, Skills, Summary, Projects)
    await expect(page.getByRole('heading', { name: 'Personal Information' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Education', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Work Experience', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Skills', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Professional Summary', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Projects', exact: true })).toBeVisible();
  });

  // Cleanup
  test.afterAll(async () => {
    if (!cvId || !testPage) {
      console.log('No CV to clean up');
      return;
    }
    
    try {
      await testPage.goto('http://localhost:3000/dashboard');
      await expect(testPage.getByRole('heading', { name: /my cvs/i })).toBeVisible({ timeout: 5000 });
      
      const deleteButton = testPage.getByTestId(`delete-cv-button-${cvId}`);
      if (await deleteButton.isVisible({ timeout: 3000 })) {
        await deleteButton.click();
        const confirmButton = testPage.getByRole('dialog').getByRole('button', { name: /delete/i });
        await expect(confirmButton).toBeVisible({ timeout: 2000 });
        await confirmButton.click();
        console.log(`✓ Successfully deleted test CV: ${cvId}`);
      }
    } catch (error) {
      console.log('⚠ Cleanup failed:', error);
    } finally {
      await testPage.context().close();
    }
  });
});

