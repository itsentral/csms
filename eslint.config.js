import js from '@eslint/js';
import globals from 'globals';

export default [
  {
    ignores: [
      'node_modules/**',
      'vendor/**',
      'storage/**',
      'public/build/**',
      'playwright-report/**',
      'test-results/**',
    ],
  },
  js.configs.recommended,
  {
    // Skrip klasik (bukan modul): fungsi tingkat atas dipanggil lewat atribut data-click/data-change, jadi tidak dianggap tak terpakai.
    files: ['public/assets/*.js'],
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
      globals: { ...globals.node, ...globals.browser, QR: 'readonly', jsQR: 'readonly' },
    },
  },
];
