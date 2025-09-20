/**
 * CV Data Migration Utilities
 * 
 * Handles migration of existing CV data to ensure all items have stable IDs.
 * This is crucial for proper diff detection in version history.
 */

import { CVData } from '../types'
import { ensureArrayItemsHaveIds, ensureArrayItemsHaveDeterministicIds } from './idGenerator'

/**
 * Migrate CV data to ensure all array items have stable IDs
 */
export const migrateCVDataWithIds = (cvData: CVData): CVData => {
  const migratedData = {
    ...cvData,
    work_experience: ensureArrayItemsHaveIds(cvData.work_experience || [], 'work_experience'),
    education: ensureArrayItemsHaveIds(cvData.education || [], 'education'),
    projects: ensureArrayItemsHaveIds(cvData.projects || [], 'projects'),
    certifications: ensureArrayItemsHaveIds(cvData.certifications || [], 'certifications'),
    awards: ensureArrayItemsHaveIds(cvData.awards || [], 'awards'),
    publications: ensureArrayItemsHaveIds(cvData.publications || [], 'publications'),
    volunteer_experience: ensureArrayItemsHaveIds(cvData.volunteer_experience || [], 'volunteer_experience')
  }

  // Handle languages in skills section if they exist as objects
  if (migratedData.skills && migratedData.skills.languages && Array.isArray(migratedData.skills.languages)) {
    const languages = migratedData.skills.languages
    // Check if languages are objects (Language interface) or strings
    if (languages.length > 0 && typeof languages[0] === 'object' && languages[0] !== null) {
      migratedData.skills.languages = ensureArrayItemsHaveIds(languages as any[], 'languages')
    }
  }

  return migratedData
}

/**
 * Check if CV data needs ID migration
 */
export const needsIdMigration = (cvData: CVData): boolean => {
  const arrayFields = [
    'work_experience',
    'education', 
    'projects',
    'certifications',
    'awards',
    'publications',
    'volunteer_experience'
  ] as const

  // Check main array sections
  const mainArraysNeedMigration = arrayFields.some(field => {
    const items = cvData[field] as Array<{ id?: string }> | undefined
    return items && items.length > 0 && items.some(item => !item.id)
  })

  // Check languages in skills section (if they are objects)
  let languagesNeedMigration = false
  if (cvData.skills && cvData.skills.languages && Array.isArray(cvData.skills.languages)) {
    const languages = cvData.skills.languages
    if (languages.length > 0 && typeof languages[0] === 'object' && languages[0] !== null) {
      languagesNeedMigration = languages.some((lang: any) => !lang.id)
    }
  }

  return mainArraysNeedMigration || languagesNeedMigration
}

/**
 * Migrate a single CV and return whether migration was needed
 */
export const migrateCVIfNeeded = (cvData: CVData): { data: CVData; migrated: boolean } => {
  if (needsIdMigration(cvData)) {
    return {
      data: migrateCVDataWithIds(cvData),
      migrated: true
    }
  }
  
  return {
    data: cvData,
    migrated: false
  }
}

/**
 * Migrate CV data with deterministic IDs for diff comparison
 * This ensures the same data always gets the same IDs for accurate diffs
 */
export const migrateCVDataWithDeterministicIds = (cvData: CVData): CVData => {
  const migratedData = {
    ...cvData,
    work_experience: ensureArrayItemsHaveDeterministicIds(cvData.work_experience || [], 'work_experience'),
    education: ensureArrayItemsHaveDeterministicIds(cvData.education || [], 'education'),
    projects: ensureArrayItemsHaveDeterministicIds(cvData.projects || [], 'projects'),
    certifications: ensureArrayItemsHaveDeterministicIds(cvData.certifications || [], 'certifications'),
    awards: ensureArrayItemsHaveDeterministicIds(cvData.awards || [], 'awards'),
    publications: ensureArrayItemsHaveDeterministicIds(cvData.publications || [], 'publications'),
    volunteer_experience: ensureArrayItemsHaveDeterministicIds(cvData.volunteer_experience || [], 'volunteer_experience')
  }

  // Handle languages in skills section if they exist as objects
  if (migratedData.skills && migratedData.skills.languages && Array.isArray(migratedData.skills.languages)) {
    const languages = migratedData.skills.languages
    // Check if languages are objects (Language interface) or strings
    if (languages.length > 0 && typeof languages[0] === 'object' && languages[0] !== null) {
      migratedData.skills.languages = ensureArrayItemsHaveDeterministicIds(languages as any[], 'languages')
    }
  }

  return migratedData
}
