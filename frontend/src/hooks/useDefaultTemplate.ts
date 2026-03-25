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
