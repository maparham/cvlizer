import { useEffect, useState } from "react";
import {
  getValidQuickExportDefaultTemplate,
  setQuickExportDefaultTemplate,
} from "../utils/exportTemplatePreference";

/**
 * Manage Quick Export default template selection and validation.
 */
export const useDefaultTemplate = (availableTemplateNames: string[]) => {
  const [defaultTemplateName, setDefaultTemplateName] = useState<string | null>(
    null,
  );

  useEffect(() => {
    // Avoid clearing a valid stored default before templates finish loading.
    if (availableTemplateNames.length === 0) {
      return;
    }
    setDefaultTemplateName(
      getValidQuickExportDefaultTemplate(availableTemplateNames),
    );
  }, [availableTemplateNames]);

  const saveDefaultTemplate = (templateName: string): boolean => {
    const success = setQuickExportDefaultTemplate(templateName);
    if (success) {
      setDefaultTemplateName(templateName);
    }
    return success;
  };

  return { defaultTemplateName, saveDefaultTemplate };
};
