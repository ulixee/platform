const Path = require('path');

module.exports = {
  parserOptions: {
    project: Path.join(__dirname, 'tsconfig.json'),
  },
  extends: '../../.eslintrc.js',
  rules: {
    'no-console': 'off',
    'global-require': 'off',
    'import/extensions': 'off',
  },
};
