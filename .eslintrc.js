const { monorepo } = require('@ulixee/repo-tools/eslint');

module.exports = monorepo(__dirname);

module.exports.overrides.push({
  files: ['playgrounds/**/*.ts', '**/cli.ts', 'cli/*'],
  rules: {
    'no-console': 'off',
  },
});
