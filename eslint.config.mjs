import { defineConfig, globalIgnores } from 'eslint/config';
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import hooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import prettier from 'eslint-config-prettier/flat';

export default defineConfig([
  js.configs.recommended,
  // Parse TypeScript without duplicating tsc's semantic checks.
  tseslint.configs.base,
  prettier,
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      'no-undef': 'off',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
    },
  },
  {
    files: ['**/*.{js,mjs,ts,tsx}'],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
  {
    files: ['app/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': hooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
    },
  },
  {
    files: [
      'lib/elections.ts',
      'lib/notebook.ts',
      'lib/presentation.ts',
      'app/components/**/*.tsx',
    ],
    rules: { '@typescript-eslint/no-explicit-any': 'error' },
  },
  globalIgnores([
    '.next/**',
    '.vercel/**',
    '.data/**',
    'coverage/**',
    'next-env.d.ts',
    'public/**',
  ]),
]);
