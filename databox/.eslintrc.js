const Path = require('path');

module.exports = {
  parserOptions: {
    project: Path.join(__dirname, 'tsconfig.json'),
  },
  extends: '../.eslintrc.js',
  ignorePatterns: ['.eslintrc.js'],
  overrides: [
    {
      files: ['packager/**'],
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
  ],
};
