import js from '@eslint/js';
import globals from 'globals';

export default [
  {
    ignores: ['node_modules/**', 'vendor/**', 'storage/**', 'public/**', 'playwright-report/**', 'test-results/**'],
  },
  js.configs.recommended,
  {
    // Classic scripts (not modules): top-level functions are called through data-click/data-change attributes, so they are not treated as unused.
    files: ['resources/js/*.js'],
    languageOptions: {
      sourceType: 'script',
      ecmaVersion: 2023,
      globals: { ...globals.browser, I18N: 'readonly', QR: 'readonly' },
    },
    rules: {
      'no-unused-vars': ['warn', { vars: 'local', args: 'none', caughtErrors: 'none' }],
      'no-empty': ['error', { allowEmptyCatch: true }],
      eqeqeq: ['warn', 'always', { null: 'ignore' }],
      'no-var': 'off',
    },
  },
  {
    files: ['e2e/**/*.js', 'eslint.config.js', 'playwright.config.js'],
    languageOptions: {
      sourceType: 'module',
      ecmaVersion: 2023,
      globals: {
        ...globals.node,
        ...globals.browser,
        QR: 'readonly',
        jsQR: 'readonly',
        // Page globals (functions and variables) used through page.evaluate.
        go: 'readonly',
        pqToggleGroup: 'readonly',
        mfaDialog: 'readonly',
        pqGoGroup: 'readonly',
        currentId: 'writable',
      },
    },
  },
];
