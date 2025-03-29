import love from 'eslint-config-love'
const rules = {
  'no-new': 'off',
  camelcase: 'off',
  'no-return-assign': 'off',
  'space-before-function-paren': ['error', 'never'],
  'no-var': 'error',
  'no-fallthrough': 'off',
  'prefer-promise-reject-errors': 'off',
  eqeqeq: 'off',
  'no-multiple-empty-lines': [1, { max: 2 }],
  'comma-dangle': [2, 'always-multiline'],
  'standard/no-callback-literal': 'off',
  'prefer-const': 'off',
  'no-labels': 'off',
  'node/no-callback-literal': 'off',
  'eslint-comments/require-description': 'off',
  'promise/avoid-new': 'off',
  '@typescript-eslint/strict-boolean-expressions': 'off',
  '@typescript-eslint/explicit-function-return-type': 'off',
  '@typescript-eslint/space-before-function-paren': 'off',
  '@typescript-eslint/no-non-null-assertion': 'off',
  '@typescript-eslint/naming-convention': 'off',
  '@typescript-eslint/return-await': 'off',
  'multiline-ternary': 'off',
  '@typescript-eslint/prefer-nullish-coalescing': 'off',
  '@typescript-eslint/no-magic-numbers': 'off',
  '@typescript-eslint/prefer-destructuring': 'off',
  '@typescript-eslint/strict-boolean-expressions': 'off',
  '@typescript-eslint/explicit-function-return-type': 'off',
  '@typescript-eslint/init-declarations': 'off',
  '@typescript-eslint/no-unsafe-type-assertion': 'off',
  '@typescript-eslint/no-non-null-assertion': 'off',
  '@typescript-eslint/require-await': 'off',
  '@typescript-eslint/no-unsafe-call': 'off',
  '@typescript-eslint/use-unknown-in-catch-callback-variable': 'off',
  '@typescript-eslint/await-thenable': 'off',
  '@typescript-eslint/no-empty-function': 'off',
  '@typescript-eslint/no-misused-promises': 'off',
  '@typescript-eslint/no-explicit-any': 'warn',

  '@typescript-eslint/no-confusing-void-expression': [
    'error',
    {
      ignoreVoidReturningFunctions: true,
    },
  ],
  '@typescript-eslint/no-unnecessary-type-parameters': 'off',
  '@typescript-eslint/return-await': ['error', 'in-try-catch'],
  '@typescript-eslint/ban-ts-comment': 'off',
  '@typescript-eslint/max-params': [
    'error',
    {
      max: 6,
    },
  ],
}

const ignorePatterns = [
  'node_modules',
  '*.min.js',
  'dist',
  'demo',
  'rollup.config.iife.js',
  'rollup.config.js',
]

/** @type {import('eslint').Linter.Config} */
export default [
  {
    ...love,
    files: ['**/*.js', '**/*.ts'],
  },
  {
    rules,
    ignores: ignorePatterns,
  },
]
