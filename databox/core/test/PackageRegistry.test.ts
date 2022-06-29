import * as Hasher from '@ulixee/commons/lib/Hasher';
import IDataboxManifest from '@ulixee/databox-interfaces/IDataboxManifest';
import { mkdirSync, promises as Fs, readFileSync, rmdirSync } from 'fs';
import PackageRegistry from '../lib/PackageRegistry';
import DataboxNotFoundError from '../lib/DataboxNotFoundError';

const storageDir = process.env.ULX_DATA_DIR ?? '.';

afterAll(() => {
  rmdirSync(`${storageDir}/tmp`, { recursive: true });
});

test('should throw an error if the databox runtime is not installed', async () => {
  const registry = new PackageRegistry(storageDir);
  const databoxTmpDir = `${storageDir}/tmp/dbx1`;
  mkdirSync(databoxTmpDir, { recursive: true });
  await Fs.writeFile(
    `${databoxTmpDir}/databox-manifest.json`,
    JSON.stringify(<IDataboxManifest>{
      scriptVersionHash: '1',
      runtimeName: '@ulixee/not-here',
      runtimeVersion: '2.0.0-alpha.1',
      scriptEntrypoint: 'here.js',
      scriptVersionHashToCreatedDate: { '1': Date.now() },
    }),
  );
  await Fs.writeFile(`${databoxTmpDir}/databox.js`, 'function(){}');
  await expect(registry.save(databoxTmpDir)).rejects.toThrow('not installed');
});

test('should be able to upload and retrieve the databox', async () => {
  const registry = new PackageRegistry(storageDir);
  const script = 'function(){}';
  const scriptVersionHash = Hasher.hashDatabox(Buffer.from(script));
  const databoxTmpDir = `${storageDir}/tmp/dbx2`;
  mkdirSync(databoxTmpDir, { recursive: true });
  await Fs.writeFile(
    `${databoxTmpDir}/databox-manifest.json`,
    JSON.stringify(<IDataboxManifest>{
      scriptVersionHash,
      runtimeName: '@ulixee/databox-for-hero',
      runtimeVersion: '2.0.0-alpha.1',
      scriptEntrypoint: 'here.js',
      scriptVersionHashToCreatedDate: { [scriptVersionHash]: Date.now() },
    }),
  );
  await Fs.writeFile(`${databoxTmpDir}/databox.js`, script);
  await expect(registry.save(databoxTmpDir)).resolves.toBeUndefined();

  const uploaded = registry.getByHash(scriptVersionHash);
  expect(uploaded).toBeTruthy();
  expect(readFileSync(uploaded.path, 'utf8')).toBe(script);
});

test('should throw an error with version history if current versions are unmatched', async () => {
  const registry = new PackageRegistry(storageDir);
  const script1 = 'function 1(){}';
  const script1VersionHash = Hasher.hashDatabox(Buffer.from(script1));
  const script2 = 'function 2(){}';
  const script2VersionHash = Hasher.hashDatabox(Buffer.from(script2));

  const scriptDetails = {
    runtimeName: '@ulixee/databox-for-hero',
    runtimeVersion: '2.0.0-alpha.1',
    scriptEntrypoint: 'here.js',
  };

  const script3 = 'function 3(){}';
  const script3VersionHash = Hasher.hashDatabox(Buffer.from(script3));
  {
    const databoxTmpDir = `${storageDir}/tmp/dbx3`;
    const scriptVersionHash = script1VersionHash;
    mkdirSync(databoxTmpDir, { recursive: true });
    await Fs.writeFile(
      `${databoxTmpDir}/databox-manifest.json`,
      JSON.stringify({
        ...scriptDetails,
        scriptVersionHash,
        scriptVersionHashToCreatedDate: { [scriptVersionHash]: Date.now() },
      }),
    );
    await Fs.writeFile(`${databoxTmpDir}/databox.js`, script1);
    await expect(registry.save(databoxTmpDir)).resolves.toBeUndefined();

    expect(registry.getByHash(scriptVersionHash)).toBeTruthy();
  }
  {
    const databoxTmpDir = `${storageDir}/tmp/dbx4`;
    const scriptVersionHash = script2VersionHash;

    mkdirSync(databoxTmpDir, { recursive: true });
    await Fs.writeFile(
      `${databoxTmpDir}/databox-manifest.json`,
      JSON.stringify({
        ...scriptDetails,
        scriptVersionHash,
        scriptVersionHashToCreatedDate: {
          [scriptVersionHash]: Date.now(),
          [script1VersionHash]: Date.now() - 1,
        },
      }),
    );
    await Fs.writeFile(`${databoxTmpDir}/databox.js`, script2);
    await expect(registry.save(databoxTmpDir)).resolves.toBeUndefined();

    expect(registry.getByHash(scriptVersionHash)).toBeTruthy();
    expect(registry.getLatestVersion(script2VersionHash)).toBe(script2VersionHash);
    expect(registry.getLatestVersion(script1VersionHash)).toBe(script2VersionHash);
  }

  {
    const databoxTmpDir = `${storageDir}/tmp/dbx5`;
    const scriptVersionHash = script3VersionHash;

    mkdirSync(databoxTmpDir, { recursive: true });
    await Fs.writeFile(
      `${databoxTmpDir}/databox-manifest.json`,
      JSON.stringify({
        ...scriptDetails,
        scriptVersionHash,
        scriptVersionHashToCreatedDate: {
          [scriptVersionHash]: Date.now(),
          [script1VersionHash]: Date.now() - 1,
        },
      }),
    );
    await Fs.writeFile(`${databoxTmpDir}/databox.js`, script3);
    await expect(registry.save(databoxTmpDir)).rejects.toThrow('different version history');
  }
});

test('should provide a newer version hash if old script not available', async () => {
  const registry = new PackageRegistry(storageDir);
  // @ts-expect-error
  registry.databoxesDb.databoxVersions.save('not-there', Date.now(),'maybe-there');
  try {
    registry.getByHash('not-there');
  } catch (e) {
    expect(e).toBeInstanceOf(DataboxNotFoundError);
    expect(e.latestVersionHash).toBe('maybe-there');
  }
});
