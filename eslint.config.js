// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/coverage/**',
      '**/node_modules/**',
      '**/playwright-report/**',
      '**/test-results/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{js,mjs,ts,tsx}'],
    languageOptions: { globals: { ...globals.node } },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
  {
    // Module boundaries (see docs/adr/0003-module-boundaries.md): a backend module may import
    // another module only through its public.ts — and, in tests, its testing.ts (fakes).
    files: ['apps/api/src/modules/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: '^\\.\\./(?!\\.\\.)[^/]+/(?!(public|testing)(\\.js)?$).+',
              message:
                'Import other modules only via ../<module>/public.js (or testing.js in tests).',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['apps/api/src/modules/**/*.ts'],
    ignores: ['**/__tests__/**', '**/*.test.ts', '**/testing.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: '^\\.\\./(?!\\.\\.)[^/]+/(?!public(\\.js)?$).+',
              message: 'Production code may import other modules only via ../<module>/public.js.',
            },
          ],
        },
      ],
    },
  },
  {
    // Frontend features must not import each other; share code via src/lib or @pilates/contracts.
    files: ['apps/{web,admin}/src/features/**/*.{ts,tsx}'],
    languageOptions: { globals: { ...globals.browser } },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: '^\\.\\./(?!\\.\\.)[^/]+/',
              message:
                'Features must not import other features. Use src/lib or @pilates/contracts.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['apps/{web,admin}/src/**/*.{ts,tsx}'],
    languageOptions: { globals: { ...globals.browser } },
  },
);
