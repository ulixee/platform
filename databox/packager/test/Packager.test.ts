import * as Fs from 'fs/promises';
import * as Path from 'path';
import * as os from 'os';
import { existsSync } from 'fs';
import DataboxPackager from '../index';
import DbxFile from '../lib/DbxFile';

beforeEach(async () => {
  if (existsSync(`${__dirname}/assets/historyTest.js.dbx.build`)) {
    await Fs.rm(`${__dirname}/assets/historyTest.js.dbx.build`, { recursive: true });
  }
  if (existsSync(`${__dirname}/assets/historyTest.js.dbx`))
    await Fs.unlink(`${__dirname}/assets/historyTest.js.dbx`);
});

let workingDirectory: string;
let dbxFile: string;
afterEach(async () => {
  if (workingDirectory) await Fs.rmdir(workingDirectory, { recursive: true }).catch(() => null);
  if (dbxFile) await Fs.unlink(dbxFile).catch(() => null);
  workingDirectory = null;
  dbxFile = null;
});

test('it should generate a relative script entrypoint', async () => {
  const packager = new DataboxPackager(`${__dirname}/assets/historyTest.js`);
  await packager.build();
  dbxFile = packager.dbxPath;
  const dbx = new DbxFile(dbxFile);
  workingDirectory = dbx.workingDirectory;
  await dbx.open();

  expect(dbx.workingDirectory).toBe(Path.resolve(`${__dirname}/assets/historyTest.dbx.build`));
  expect(packager.script).toBe(await Fs.readFile(`${dbx.workingDirectory}/databox.js`, 'utf8'));
  expect(packager.sourceMap).toBe(
    await Fs.readFile(`${dbx.workingDirectory}/databox.js.map`, 'utf8'),
  );

  await expect(
    Fs.readFile(`${dbx.workingDirectory}/databox-manifest.json`, 'utf8'),
  ).resolves.toBeTruthy();

  expect(packager.manifest.toJSON()).toEqual({
    scriptEntrypoint: Path.join(`packager`, `test`, `assets`, `historyTest.js`),
    scriptVersionHash: expect.any(String),
    runtimeName: '@ulixee/databox-for-hero',
    runtimeVersion: require('../package.json').version,
    scriptVersionHashToCreatedDate: { [packager.manifest.scriptVersionHash]: expect.any(Number) },
  });
  expect((await Fs.stat(`${__dirname}/assets/historyTest.dbx`)).isFile()).toBeTruthy();

  await Fs.rmdir(dbx.workingDirectory, { recursive: true });
  await Fs.unlink(`${__dirname}/assets/historyTest.dbx`);
}, 45e3);

test('should be able to modify the local built files for uploading', async () => {
  const packager = new DataboxPackager(`${__dirname}/assets/historyTest.js`);
  workingDirectory = new DbxFile(dbxFile).workingDirectory;
  dbxFile = packager.dbxPath;

  await packager.build({ keepOpen: true });
  packager.manifest.scriptVersionHashToCreatedDate['extra-version'] = Date.now();
  await packager.manifest.save();

  const packager2 = new DataboxPackager(`${__dirname}/assets/historyTest.js`);
  await packager2.build({ keepOpen: true });
  expect(packager2.manifest.scriptVersionHashToCreatedDate['extra-version']).toBeTruthy();
});

test.todo('should be able to read a custom manifest');

test.todo('should merge custom manifest, dbx file, project files, then global settings');

test('should build a version history with a new version', async () => {
  const packager = new DataboxPackager(`${__dirname}/assets/historyTest.js`);
  await packager.build();
  const dbx = new DbxFile(dbxFile);
  workingDirectory = dbx.workingDirectory;
  dbxFile = packager.dbxPath;

  await dbx.open();

  await Fs.writeFile(
    `${__dirname}/assets/_historytestManual.js`,
    `const Databox=require("@ulixee/databox-for-hero");
module.exports=new Databox(({output}) => {
   output.text=1;
});`,
  );
  const packager2 = new DataboxPackager(`${__dirname}/assets/historyTest.js`);
  await packager2.build({
    compiledSourcePath: Path.resolve(`${__dirname}/assets/_historytestManual.js`),
  });
  await Fs.unlink(`${__dirname}/assets/_historytestManual.js`);
  expect(Object.keys(packager2.manifest.scriptVersionHashToCreatedDate)).toHaveLength(2);
});

test('should be able to "rebase" the version history', async () => {
  await Fs.writeFile(
    `${__dirname}/assets/historyTest2.js`,
    `const Databox=require("@ulixee/databox-for-hero");
module.exports=new Databox(({output}) => {
   output.text=1;
});`,
  );
  const packager = new DataboxPackager(`${__dirname}/assets/historyTest2.js`);
  await packager.build({ keepOpen: true });
  dbxFile = packager.dbxPath;

  await packager.manifest.rebase({
    dbx1: Date.now() - 25e3,
    dbx2: Date.now() - 30e3,
    dbx3: Date.now() - 60e3,
  });
  expect(Object.keys(packager.manifest.scriptVersionHashToCreatedDate)).toEqual([
    packager.manifest.scriptVersionHash,
    'dbx1',
    'dbx2',
    'dbx3',
  ]);
});
