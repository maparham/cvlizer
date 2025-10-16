/**
 * Jest transformer to replace import.meta.env with mock values
 * This allows Jest to parse files that use Vite's import.meta.env
 */

import tsJest from 'ts-jest';

export default {
  process(sourceText, sourcePath, options) {
    // Replace import.meta.env references with mock values
    let modifiedSource = sourceText
      .replace(/import\.meta\.env\.VITE_API_BASE_URL/g, '"http://localhost:8000"')
      .replace(/import\.meta\.env\.VITE_ADMIN_EMAIL/g, '"admin@example.com"')
      .replace(/import\.meta\.env\.VITE_CLERK_PUBLISHABLE_KEY/g, '"pk_test_mock"')
      .replace(/import\.meta\.env\.VITE_SHOW_HISTORY_PANEL/g, '"false"')
      .replace(/import\.meta\.env\.MODE/g, '"test"')
      .replace(/import\.meta\.env\.DEV/g, 'false')
      .replace(/import\.meta\.env\.PROD/g, 'false')
      .replace(/import\.meta\.env\.SSR/g, 'false');

    // Then process with ts-jest
    return tsJest.default.createTransformer().process(modifiedSource, sourcePath, options);
  },
};
