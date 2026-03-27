import { useEffect, useState } from "react";

/**
 * Derives the highlighted "default" template on the Export page from server-backed
 * `export_template_name` when it matches an available template name.
 *
 * @param serverExportTemplateName - `undefined` until CV metadata is loaded; then
 *   the per-CV template from the API or null.
 */
export const useDefaultTemplate = (
  availableTemplateNames: string[],
  serverExportTemplateName?: string | null,
) => {
  const [defaultTemplateName, setDefaultTemplateName] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (availableTemplateNames.length === 0) {
      return;
    }
    if (serverExportTemplateName === undefined) {
      return;
    }
    if (
      serverExportTemplateName &&
      availableTemplateNames.includes(serverExportTemplateName)
    ) {
      setDefaultTemplateName(serverExportTemplateName);
      return;
    }
    setDefaultTemplateName(null);
  }, [availableTemplateNames, serverExportTemplateName]);

  return { defaultTemplateName };
};
