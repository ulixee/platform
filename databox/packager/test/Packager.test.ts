import * as Fs from 'fs/promises';
import * as Path from 'path';
import { existsSync } from 'fs';
import DataboxManifest from '@ulixee/databox-core/lib/DataboxManifest';
import { encodeBuffer } from '@ulixee/commons/lib/bufferUtils';
import { sha3 } from '@ulixee/commons/lib/hashUtils';
import DataboxPackager from '../index';
import DbxFile from '../lib/DbxFile';

beforeEach(async () => {
  if (existsSync(`${__dirname}/assets/historyTest.dbx.build`)) {
    await Fs.rm(`${__dirname}/assets/historyTest.dbx.build`, { recursive: true });
  }
  if (existsSync(`${__dirname}/assets/historyTest.dbx`))
    await Fs.unlink(`${__dirname}/assets/historyTest.dbx`);
  if (existsSync(`${__dirname}/build`)) await Fs.rm(`${__dirname}/build`, { recursive: true });
});

let workingDirectory: string;
let dbxFile: string;
afterEach(async () => {
  if (workingDirectory && existsSync(workingDirectory))
    await Fs.rm(workingDirectory, { recursive: true }).catch(() => null);
  if (dbxFile && existsSync(dbxFile)) await Fs.unlink(dbxFile).catch(() => null);
  workingDirectory = null;
  dbxFile = null;
});

afterAll(async () => {
  if (workingDirectory && existsSync(workingDirectory))
    await Fs.rm(workingDirectory, { recursive: true }).catch(() => null);
  if (dbxFile && existsSync(dbxFile)) await Fs.unlink(dbxFile).catch(() => null);
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
    linkedVersions: [],
    scriptEntrypoint: Path.join(`packager`, `test`, `assets`, `historyTest.js`),
    scriptHash: expect.any(String),
    coreVersion: require('../package.json').version,
    giftCardIssuerIdentity: undefined,
    schemaInterface: undefined,
    functionsByName: {
      default: {
        prices: [{ perQuery: 0, minimum: 0, addOns: undefined }],
        corePlugins: {
          '@ulixee/databox-plugins-hero': require('../package.json').version,
        },
      },
    },
    versionHash: DataboxManifest.createVersionHash(packager.manifest),
    versionTimestamp: expect.any(Number),
    paymentAddress: undefined,
  });
  expect((await Fs.stat(`${__dirname}/assets/historyTest.dbx`)).isFile()).toBeTruthy();

  await Fs.rm(dbx.workingDirectory, { recursive: true });
  await Fs.unlink(`${__dirname}/assets/historyTest.dbx`);
}, 45e3);

test('should be able to modify the local built files for uploading', async () => {
  const packager = new DataboxPackager(`${__dirname}/assets/historyTest.js`);
  workingDirectory = new DbxFile(dbxFile).workingDirectory;
  dbxFile = packager.dbxPath;

  const versionHash = encodeBuffer(sha3('dbxExtra'), 'dbx');
  await packager.build({ keepOpen: true });
  packager.manifest.linkedVersions.push({
    versionHash,
    versionTimestamp: Date.now(),
  });
  await packager.manifest.save();

  const packager2 = new DataboxPackager(`${__dirname}/assets/historyTest.js`);
  await packager2.build({ keepOpen: true });
  expect(packager2.manifest.linkedVersions.some(x => x.versionHash === versionHash)).toBeTruthy();
});

test('should be able to read a databox manifest next to an entrypoint', async () => {
  const packager = new DataboxPackager(`${__dirname}/assets/customManifest.js`);
  workingDirectory = packager.dbx.workingDirectory;
  dbxFile = packager.dbxPath;

  await packager.build();
  expect(packager.manifest.coreVersion).toBe('1.1.1');
});

test('should merge custom manifests', async () => {
  const packager = new DataboxPackager(`${__dirname}/assets/customManifest.js`);
  workingDirectory = packager.dbx.workingDirectory;
  dbxFile = packager.dbxPath;

  const projectConfig = Path.resolve(__dirname, '..', '.ulixee');
  await Fs.mkdir(projectConfig, { recursive: true }).catch(() => null);
  await Fs.writeFile(
    `${projectConfig}/databoxes.json`,
    JSON.stringify({
      [Path.join('..', 'test', 'assets', 'customManifest-manifest.json')]: {
        coreVersion: '1.1.2',
      },
    }),
  );

  await packager.build();
  await Fs.unlink(`${projectConfig}/databoxes.json`);
  // should take the closest (entrypoint override) over the project config
  expect(packager.manifest.coreVersion).toBe('1.1.1');
});

test('should build a version history with a new version', async () => {
  const entrypoint = `${__dirname}/assets/historyTest.js`;
  const packager = new DataboxPackager(entrypoint);
  const dbx = await packager.build();
  if (packager.manifest.linkedVersions.length) {
    await packager.manifest.setLinkedVersions(entrypoint, []);
  }
  workingDirectory = dbx.workingDirectory;
  dbxFile = packager.dbxPath;
  await Fs.writeFile(
    `${__dirname}/assets/_historytestManual.js`,
    `const {Databox, Function, HeroFunctionPlugin }=require("@ulixee/databox-plugins-hero");
const heroFunction = new Function(({output}) => {
   output.text=1;
},HeroFunctionPlugin);
module.exports = new Databox({ functions: { heroFunction }});`,
  );
  const packager2 = new DataboxPackager(`${__dirname}/assets/historyTest.js`);
  await packager2.build({
    compiledSourcePath: Path.resolve(`${__dirname}/assets/_historytestManual.js`),
  });
  await Fs.unlink(`${__dirname}/assets/_historytestManual.js`);
  expect(packager2.manifest.linkedVersions).toHaveLength(1);
});

test('should be able to "link" the version history', async () => {
  await Fs.writeFile(
    `${__dirname}/assets/historyTest2.js`,
    `const { Databox, Function, HeroFunctionPlugin }=require("@ulixee/databox-plugins-hero");
const heroFunction = new Function(({output}) => {
   output.text=1;
},HeroFunctionPlugin);
module.exports = new Databox({ functions: { heroFunction }})`,
  );
  const entrypoint = `${__dirname}/assets/historyTest2.js`;
  const packager = new DataboxPackager(entrypoint);
  await packager.build({ keepOpen: true });
  workingDirectory = packager.dbx.workingDirectory;
  dbxFile = packager.dbxPath;

  const [dbx1, dbx2, dbx3] = ['dbx1', 'dbx2', 'dbx3'].map(x => encodeBuffer(sha3(x), 'dbx'));
  await packager.manifest.setLinkedVersions(entrypoint, [
    { versionHash: dbx1, versionTimestamp: Date.now() - 25e3 },
    { versionHash: dbx2, versionTimestamp: Date.now() - 30e3 },
    { versionHash: dbx3, versionTimestamp: Date.now() - 60e3 },
  ]);
  expect(packager.manifest.linkedVersions.map(x => x.versionHash)).toEqual([dbx1, dbx2, dbx3]);
});

test('should be able to change the output directory', async () => {
  const packager = new DataboxPackager(`${__dirname}/assets/historyTest.js`, `${__dirname}/build`);
  workingDirectory = packager.dbx.workingDirectory;
  dbxFile = packager.dbxPath;

  const dbx = await packager.build();
  expect(dbx.dbxPath).toBe(Path.resolve(`${__dirname}/build/historyTest.dbx`));
  expect(dbx.workingDirectory).toBe(Path.resolve(`${__dirname}/build/historyTest.dbx.build`));
  expect(existsSync(dbx.dbxPath)).toBe(true);
});

test('should be able to package a multi-function Databox', async () => {
  const packager = new DataboxPackager(`${__dirname}/assets/multiFunctionTest.js`);
  await packager.build();
  dbxFile = packager.dbxPath;
  workingDirectory = packager.dbx.workingDirectory;
  const dbx = new DbxFile(dbxFile);
  expect(packager.manifest.toJSON()).toEqual({
    linkedVersions: [],
    scriptEntrypoint: Path.join(`packager`, `test`, `assets`, `multiFunctionTest.js`),
    scriptHash: expect.any(String),
    coreVersion: require('../package.json').version,
    giftCardIssuerIdentity: undefined,
    schemaInterface: `{
  funcWithInput: {
    input: {
      /**
       * @format url
       */
      url: string;
    };
  };
  funcWithOutput: {
    output: {
      title: string;
      html: string;
    };
  };
}`,
    functionsByName: {
      funcWithInput: {
        prices: [{ perQuery: 0, minimum: 0, addOns: undefined }],
        corePlugins: {
          '@ulixee/databox-plugins-hero': require('../package.json').version,
        },
      },
      funcWithOutput: {
        prices: [{ perQuery: 0, minimum: 0, addOns: undefined }],
        corePlugins: {},
      },
    },
    versionHash: DataboxManifest.createVersionHash(packager.manifest),
    versionTimestamp: expect.any(Number),
    paymentAddress: undefined,
  });
  expect((await Fs.stat(`${__dirname}/assets/multiFunctionTest.dbx`)).isFile()).toBeTruthy();

  await Fs.unlink(`${__dirname}/assets/multiFunctionTest.dbx`);
});

test('should be able to package an exported Function without a Databox', async () => {
  const packager = new DataboxPackager(`${__dirname}/assets/rawFunctionTest.js`);
  await packager.build();
  dbxFile = packager.dbxPath;
  workingDirectory = packager.dbx.workingDirectory;
  const dbx = new DbxFile(dbxFile);
  expect(packager.manifest.toJSON()).toEqual({
    linkedVersions: [],
    scriptEntrypoint: Path.join(`packager`, `test`, `assets`, `rawFunctionTest.js`),
    scriptHash: expect.any(String),
    coreVersion: require('../package.json').version,
    giftCardIssuerIdentity: undefined,
    schemaInterface: undefined,
    functionsByName: {
      default: {
        prices: [{ perQuery: 0, minimum: 0, addOns: undefined }],
        corePlugins: {
          '@ulixee/databox-plugins-hero': require('../package.json').version,
        },
      },
    },
    versionHash: DataboxManifest.createVersionHash(packager.manifest),
    versionTimestamp: expect.any(Number),
    paymentAddress: undefined,
  });
  expect((await Fs.stat(`${__dirname}/assets/rawFunctionTest.dbx`)).isFile()).toBeTruthy();

  await Fs.unlink(`${__dirname}/assets/rawFunctionTest.dbx`);
});
