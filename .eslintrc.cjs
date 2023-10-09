/* eslint-env node */

/**
 * @fileoverview ESLint configuration file.
 * @description This file contains the ESLint configuration for the project.
 */
module.exports = {
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended', 'airbnb-typescript/base'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    sourceType: 'module',
    project: './tsconfig.json'
  },
  plugins: ['@typescript-eslint', 'import'],
  root: true,
  ignorePatterns: ['dist/**/*', 'jest.config.cjs', '.eslintrc.cjs', 'rollup.config.js', 'tests/**/*'],
  rules: {
    '@typescript-eslint/no-explicit-any': 0,
    '@typescript-eslint/member-delimiter-style': ['error', {
      'multiline': {
        'delimiter': 'semi',
        'requireLast': true
      },
      'singleline': {
        'delimiter': 'semi',
        'requireLast': false
      }
    }],
    'quotes': ['error', 'single'],
    '@typescript-eslint/comma-dangle': ['error', 'never']
  }
};

