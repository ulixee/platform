// eslint-disable-next-line import/no-extraneous-dependencies,import/no-self-import
const Fs = require('fs');
const Copyfiles = require('copyfiles');
const pkg = require('./package.json');

const copyToDir = process.env.OUT_DIR;
const isStandardBuild = copyToDir === 'build';
const workspaces =
  pkg.workspaces?.packages
    .map(x => x.replace('/*', ''))
    .filter(x => !x.startsWith('../') && !x.includes('/build')) || [];

const copyArgs = ['-e "node_modules"', 'package*.json', '.*ignore'];
if (isStandardBuild) {
  copyArgs.push('yarn.lock');
}

for (const workspace of workspaces) {
  copyArgs.push(
    `${workspace}/*.cjs`,
    `${workspace}/*.mjs`,
    `${workspace}/**/.*ignore`,
    `${workspace}/**/*.sh`,
  );
}

if (isStandardBuild) copyArgs.push('-a');

Copyfiles([...copyArgs, copyToDir], {}, () => {
  // eslint-disable-next-line no-console
  console.log('Files Copied');
});
