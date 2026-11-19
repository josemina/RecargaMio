// ESLint de la app móvil (T9): configuración recomendada de Expo. El resto del monorepo usa eslint.config.mjs de la raíz.
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', '.expo/*'],
  },
  {
    // eslint-config-expo exige ESLint 9; la app tiene el suyo (la raíz usa ESLint 10 para los servicios)
    settings: { react: { version: '19.3' } },
  },
  {
    files: ['jest.setup.ts', '__tests__/**', '__mocks__/**'],
    languageOptions: { globals: { jest: 'readonly' } },
  },
]);
