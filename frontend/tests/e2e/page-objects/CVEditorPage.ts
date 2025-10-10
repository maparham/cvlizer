import { Page, Locator, expect } from '@playwright/test';

/**
 * CV Editor Page Object Model
 * 
 * Provides methods for interacting with the CV editor page
 */
export class CVEditorPage {
  readonly page: Page;
  
  // Navigation
  readonly backButton: Locator;
  readonly userMenuButton: Locator;
  
  // Unsaved changes dialog
  readonly unsavedChangesDialog: Locator;
  readonly stayButton: Locator;
  readonly leaveButton: Locator;
  
  // Personal Info Section
  readonly personalInfoFullNameInput: Locator;
  readonly personalInfoEmailInput: Locator;
  readonly personalInfoPhoneInput: Locator;
  
  // Work Experience Section
  readonly addNewWorkExperienceButton: Locator;
  readonly editWorkExperienceButton: (index: number) => Locator;
  readonly deleteWorkExperienceButton: (index: number) => Locator;
  readonly saveWorkExperienceButton: Locator;
  readonly cancelWorkExperienceButton: Locator;
  
  // Education Section
  readonly addNewEducationButton: Locator;
  readonly editEducationButton: (index: number) => Locator;
  readonly deleteEducationButton: (index: number) => Locator;
  readonly saveEducationButton: Locator;
  readonly cancelEducationButton: Locator;
  
  // Projects Section
  readonly addNewProjectsButton: Locator;
  readonly editProjectsButton: (index: number) => Locator;
  readonly deleteProjectsButton: (index: number) => Locator;
  readonly saveProjectsButton: Locator;
  readonly cancelProjectsButton: Locator;
  
  constructor(page: Page) {
    this.page = page;
    
    // Navigation
    this.backButton = page.getByTestId('cv-editor-back-button');
    this.userMenuButton = page.getByTestId('cv-editor-user-menu-button');
    
    // Unsaved changes dialog
    this.unsavedChangesDialog = page.getByTestId('unsaved-changes-dialog');
    this.stayButton = page.getByTestId('unsaved-changes-stay-button');
    this.leaveButton = page.getByTestId('unsaved-changes-leave-button');
    
    // Personal Info Section - locator('input') needed because test-id is on TextField wrapper div
    this.personalInfoFullNameInput = page.getByTestId('personal-info-full-name-input').locator('input');
    this.personalInfoEmailInput = page.getByTestId('personal-info-email-input').locator('input');
    this.personalInfoPhoneInput = page.getByTestId('personal-info-phone-input').locator('input');
    
    // Work Experience Section
    this.addNewWorkExperienceButton = page.getByTestId('add-new-work-experience-button');
    this.editWorkExperienceButton = (index: number) => page.getByTestId(`edit-work-experience-item-${index}`);
    this.deleteWorkExperienceButton = (index: number) => page.getByTestId(`delete-work-experience-item-${index}`);
    this.saveWorkExperienceButton = page.getByTestId('save-work-experience-button');
    this.cancelWorkExperienceButton = page.getByTestId('cancel-work-experience-button');
    
    // Education Section
    this.addNewEducationButton = page.getByTestId('add-new-education-button');
    this.editEducationButton = (index: number) => page.getByTestId(`edit-education-item-${index}`);
    this.deleteEducationButton = (index: number) => page.getByTestId(`delete-education-item-${index}`);
    this.saveEducationButton = page.getByTestId('save-education-button');
    this.cancelEducationButton = page.getByTestId('cancel-education-button');
    
    // Projects Section
    this.addNewProjectsButton = page.getByTestId('add-new-projects-button');
    this.editProjectsButton = (index: number) => page.getByTestId(`edit-projects-item-${index}`);
    this.deleteProjectsButton = (index: number) => page.getByTestId(`delete-projects-item-${index}`);
    this.saveProjectsButton = page.getByTestId('save-projects-button');
    this.cancelProjectsButton = page.getByTestId('cancel-projects-button');
  }

  /**
   * Navigate to a specific CV editor page
   */
  async goto(cvId: string) {
    await this.page.goto(`/cv/${cvId}`);
  }

  /**
   * Wait for the CV editor to be loaded
   */
  async waitForLoad() {
    // Wait for the main content area to be visible
    await expect(this.page.locator('[data-testid="cv-content-area"]')).toBeVisible({ timeout: 10000 });
  }

  /**
   * Navigate back to dashboard
   */
  async goBack() {
    await this.backButton.click();
  }

  /**
   * Navigate back to dashboard, handling unsaved changes if present
   */
  async goBackWithUnsavedChanges(leaveAnyway: boolean = false) {
    await this.backButton.click();
    
    // Check if unsaved changes dialog appears
    const dialogVisible = await this.unsavedChangesDialog.isVisible({ timeout: 1000 });
    
    if (dialogVisible) {
      if (leaveAnyway) {
        await this.leaveButton.click();
      } else {
        await this.stayButton.click();
      }
    }
    
    if (leaveAnyway || !dialogVisible) {
      await this.page.waitForURL('/dashboard');
    }
  }

  /**
   * Edit personal information
   */
  async editPersonalInfo(data: {
    fullName?: string;
    email?: string;
    phone?: string;
  }) {
    // Click on personal info section to enter edit mode
    await this.page.locator('h1').first().click();
    
    if (data.fullName !== undefined) {
      await this.personalInfoFullNameInput.fill(data.fullName);
    }
    
    if (data.email !== undefined) {
      await this.personalInfoEmailInput.fill(data.email);
    }
    
    if (data.phone !== undefined) {
      await this.personalInfoPhoneInput.fill(data.phone);
    }
    
    // Press Enter to save
    await this.personalInfoFullNameInput.press('Enter');
  }

  /**
   * Add a new work experience entry
   */
  async addWorkExperience(data: {
    position?: string;
    company?: string;
    location?: string;
    startDate?: { day: string; month: string; year: string };
    endDate?: { day: string; month: string; year: string };
    description?: string;
  }) {
    await this.addNewWorkExperienceButton.click();
    
    if (data.position) {
      await this.page.getByRole('combobox', { name: 'Position' }).fill(data.position);
      // Wait for autocomplete and select first option if available
      await this.page.waitForTimeout(500);
      const firstOption = this.page.getByRole('option').first();
      if (await firstOption.isVisible()) {
        await firstOption.click();
      }
    }
    
    if (data.company) {
      await this.page.getByRole('textbox', { name: 'Company *' }).fill(data.company);
    }
    
    if (data.location) {
      await this.page.getByRole('combobox', { name: 'Location' }).fill(data.location);
      await this.page.waitForTimeout(500);
      const firstOption = this.page.getByRole('option').first();
      if (await firstOption.isVisible()) {
        await firstOption.click();
      }
    }
    
    if (data.startDate) {
      const startDateGroup = this.page.getByRole('group', { name: 'Start Date *' });
      await startDateGroup.getByLabel('Day').fill(data.startDate.day);
      await startDateGroup.getByLabel('Month').fill(data.startDate.month);
      await startDateGroup.getByLabel('Year').fill(data.startDate.year);
    }
    
    if (data.endDate) {
      const endDateGroup = this.page.getByRole('group', { name: 'End Date' });
      await endDateGroup.getByLabel('Day').fill(data.endDate.day);
      await endDateGroup.getByLabel('Month').fill(data.endDate.month);
      await endDateGroup.getByLabel('Year').fill(data.endDate.year);
    }
    
    if (data.description) {
      await this.page.getByRole('textbox', { name: 'Description' }).fill(data.description);
    }
    
    // Save the work experience
    await this.saveWorkExperienceButton.click();
    
    // Wait for save to complete
    await expect(this.page.getByText('saved successfully')).toBeVisible();
  }

  /**
   * Edit an existing work experience entry
   */
  async editWorkExperience(index: number, data: {
    position?: string;
    company?: string;
    description?: string;
  }) {
    await this.editWorkExperienceButton(index).click();
    
    if (data.position) {
      const positionInput = this.page.getByRole('combobox', { name: 'Position' });
      await positionInput.clear();
      await positionInput.fill(data.position);
    }
    
    if (data.company) {
      const companyInput = this.page.getByRole('textbox', { name: 'Company *' });
      await companyInput.clear();
      await companyInput.fill(data.company);
    }
    
    if (data.description) {
      const descriptionInput = this.page.getByRole('textbox', { name: 'Description' });
      await descriptionInput.clear();
      await descriptionInput.fill(data.description);
    }
    
    await this.saveWorkExperienceButton.click();
    await expect(this.page.getByText('saved successfully')).toBeVisible();
  }

  /**
   * Delete a work experience entry
   */
  async deleteWorkExperience(index: number) {
    await this.deleteWorkExperienceButton(index).click();
    
    // Wait for item to be removed
    await this.page.waitForTimeout(500);
  }

  /**
   * Add a new education entry
   */
  async addEducation(data: {
    institution?: string;
    degree?: string;
    fieldOfStudy?: string;
    startDate?: { day: string; month: string; year: string };
    endDate?: { day: string; month: string; year: string };
  }) {
    await this.addNewEducationButton.click();
    
    if (data.institution) {
      await this.page.getByRole('textbox', { name: 'Institution *' }).fill(data.institution);
    }
    
    if (data.degree) {
      await this.page.getByRole('textbox', { name: 'Degree *' }).fill(data.degree);
    }
    
    if (data.fieldOfStudy) {
      await this.page.getByRole('textbox', { name: 'Field of Study' }).fill(data.fieldOfStudy);
    }
    
    if (data.startDate) {
      const startDateGroup = this.page.getByRole('group', { name: 'Start Date *' });
      await startDateGroup.getByLabel('Day').fill(data.startDate.day);
      await startDateGroup.getByLabel('Month').fill(data.startDate.month);
      await startDateGroup.getByLabel('Year').fill(data.startDate.year);
    }
    
    if (data.endDate) {
      const endDateGroup = this.page.getByRole('group', { name: 'End Date' });
      await endDateGroup.getByLabel('Day').fill(data.endDate.day);
      await endDateGroup.getByLabel('Month').fill(data.endDate.month);
      await endDateGroup.getByLabel('Year').fill(data.endDate.year);
    }
    
    await this.saveEducationButton.click();
    await expect(this.page.getByText('saved successfully')).toBeVisible();
  }

  /**
   * Wait for auto-save to complete
   */
  async waitForAutoSave() {
    await expect(this.page.getByText('saved successfully')).toBeVisible();
  }

  /**
   * Check if there are unsaved changes
   */
  async hasUnsavedChanges(): Promise<boolean> {
    // Try to navigate back and see if dialog appears
    await this.backButton.click();
    const dialogVisible = await this.unsavedChangesDialog.isVisible({ timeout: 1000 });
    
    if (dialogVisible) {
      await this.stayButton.click();
      return true;
    }
    
    // If no dialog, we need to navigate back to the editor
    await this.page.goBack();
    return false;
  }
}
