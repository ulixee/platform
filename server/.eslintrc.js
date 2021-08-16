const path = require('path');

module.exports = {
  parserOptions: {
    project: path.join(__dirname, '/tsconfig.json'),
  },
  extends: '../.eslintrc.js',
  overrides: [
    {
      files: 'cli-commands/**/*.ts',
      rules: {
        'no-console': 'off',
      },
    },
  ],
};
