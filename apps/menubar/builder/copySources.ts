import * as Fs from 'fs';
import * as Path from 'path';

const dest = Path.join(process.cwd(), process.argv[2]);

const baseBuild = `${__dirname}/../../../..`;

function copyDir(baseDir: string, outDir: string) {
  if (!Fs.existsSync(outDir)) Fs.mkdirSync(outDir);

  const packageJson = Fs.existsSync(`${baseDir}/package.json`)
    ? JSON.parse(Fs.readFileSync(`${baseDir}/package.json`, 'utf8'))
    : { private: false };

  for (const dir of Fs.readdirSync(baseDir)) {
    if (dir === 'node_modules' || dir === 'packages' || dir === 'menubar' || dir.endsWith('-ui'))
      continue;

    if (Fs.statSync(`${baseDir}/${dir}`).isDirectory()) {
      if (!Fs.existsSync(`${outDir}/${dir}`)) {
        Fs.mkdirSync(`${outDir}/${dir}`);
      }
      copyDir(`${baseDir}/${dir}`, `${outDir}/${dir}`);
    } else if (!packageJson.workspaces) {
      Fs.copyFileSync(`${baseDir}/${dir}`, `${outDir}/${dir}`);
    }
  }
}

copyDir(`${baseBuild}/build`, dest);
copyDir(`${baseBuild}/hero/build`, `${dest}/hero`);
copyDir(`${baseBuild}/databox/build`, `${dest}/databox`);

console.log('Copied files to dest', dest);
