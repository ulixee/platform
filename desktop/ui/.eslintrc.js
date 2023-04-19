const Path = require('path');

module.exports = {
  extends: ['../../.eslintrc.js', 'plugin:vue/vue3-recommended', '@vue/typescript/recommended'],
  plugins: ['monorepo-cop'],
  parser: 'vue-eslint-parser',
  parserOptions: {
    parser: '@typescript-eslint/parser',
    project: Path.join(__dirname, 'tsconfig.json'),
    sourceType: 'module',
  },
  ignorePatterns: ['public/*.js'],
  rules: {
    'no-console': 'off',
    'global-require': 'off',
    'import/extensions': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/ban-ts-comment': 'off',
    'vue/multi-word-component-names': 'off',
    'vue/max-attributes-per-line': [
      'error',
      {
        singleline: {
          max: 2,
        },
        multiline: {
          max: 1,
        },
      },
    ],
  },
  overrides: [
    {
      files: ['**/shims-*.d.ts'],
      rules: {
        '@typescript-eslint/no-unused-vars': 'off',
        '@typescript-eslint/ban-types': 'off',
      },
    },
    {
      files: ['src/**'],
      rules: {
        'import/no-unresolved': 'off',
      },
    },
  ],
};
