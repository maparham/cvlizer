/**
 * End-to-End Test: Authentication Flows
 * 
 * Tests complete authentication scenarios including login, logout, session persistence,
 * and admin routing. Uses optimized pattern with minimal setup and cleanup.
 * 
 * Test Scenarios:
 * 1. Login with valid credentials
 * 2. Login with invalid credentials (error handling)
 * 3. Session persistence (reload and stay logged in)
 * 4. Logout from dashboard
 * 5. Logout from CV editor
 * 6. Admin routing (admin users go to /admin, then dashboard)
 */

import { test, expect, Page } from './fixtures';

// Configure tests to NOT use the global auth state since we're testing login flow
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Authentication Flows', () => {
  
  test('1. Login with valid credentials and admin routing', async ({ page }) => {
    // Navigate to login page
    await page.goto('http://localhost:3000/login');
    
    // Wait for Clerk authentication form
    await expect(page.getByLabel('Email address')).toBeVisible({ timeout: 10000 });
    
    // Fill credentials
    await page.getByLabel('Email address').fill('mahmoud.shahrud@gmail.com');
    await page.getByRole('textbox', { name: 'Password' }).fill('pNm6h@n@q@fnHFM');
    
    // Submit
    await page.getByRole('button', { name: 'Continue' }).click();
    
    // Admin user should be routed to /admin first
    await page.waitForURL('**/admin', { timeout: 20000 });
    await expect(page.getByRole('heading', { name: /admin/i })).toBeVisible();
    
    // Navigate to dashboard
    await page.getByRole('button', { name: /back to dashboard/i }).click();
    await page.waitForURL('**/dashboard');
    await expect(page.getByRole('heading', { name: /my cvs/i })).toBeVisible();
  });

  test('2. Login with invalid credentials shows error', async ({ page }) => {
    await page.goto('http://localhost:3000/login');
    
    await expect(page.getByLabel('Email address')).toBeVisible({ timeout: 10000 });
    
    // Fill with invalid credentials
    await page.getByLabel('Email address').fill('invalid@example.com');
    await page.getByRole('textbox', { name: 'Password' }).fill('wrongpassword');
    
    await page.getByRole('button', { name: 'Continue' }).click();
    
    // Should show error message (Clerk error UI - various possible messages)
    const errorVisible = await page.getByText(/incorrect|invalid|wrong|couldn't|failed/i).isVisible({ timeout: 10000 }).catch(() => false);
    
    // Or button might be re-enabled indicating failure
    if (!errorVisible) {
      // Check if still on login page (indication of failure)
      await expect(page).toHaveURL(/.*login/);
      await expect(page.getByRole('button', { name: 'Continue' })).toBeVisible();
    } else {
      await expect(page.getByText(/incorrect|invalid|wrong|couldn't|failed/i)).toBeVisible();
    }
  });

  test('3. Session persistence after page reload', async ({ page }) => {
    // Login first
    await page.goto('http://localhost:3000/login');
    await expect(page.getByLabel('Email address')).toBeVisible({ timeout: 10000 });
    
    await page.getByLabel('Email address').fill('mahmoud.shahrud@gmail.com');
    await page.getByRole('textbox', { name: 'Password' }).fill('pNm6h@n@q@fnHFM');
    await page.getByRole('button', { name: 'Continue' }).click();
    
    await page.waitForURL('**/admin', { timeout: 20000 });
    await page.getByRole('button', { name: /back to dashboard/i }).click();
    await page.waitForURL('**/dashboard');
    
    // Wait for dashboard to fully load
    await expect(page.getByRole('heading', { name: /my cvs/i })).toBeVisible({ timeout: 10000 });
    
    // Reload the page and wait for it to fully load
    await page.reload({ waitUntil: 'networkidle' });
    
    // Wait for auth state to be restored and dashboard to load
    await page.waitForLoadState('networkidle');
    
    // Should still be on dashboard (session persists)
    await expect(page.getByRole('heading', { name: /my cvs/i })).toBeVisible({ timeout: 10000 });
    await expect(page).toHaveURL(/.*dashboard/);
  });

  test('4. Logout from dashboard', async ({ page }) => {
    // Login and navigate to dashboard
    await page.goto('http://localhost:3000/login');
    await expect(page.getByLabel('Email address')).toBeVisible({ timeout: 10000 });
    
    await page.getByLabel('Email address').fill('mahmoud.shahrud@gmail.com');
    await page.getByRole('textbox', { name: 'Password' }).fill('pNm6h@n@q@fnHFM');
    await page.getByRole('button', { name: 'Continue' }).click();
    
    await page.waitForURL('**/admin', { timeout: 20000 });
    await page.getByRole('button', { name: /back to dashboard/i }).click();
    await page.waitForURL('**/dashboard');
    
    // Wait for dashboard to fully load before attempting logout
    await expect(page.getByRole('heading', { name: /my cvs/i })).toBeVisible({ timeout: 10000 });
    
    // Open user menu and logout
    await page.getByRole('button', { name: /account of current user/i }).click();
    await page.getByRole('menuitem', { name: /logout|sign out/i }).click();
    
    // Should redirect to home page
    await page.waitForURL('http://localhost:3000/', { timeout: 10000 });
  });

  test('5. Logout from CV editor', async ({ page }) => {
    // Login and create a CV
    await page.goto('http://localhost:3000/login');
    await expect(page.getByLabel('Email address')).toBeVisible({ timeout: 10000 });
    
    await page.getByLabel('Email address').fill('mahmoud.shahrud@gmail.com');
    await page.getByRole('textbox', { name: 'Password' }).fill('pNm6h@n@q@fnHFM');
    await page.getByRole('button', { name: 'Continue' }).click();
    
    await page.waitForURL('**/admin', { timeout: 20000 });
    await page.getByRole('button', { name: /back to dashboard/i }).click();
    await page.waitForURL('**/dashboard');
    
    // Create a new CV
    const startButton = await page.getByTestId('start-from-scratch-empty-state-button').isVisible({ timeout: 1000 }).catch(() => false)
      ? page.getByTestId('start-from-scratch-empty-state-button')
      : page.getByTestId('start-from-scratch-button');
    
    await startButton.click();
    await page.waitForURL(/\/cv\//, { timeout: 10000 });
    await expect(page.getByRole('heading', { name: 'Personal Information' })).toBeVisible();
    
    // Logout from CV editor
    await page.getByRole('button', { name: /account of current user/i }).click();
    await page.getByRole('menuitem', { name: /logout|sign out/i }).click();
    
    // Should redirect to home page
    await page.waitForURL('http://localhost:3000/', { timeout: 5000 });
  });
});

