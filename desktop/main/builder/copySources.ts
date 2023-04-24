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
  'testing',
  'datastore/testing',
  'desktop/main',
  'desktop/ui',
  'desktop/chrome-extension',
  'examples',
  'test',
  'tools',
  'ui',
]);

function copyDir(baseDir: string, outDir: string): void {
  if (!Fs.existsSync(baseDir)) return;
  if (!Fs.existsSync(outDir)) Fs.mkdirSync(outDir, { recursive: true });

  const packageJson = Fs.existsSync(`${baseDir}/package.json`)
    ? JSON.parse(Fs.readFileSync(`${baseDir}/package.json`, 'utf8'))
    : { private: false };

  for (const dirOrFile of Fs.readdirSync(baseDir)) {
    const dirPath = `${baseDir}/${dirOrFile}`;
    if (
      (dirOrFile.startsWith('.') && !dirOrFile.startsWith('.env')) ||
      dirsNotToInclude.has(dirOrFile) ||
      [...dirsNotToInclude].some(x => dirPath.endsWith(x))
    )
      continue;
    const outPath = `${outDir}/${dirOrFile}`;

    if (Fs.statSync(dirPath).isDirectory()) {
      if (!Fs.existsSync(outPath)) {
        Fs.mkdirSync(outPath, { recursive: true });
      }

      copyDir(dirPath, outPath);
    } else if (!packageJson.workspaces || packageJson.workspaces?.length === 0) {
      Fs.copyFileSync(dirPath, outPath);
    }
  }
}

const buildDir = process.env.SOURCE_DIR ?? 'build'

copyDir(`${baseBuild}/${buildDir}`, dest);
if (process.env.NODE_ENV !== 'production') {
  copyDir(`${baseBuild}/hero/${buildDir}`, `${dest}/hero`);
  copyDir(
    `${baseBuild}/../unblocked/browser-emulator-builder/data`,
    `${dest}/browser-emulator-builder/data`,
  );
  copyDir(`${baseBuild}/../unblocked/${buildDir}/agent`, `${dest}/agent`);
  copyDir(`${baseBuild}/../unblocked/${buildDir}/specification`, `${dest}/unblocked-specification`);
  copyDir(`${baseBuild}/../shared/${buildDir}/net`, `${dest}/net`);
  copyDir(`${baseBuild}/../shared/${buildDir}/crypto`, `${dest}/crypto`);
  copyDir(`${baseBuild}/../shared/${buildDir}/commons`, `${dest}/commons`);
  copyDir(`${baseBuild}/../shared/${buildDir}/specification`, `${dest}/ulixee-specification`);
  copyDir(`${baseBuild}/../shared/${buildDir}/schema`, `${dest}/schema`);
  copyDir(`${baseBuild}/../unblocked/${buildDir}/plugins`, `${dest}/unblocked-plugins`);
  if (Fs.existsSync(`${dest}/unblocked-plugins`)) {
    Fs.writeFileSync(
      `${dest}/unblocked-plugins/default-browser-emulator/paths.json`,
      JSON.stringify({
        'emulator-data': '../../browser-emulator-builder/data',
      }),
    );
  }
}

// eslint-disable-next-line no-console
console.log('Copied files to dest', dest);
