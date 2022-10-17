const { monorepo } = require('@ulixee/repo-tools/eslint');

module.exports = monorepo(__dirname);

module.exports.overrides.push(
  {
    files: ['playgrounds/**/*.ts', 'e2e/**/*.ts', '**/cli.ts', 'cli/*'],
    rules: {
      'no-console': 'off',
    },
  },
  {
    files: ['databox/packager/**'],
    rules: {
      'no-console': 'off',
      'import/no-dynamic-require': 'off',
    },
  },
  {
    files: ['**/DataboxWrapper.ts'],
    rules: {
      'import/no-import-module-exports': 'off',
    },
  },
);
