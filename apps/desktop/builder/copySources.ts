import * as Fs from 'fs';
import * as Path from 'path';

const dest = Path.join(process.cwd(), process.argv[2]);

const baseBuild = `${__dirname}/../../../..`;

const dirsNotToInclude = new Set([
  'node_modules',
  'packages',
  'desktop',
  'playgrounds',
  'end-to-end',
  'chromealive-extension',
  'examples',
  'test',
  'testing',
  'tools',
]);

function copyDir(baseDir: string, outDir: string): void {
  if (!Fs.existsSync(outDir)) Fs.mkdirSync(outDir, { recursive: true });

  const packageJson = Fs.existsSync(`${baseDir}/package.json`)
    ? JSON.parse(Fs.readFileSync(`${baseDir}/package.json`, 'utf8'))
    : { private: false };

  for (const dirOrFile of Fs.readdirSync(baseDir)) {
    if (
      (dirOrFile.startsWith('.') && !dirOrFile.startsWith('.env')) ||
      dirOrFile.endsWith('-ui') ||
      dirsNotToInclude.has(dirOrFile)
    )
      continue;
    const dirPath = `${baseDir}/${dirOrFile}`;
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

copyDir(`${baseBuild}/build`, dest);
if (process.env.NODE_ENV !== 'production') {
  copyDir(`${baseBuild}/hero/build`, `${dest}/hero`);
  copyDir(
    `${baseBuild}/../unblocked/browser-emulator-builder/data`,
    `${dest}/browser-emulator-builder/data`,
  );
  copyDir(`${baseBuild}/../unblocked/build/agent`, `${dest}/agent`);
  copyDir(`${baseBuild}/../unblocked/build/specification`, `${dest}/unblocked-specification`);
  copyDir(`${baseBuild}/../shared/build/net`, `${dest}/net`);
  copyDir(`${baseBuild}/../shared/build/commons`, `${dest}/commons`);
  copyDir(`${baseBuild}/../shared/build/specification`, `${dest}/specification`);
  copyDir(`${baseBuild}/../shared/build/schema`, `${dest}/schema`);
  copyDir(`${baseBuild}/../unblocked/build/plugins`, `${dest}/unblocked-plugins`);
  Fs.writeFileSync(
    `${dest}/unblocked-plugins/default-browser-emulator/paths.json`,
    JSON.stringify(
      {
        'emulator-data': '../../browser-emulator-builder/data',
        __modified__: '2023-02-10T14:54:53.672Z',
      },
      null,
      2,
    ),
    'utf8',
  );
}

// eslint-disable-next-line no-console
console.log('Copied files to dest', dest);
