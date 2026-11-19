// Configuración de ESLint para todo el monorepo.
import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['**/node_modules/**', '**/dist/**', '**/coverage/**', '**/generated/**', 'apps/**', 'tests/*/reportes/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['services/**/*.ts'],
    languageOptions: {
      globals: { ...globals.node, ...globals.jest },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    // Scripts de Node: generador del manual, pruebas y métricas (T8)
    files: ['docs/manual/generador/**/*.mjs', 'scripts/**/*.mjs', 'tests/**/*.mjs'],
    languageOptions: { globals: globals.node },
  },
);
