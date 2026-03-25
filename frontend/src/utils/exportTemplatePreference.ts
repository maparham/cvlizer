/**
 * Export Template Preference Utilities
 *
 * Stores a browser-local default template used by Quick Export.
 * This preference is intentionally client-only and per device/browser.
 */

const QUICK_EXPORT_TEMPLATE_KEY = "cv_lator_quick_export_default_template";

export function getQuickExportDefaultTemplate(): string | null {
  if (typeof window === "undefined") return null;

  try {
    const value = localStorage.getItem(QUICK_EXPORT_TEMPLATE_KEY);
    if (!value) return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  } catch {
    return null;
  }
}

export function setQuickExportDefaultTemplate(templateName: string): boolean {
  if (typeof window === "undefined") return false;

  try {
    const normalized = templateName.trim();
    if (!normalized) {
      localStorage.removeItem(QUICK_EXPORT_TEMPLATE_KEY);
      return true;
    }
    localStorage.setItem(QUICK_EXPORT_TEMPLATE_KEY, normalized);
    return true;
  } catch {
    // Ignore storage errors (private mode/quota/security settings).
    return false;
  }
}

export function clearQuickExportDefaultTemplate(): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.removeItem(QUICK_EXPORT_TEMPLATE_KEY);
  } catch {
    // Ignore storage errors.
  }
}

export function getValidQuickExportDefaultTemplate(
  availableTemplateNames: string[],
): string | null {
  const storedDefault = getQuickExportDefaultTemplate();
  if (!storedDefault) return null;

  const availableNames = new Set(availableTemplateNames);
  if (availableNames.has(storedDefault)) return storedDefault;

  clearQuickExportDefaultTemplate();
  return null;
}
