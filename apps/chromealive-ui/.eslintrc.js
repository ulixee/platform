const Path = require('path');

module.exports = {
  extends: [
    '../../.eslintrc.js',
    'plugin:vue/vue3-recommended',
    '@vue/typescript/recommended',
  ],
  plugins: ['monorepo-cop'],
  parser: 'vue-eslint-parser',
  parserOptions: {
    parser: '@typescript-eslint/parser',
    project: Path.join(__dirname, 'tsconfig.json'),
    sourceType: 'module',
  },
  rules: {
    'no-console': 'off',
    'global-require': 'off',
    'import/extensions': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/ban-ts-comment': 'off',
  },
  overrides: [
    {
      files: ['**/shims-*.d.ts'],
      rules: {
        '@typescript-eslint/no-unused-vars': 'off',
        '@typescript-eslint/ban-types': 'off',
      },
    },
  ],
};
