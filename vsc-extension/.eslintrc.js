module.exports = {
  parser: '@typescript-eslint/parser',
  extends: ['typescript', 'prettier'],
  env: {
    node: true,
    jest: true,
  },
  settings: {
    'import/parsers': {
      '@typescript-eslint/parser': ['.ts', '.tsx'],
    },
  },
  rules: {
    // A temporary hack related to IDE not resolving correct package.json
    'import/no-extraneous-dependencies': 'off',
    '@typescript-eslint/interface-name-prefix': 'off',
    'no-case-declarations': 'error',
    'no-underscore-dangle': 'off',
    'no-restricted-syntax': ['off'],
    '@typescript-eslint/no-namespace': ['off'],
    'func-names': ['off'],
    'class-methods-use-this': 'off',
    'import/prefer-default-export': 'off',
    '@typescript-eslint/explicit-function-return-type': ['error', { allowExpressions: true }],
  },
}
