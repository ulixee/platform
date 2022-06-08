const { monorepo } = require('@ulixee/repo-tools/eslint');

module.exports = monorepo(__dirname);

module.exports.overrides.push({
  files: ['playgrounds/**/*.ts'],
  rules: {
    'no-console': 'off',
  },
});
