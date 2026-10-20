// The lab's rules come from eslint-config-lab (LAB D-013, D-014); only what is fundamentool's own is here.
const lab = require('eslint-config-lab');
const globals = require('globals');

module.exports = [
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'coverage/**',
      'coverage-tmp/**',
      'docs/**',
    ],
  },
  ...lab({
    files: [
      '**/*.ts',
      '**/*.tsx',
      '**/*.js',
      '**/*.mjs',
    ],
    globals: {
      ...globals.node,
      ...globals.browser,
      ...globals.commonjs,
      ...globals.es2017,
    },
  }),
  {
    rules: {
      // Off, not a warning (LAB D-012: warnings are kept at zero): the low-level library uses `any` on purpose on generic
      // hot paths — a warning on each of them (1,456) only hid the warnings that mattered.
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  {
    // Jest: `require()` inside a test gives a fresh module instance (module-level caches isolated between tests).
    files: ['tests/**/*.ts'],
    languageOptions: {
      globals: {
        ...globals.jest,
      },
    },
    rules: {
      '@typescript-eslint/no-var-requires': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      // Tests capture `this` into a variable to check what a function was bound to (bind / defer / withResult).
      '@typescript-eslint/no-this-alias': 'off',
      // Tests sleep with timers and fake the browser's own APIs — subscriptions.md is about the library's code.
      'no-restricted-syntax': 'off',
    },
  },
];
