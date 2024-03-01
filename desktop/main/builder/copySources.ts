import * as Fs from 'fs';
import * as Path from 'path';

const dest = Path.join(process.cwd(), process.argv[2]);

const baseBuild = `${__dirname}/../../../..`;

const dirsNotToInclude = new Set([
  'node_modules',
  'packages',
  'playgrounds',
  'end-to-end',
  'website',
  'chrome-extension',
  'docs',
  'desktop/main',
  'localchain/npm',
  'desktop/ui',
  'testing',
  'desktop/chrome-extension',
  'examples',
  'test',
  'tools',
  'ui',
  'tsconfig.json',
  '.rs',
  '.go',
  '.toml',
  '.sh',
  '.sql',
  'CHANGELOG.md',
  'yarn.lock',
  '.config.js',
  'package.build.json',
  'package.dist.json',
  '.config.js.map',
  '.config.d.ts',
  '__test__',
]);

function copyDir(baseDir: string, outPath?: string): void {
  if (!Fs.existsSync(baseDir)) return;

  const packageJson = Fs.existsSync(`${baseDir}/package.json`)
    ? JSON.parse(Fs.readFileSync(`${baseDir}/package.json`, 'utf8'))
    : { private: false, name: '' };

  for (const dirOrFile of Fs.readdirSync(baseDir)) {
    const dirPath = `${baseDir}/${dirOrFile}`;
    if (
      (dirOrFile.startsWith('.') && !dirOrFile.startsWith('.env')) ||
      dirsNotToInclude.has(dirOrFile) ||
      [...dirsNotToInclude].some(x => dirPath.endsWith(x))
    )
      continue;

    const packageName = packageJson.name?.replace('@ulixee', '');

    const packageDir = packageName ? `${dest}/${packageName}` : outPath;
    if (Fs.statSync(dirPath).isDirectory()) {
      copyDir(dirPath, `${packageDir}/${dirOrFile}`);
    } else if (
      !packageJson.private ||
      !packageJson.workspaces ||
      packageJson.workspaces?.length === 0
    ) {
      if (!Fs.existsSync(packageDir)) Fs.mkdirSync(packageDir, { recursive: true });
      if (dirOrFile === 'package.json') {
        const finalPackageJson = {
          name: packageJson.name,
          version: packageJson.version,
          dependencies: packageJson.dependencies,
        };
        Fs.writeFileSync(`${packageDir}/${dirOrFile}`, JSON.stringify(finalPackageJson, null, 2));
        continue;
      }
      Fs.copyFileSync(dirPath, `${packageDir}/${dirOrFile}`);
    }
  }
}

const buildDir = process.env.SOURCE_DIR ?? 'build';

copyDir(`${baseBuild}/${buildDir}`);
if (buildDir === 'build') {
  copyDir(`${baseBuild}/hero/${buildDir}`);
  copyDir(`${baseBuild}/../mainchain/localchain`);
  copyDir(`${baseBuild}/../unblocked/${buildDir}/agent`);
  copyDir(`${baseBuild}/../unblocked/${buildDir}/specification`);
  copyDir(`${baseBuild}/../shared/${buildDir}/net`);
  copyDir(`${baseBuild}/../shared/${buildDir}/crypto`);
  copyDir(`${baseBuild}/../shared/${buildDir}/commons`);
  copyDir(`${baseBuild}/../unblocked/${buildDir}/plugins`);
  copyDir(
    `${baseBuild}/../unblocked/browser-emulator-builder/data`,
    `${dest}/default-browser-emulator/data`,
  );
  if (Fs.existsSync(`${dest}/default-browser-emulator`)) {
    Fs.writeFileSync(
      `${dest}/default-browser-emulator/paths.json`,
      JSON.stringify({
        'emulator-data': './data',
      }),
    );
  }
}

// eslint-disable-next-line no-console
console.log('Copied files to dest');
