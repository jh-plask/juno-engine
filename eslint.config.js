import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['**/node_modules/**', '**/dist/**'],
  },
  {
    files: ['**/*.ts'],
    ignores: ['packages/engine/src/attempt.ts'],
    languageOptions: {
      parser: tseslint.parser,
    },
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'TryStatement',
          message:
            'try-catch prohibited. Use attempt() from @engine/engine/attempt.js at I/O boundaries only.',
        },
      ],
    },
  },
);
