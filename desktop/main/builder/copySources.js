"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Fs = require("fs");
const Path = require("path");
const dest = Path.join(process.cwd(), process.argv[2]);
const baseBuild = `${__dirname}/../../../..`;
const dirsNotToInclude = new Set([
    'node_modules',
    'packages',
    'playgrounds',
    'end-to-end',
    'website',
    'chrome-extension',
    'desktop/main',
    'desktop/ui',
    'desktop/chrome-extension',
    'examples',
    'test',
    'tools',
    'ui',
]);
function copyDir(baseDir, outPath) {
    if (!Fs.existsSync(baseDir))
        return;
    const packageJson = Fs.existsSync(`${baseDir}/package.json`)
        ? JSON.parse(Fs.readFileSync(`${baseDir}/package.json`, 'utf8'))
        : { private: false, name: '' };
    for (const dirOrFile of Fs.readdirSync(baseDir)) {
        const dirPath = `${baseDir}/${dirOrFile}`;
        if ((dirOrFile.startsWith('.') && !dirOrFile.startsWith('.env')) ||
            dirsNotToInclude.has(dirOrFile) ||
            [...dirsNotToInclude].some(x => dirPath.endsWith(x)))
            continue;
        const packageName = packageJson.name?.replace('@ulixee', '');
        const packageDir = packageName ? `${dest}/${packageName}` : outPath;
        if (Fs.statSync(dirPath).isDirectory()) {
            copyDir(dirPath, `${packageDir}/${dirOrFile}`);
        }
        else if (!packageJson.workspaces || packageJson.workspaces?.length === 0) {
            if (!Fs.existsSync(packageDir))
                Fs.mkdirSync(packageDir, { recursive: true });
            Fs.copyFileSync(dirPath, `${packageDir}/${dirOrFile}`);
        }
    }
}
const buildDir = process.env.SOURCE_DIR ?? 'build';
if (buildDir !== 'build') {
    dirsNotToInclude.add('testing');
    dirsNotToInclude.add('datastore/testing');
}
copyDir(`${baseBuild}/${buildDir}`);
if (buildDir === 'build') {
    copyDir(`${baseBuild}/hero/${buildDir}`);
    copyDir(`${baseBuild}/../unblocked/${buildDir}/agent`);
    copyDir(`${baseBuild}/../unblocked/${buildDir}/specification`);
    copyDir(`${baseBuild}/../shared/${buildDir}/net`);
    copyDir(`${baseBuild}/../shared/${buildDir}/crypto`);
    copyDir(`${baseBuild}/../shared/${buildDir}/commons`);
    copyDir(`${baseBuild}/../shared/${buildDir}/specification`);
    copyDir(`${baseBuild}/../shared/${buildDir}/schema`);
    copyDir(`${baseBuild}/../unblocked/${buildDir}/plugins`);
    copyDir(`${baseBuild}/../unblocked/browser-emulator-builder/data`, `${dest}/default-browser-emulator/data`);
    if (Fs.existsSync(`${dest}/default-browser-emulator`)) {
        Fs.writeFileSync(`${dest}/default-browser-emulator/paths.json`, JSON.stringify({
            'emulator-data': './data',
        }));
    }
}
// eslint-disable-next-line no-console
console.log('Copied files to dest');
//# sourceMappingURL=copySources.js.map