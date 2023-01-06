import * as HashUtils from '@ulixee/commons/lib/hashUtils';
import IDatastoreManifest, {
  IVersionHistoryEntry,
} from '@ulixee/specification/types/IDatastoreManifest';
import { mkdirSync, promises as Fs, readFileSync, rmSync } from 'fs';
import { Helpers } from '@ulixee/datastore-testing';
import * as Path from 'path';
import { encodeBuffer } from '@ulixee/commons/lib/bufferUtils';
import { sha3 } from '@ulixee/commons/lib/hashUtils';
import DatastoreRegistry from '../lib/DatastoreRegistry';
import { DatastoreNotFoundError } from '../lib/errors';
import DatastoreManifest from '../lib/DatastoreManifest';

const storageDir = Path.resolve(process.env.ULX_DATA_DIR ?? '.', 'DatastoreRegistry.test');
const tmpDir = `${storageDir}/tmp`;

afterEach(Helpers.afterEach);
afterAll(async () => {
  await Helpers.afterAll();
  rmSync(storageDir, { recursive: true });
});

function hashScript(script: string): string {
  const sha = HashUtils.sha3(script);
  return encodeBuffer(sha, 'scr');
}

test('should throw an error if the required datastore core version is not installed', async () => {
  const registry = new DatastoreRegistry(storageDir, tmpDir);
  Helpers.needsClosing.push(registry);
  const datastoreTmpDir = `${storageDir}/tmp/dbx1`;
  mkdirSync(datastoreTmpDir, { recursive: true });
  await Fs.writeFile(
    `${datastoreTmpDir}/datastore-manifest.json`,
    JSON.stringify(<IDatastoreManifest>{
      versionHash: encodeBuffer(sha3('dbx123'), 'dbx'),
      scriptHash: encodeBuffer(sha3('scr123'), 'scr'),
      coreVersion: '5.0.0',
      versionTimestamp: Date.now(),
      functionsByName: {},
      scriptEntrypoint: 'here.js',
      linkedVersions: [],
    }),
  );
  await Fs.writeFile(`${datastoreTmpDir}/datastore.js`, 'function(){}');
  await expect(registry.save(datastoreTmpDir, Buffer.from('dbx file'))).rejects.toThrow(
    'not compatible with the version required by your Datastore',
  );
});

test('should be able to upload and retrieve the datastore', async () => {
  const registry = new DatastoreRegistry(storageDir, tmpDir);
  Helpers.needsClosing.push(registry);
  const script = 'function(){}';
  const scriptHash = hashScript(script);
  const datastoreTmpDir = `${storageDir}/tmp/dbx2`;
  mkdirSync(datastoreTmpDir, { recursive: true });
  const versionTimestamp = Date.now();
  const versionHash = DatastoreManifest.createVersionHash({
    scriptHash,
    versionTimestamp,
    scriptEntrypoint: 'here.js',
    linkedVersions: [],
    functionsByName: { default: {} },
  });
  await Fs.writeFile(
    `${datastoreTmpDir}/datastore-manifest.json`,
    JSON.stringify(<IDatastoreManifest>{
      scriptHash,
      versionTimestamp,
      versionHash,
      coreVersion: '2.0.0-alpha.1',
      scriptEntrypoint: 'here.js',
      functionsByName: { default: {} },
      linkedVersions: [],
    }),
  );
  await Fs.writeFile(`${datastoreTmpDir}/datastore.js`, script);
  await expect(registry.save(datastoreTmpDir, Buffer.from(script))).resolves.toBeTruthy();

  const uploaded = registry.getByVersionHash(versionHash);
  expect(uploaded).toBeTruthy();
  expect(readFileSync(uploaded.path, 'utf8')).toBe(script);
});

test('should allow a user to override updating with no history', async () => {
  const datastoreTmpDir = `${storageDir}/tmp/test`;
  Helpers.needsClosing.push({ close: () => rmSync(datastoreTmpDir), onlyCloseOnFinal: false });
  const registry = new DatastoreRegistry(storageDir, tmpDir);
  Helpers.needsClosing.push(registry);

  let originalVersionHash: string;
  {
    await Fs.mkdir(datastoreTmpDir, { recursive: true });
    const script = 'function 1(){}';
    const manifest = <IDatastoreManifest>{
      coreVersion: '2.0.0-alpha.1',
      scriptEntrypoint: 'override.js',
      versionTimestamp: Date.now(),
      scriptHash: hashScript(script),
      versionHash: null,
      functionsByName: { default: {} },
      linkedVersions: [],
    };

    manifest.versionHash = DatastoreManifest.createVersionHash(manifest);
    originalVersionHash = manifest.versionHash;

    await Fs.writeFile(`${datastoreTmpDir}/datastore-manifest.json`, JSON.stringify(manifest));
    await Fs.writeFile(`${datastoreTmpDir}/datastore.js`, script);
    await expect(registry.save(datastoreTmpDir, Buffer.from(script))).resolves.toBeTruthy();
  }
  {
    await Fs.mkdir(datastoreTmpDir, { recursive: true });
    const script = 'function 2(){}';
    const manifest = <IDatastoreManifest>{
      coreVersion: '2.0.0-alpha.1',
      scriptEntrypoint: 'override.js',
      scriptHash: hashScript(script),
      versionTimestamp: Date.now(),
      functionsByName: { default: {} },
      versionHash: null,
      linkedVersions: [],
    };

    manifest.versionHash = DatastoreManifest.createVersionHash(manifest);

    await Fs.writeFile(`${datastoreTmpDir}/datastore-manifest.json`, JSON.stringify(manifest));
    await Fs.writeFile(`${datastoreTmpDir}/datastore.js`, script);
    await expect(registry.save(datastoreTmpDir, Buffer.from(script))).rejects.toThrow(
      'link to previous version history',
    );
    expect(registry.getLatestVersion(originalVersionHash)).toBe(originalVersionHash);
    // force new history
    await expect(registry.save(datastoreTmpDir, Buffer.from(script), true)).resolves.toBeTruthy();
    expect(registry.getLatestVersion(originalVersionHash)).toBe(originalVersionHash);
    expect(registry.getLatestVersion(manifest.versionHash)).toBe(manifest.versionHash);
  }
});

test('should throw an error with version history if current versions are unmatched', async () => {
  const registry = new DatastoreRegistry(storageDir, tmpDir);
  Helpers.needsClosing.push(registry);
  const script1 = 'function 1(){}';
  const script1VersionHash = hashScript(script1);
  const script2 = 'function 2(){}';
  const script2VersionHash = hashScript(script2);

  const scriptDetails = {
    coreVersion: '2.0.0-alpha.1',
    scriptEntrypoint: 'unmatched.js',
  };

  const script3 = 'function 3(){}';
  const script3VersionHash = hashScript(script3);
  const versions: IVersionHistoryEntry[] = [];
  {
    const datastoreTmpDir = `${storageDir}/tmp/dbx3`;
    const scriptHash = script1VersionHash;
    mkdirSync(datastoreTmpDir, { recursive: true });
    const manifest = <IDatastoreManifest>{
      ...scriptDetails,
      scriptHash,
      versionTimestamp: Date.now(),
      versionHash: null,
      functionsByName: { default: {} },
      linkedVersions: [],
    };
    manifest.versionHash = DatastoreManifest.createVersionHash(manifest);
    versions.push({ versionHash: manifest.versionHash, versionTimestamp: Date.now() });
    await Fs.writeFile(`${datastoreTmpDir}/datastore-manifest.json`, JSON.stringify(manifest));
    await Fs.writeFile(`${datastoreTmpDir}/datastore.js`, script1);
    await expect(registry.save(datastoreTmpDir, Buffer.from(script1))).resolves.toBeTruthy();

    expect(registry.getByVersionHash(manifest.versionHash)).toBeTruthy();
  }
  {
    const datastoreTmpDir = `${storageDir}/tmp/dbx4`;
    const scriptHash = script2VersionHash;

    mkdirSync(datastoreTmpDir, { recursive: true });
    const manifest = <IDatastoreManifest>{
      ...scriptDetails,
      scriptHash,
      versionTimestamp: Date.now(),
      versionHash: null,
      functionsByName: { default: {} },
      linkedVersions: [...versions],
    };
    manifest.versionHash = DatastoreManifest.createVersionHash(manifest);
    versions.unshift({ versionHash: manifest.versionHash, versionTimestamp: Date.now() });

    await Fs.writeFile(`${datastoreTmpDir}/datastore-manifest.json`, JSON.stringify(manifest));
    await Fs.writeFile(`${datastoreTmpDir}/datastore.js`, script2);
    await expect(registry.save(datastoreTmpDir, Buffer.from(script2))).resolves.toBeTruthy();

    expect(registry.getByVersionHash(manifest.versionHash)).toBeTruthy();
    expect(registry.getLatestVersion(versions[1].versionHash)).toBe(manifest.versionHash);
    expect(registry.getLatestVersion(manifest.versionHash)).toBe(manifest.versionHash);
  }

  {
    const datastoreTmpDir = `${storageDir}/tmp/dbx5`;
    const scriptHash = script3VersionHash;

    mkdirSync(datastoreTmpDir, { recursive: true });
    const manifest = <IDatastoreManifest>{
      ...scriptDetails,
      scriptHash,
      versionTimestamp: Date.now(),
      versionHash: null,
      functionsByName: { default: {} },
      linkedVersions: [versions[1]],
    };
    manifest.versionHash = DatastoreManifest.createVersionHash(manifest);
    await Fs.writeFile(`${datastoreTmpDir}/datastore-manifest.json`, JSON.stringify(manifest));
    await Fs.writeFile(`${datastoreTmpDir}/datastore.js`, script3);
    await expect(registry.save(datastoreTmpDir, Buffer.from(script3))).rejects.toThrow(
      'different version history',
    );
  }
});

test('should provide a newer version hash if old script not available', async () => {
  const registry = new DatastoreRegistry(storageDir, tmpDir);
  Helpers.needsClosing.push(registry);
  // @ts-ignore
  registry.datastoresDb.datastoreVersions.save('maybe-there', Date.now(), 'not-there', null);
  try {
    registry.getByVersionHash('not-there');
  } catch (e) {
    expect(e).toBeInstanceOf(DatastoreNotFoundError);
    expect(e.latestVersionHash).toBe('maybe-there');
  }
});
