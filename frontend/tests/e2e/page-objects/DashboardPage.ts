import { Page, Locator, expect } from '@playwright/test';

/**
 * Dashboard Page Object Model
 *
 * Provides methods for interacting with the CV dashboard page
 */
export class DashboardPage {
  readonly page: Page;

  // Navigation
  readonly userMenuButton: Locator;
  readonly logoutMenuItem: Locator;

  // CV Management
  readonly createNewCvButton: Locator;
  readonly uploadCvButton: Locator;
  readonly createNewCvEmptyStateButton: Locator;
  readonly uploadCvEmptyStateButton: Locator;
  readonly searchCvsInput: Locator;

  // CV Cards
  readonly editCvButton: (cvId: string) => Locator;
  readonly deleteCvButton: (cvId: string) => Locator;
  readonly duplicateCvButton: (cvId: string) => Locator;

  // Dialogs
  readonly deleteCvDialog: Locator;
  readonly deleteCvConfirmButton: Locator;
  readonly deleteCvCancelButton: Locator;
  readonly cvUploadDialog: Locator;

  constructor(page: Page) {
    this.page = page;

    // Navigation
    this.userMenuButton = page.getByTestId('user-menu-button');
    this.logoutMenuItem = page.getByTestId('logout-menu-item');

    // CV Management
    this.createNewCvButton = page.getByTestId('create-new-cv-button');
    this.uploadCvButton = page.getByTestId('upload-cv-button');
    this.createNewCvEmptyStateButton = page.getByTestId('create-new-cv-empty-state-button');
    this.uploadCvEmptyStateButton = page.getByTestId('upload-cv-empty-state-button');
    this.searchCvsInput = page.getByTestId('search-cvs-input');

    // CV Cards
    this.editCvButton = (cvId: string) => page.getByTestId(`edit-cv-button-${cvId}`);
    this.deleteCvButton = (cvId: string) => page.getByTestId(`delete-cv-button-${cvId}`);
    this.duplicateCvButton = (cvId: string) => page.getByTestId(`duplicate-cv-button-${cvId}`);

    // Dialogs
    this.deleteCvDialog = page.getByTestId('delete-cv-dialog');
    this.deleteCvConfirmButton = page.getByTestId('delete-dialog-confirm-button');
    this.deleteCvCancelButton = page.getByTestId('delete-dialog-cancel-button');
    this.cvUploadDialog = page.getByTestId('cv-upload-dialog');
  }

  /**
   * Navigate to the dashboard page
   */
  async goto() {
    await this.page.goto('/dashboard');
  }

  /**
   * Wait for the dashboard to be loaded
   */
  async waitForLoad() {
    await expect(this.page.locator('h1')).toContainText('My CVs');
  }

  /**
   * Create a new CV from scratch
   */
  async createNewCV() {
    // Check if we're in empty state or have existing CVs
    const hasExistingCvs = await this.createNewCvButton.isVisible();

    if (hasExistingCvs) {
      await this.createNewCvButton.click();
    } else {
      await this.createNewCvEmptyStateButton.click();
    }

    // Wait for navigation to CV editor
    await this.page.waitForURL('/cv/new');
  }

  /**
   * Open the upload CV dialog
   */
  async openUploadDialog() {
    const hasExistingCvs = await this.uploadCvButton.isVisible();

    if (hasExistingCvs) {
      await this.uploadCvButton.click();
    } else {
      await this.uploadCvEmptyStateButton.click();
    }

    await expect(this.cvUploadDialog).toBeVisible();
  }

  /**
   * Upload a CV file
   */
  async uploadCV(filePath: string) {
    await this.openUploadDialog();

    // Upload file
    const fileInput = this.page.getByTestId('cv-file-input');
    await fileInput.setInputFiles(filePath);

    // Wait for upload to complete
    await expect(this.page.getByText('CV uploaded successfully!')).toBeVisible();

    // Close dialog
    await this.page.getByTestId('cv-upload-dialog-close-button').click();
  }

  /**
   * Search for CVs
   */
  async searchCVs(searchTerm: string) {
    await this.searchCvsInput.fill(searchTerm);
  }

  /**
   * Edit a CV by ID
   */
  async editCV(cvId: string) {
    await this.editCvButton(cvId).click();
    await this.page.waitForURL(`/cv/${cvId}`);
  }

  /**
   * Delete a CV by ID
   */
  async deleteCV(cvId: string) {
    await this.deleteCvButton(cvId).click();
    await expect(this.deleteCvDialog).toBeVisible();
    await this.deleteCvConfirmButton.click();

    // Wait for success notification
    await expect(this.page.getByText('deleted successfully')).toBeVisible();
  }

  /**
   * Duplicate a CV by ID
   */
  async duplicateCV(cvId: string) {
    await this.duplicateCvButton(cvId).click();

    // Wait for success notification
    await expect(this.page.getByText('duplicated successfully')).toBeVisible();
  }

  /**
   * Logout from the application
   */
  async logout() {
    await this.userMenuButton.click();
    await this.logoutMenuItem.click();

    // Wait for redirect to home page
    await this.page.waitForURL('/');
  }

  /**
   * Get the number of CV cards visible
   */
  async getCVCount(): Promise<number> {
    const cvCards = this.page.locator('[data-testid^="edit-cv-button-"]');
    return await cvCards.count();
  }

  /**
   * Wait for a CV to be processed (parsing complete)
   */
  async waitForCVProcessing(cvId: string, timeout: number = 30000) {
    await expect(this.editCvButton(cvId)).toBeEnabled({ timeout });
  }
}
