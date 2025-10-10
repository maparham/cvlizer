/**
 * Global Setup for E2E Tests
 * 
 * This module performs one-time authentication before all tests run,
 * saving the authenticated session state. This eliminates the need for
 * each test to login separately, reducing test execution time by 2-3 minutes.
 * 
 * The authentication state is saved to .auth/user.json and automatically
 * loaded by all tests via playwright.config.ts storageState setting.
 */
import { chromium, FullConfig } from '@playwright/test';
import { TEST_USER } from './test-constants';

async function globalSetup(config: FullConfig) {
  console.log('🔐 Setting up global authentication...');
  
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    // Login once for all tests
    await page.goto('http://localhost:3000/login');
    await page.getByLabel('Email address').fill(TEST_USER.email);
    await page.getByRole('textbox', { name: 'Password' }).fill(TEST_USER.password);
    await page.getByRole('button', { name: 'Continue' }).click();
    
    // Wait for successful login (redirects to admin for this user)
    await page.waitForURL('**/admin', { timeout: 20000 });
    
    // Save authentication state to file
    await page.context().storageState({ path: 'tests/e2e/.auth/user.json' });
    
    console.log('✅ Authentication state saved');
  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

export default globalSetup;

