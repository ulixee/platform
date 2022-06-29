import { isSemverSatisfied } from '@ulixee/commons/lib/VersionUtils';
import { promises as Fs } from 'fs';
import * as Hasher from '@ulixee/commons/lib/Hasher';
import * as Path from 'path';
import IDataboxManifest from '@ulixee/databox-interfaces/IDataboxManifest';
import { existsAsync, readFileAsJson } from '@ulixee/commons/lib/fileUtils';
import DataboxesDb from './DataboxesDb';
import { IDataboxRecord } from './DataboxesTable';
import InvalidScriptVersionHistoryError from './InvalidScriptVersionHistoryError';
import DataboxNotFoundError from './DataboxNotFoundError';

export default class PackageRegistry {
  private readonly databoxesDb: DataboxesDb;

  constructor(readonly storageDir: string) {
    this.databoxesDb = new DataboxesDb(storageDir);
  }

  public getByHash(hash: string): IDataboxRecord & { path: string; latestVersionHash: string } {
    const path = this.getDataboxPathForHash(hash);
    const entry = this.databoxesDb.databoxes.getByHash(hash);
    const latestVersionHash = this.getLatestVersion(hash);

    if (!entry) {
      throw new DataboxNotFoundError('Databox package not found on server.', latestVersionHash);
    }
    return {
      path,
      latestVersionHash,
      ...entry,
    };
  }

  public getLatestVersion(hash: string): string {
    return this.databoxesDb.databoxVersions.getLatestVersion(hash);
  }

  public async save(databoxTmpPath: string): Promise<void> {
    const manifest = await readFileAsJson<IDataboxManifest>(`${databoxTmpPath}/databox-manifest.json`);
    if (!manifest) throw new Error('Could not read the provided .dbx manifest.');

    this.checkDataboxRuntimeInstalled(manifest.runtimeName, manifest.runtimeVersion);
    // validate hash
    const scriptBuffer = await Fs.readFile(`${databoxTmpPath}/databox.js`);
    const expectedHash = Hasher.hashDatabox(scriptBuffer);
    if (manifest.scriptVersionHash !== expectedHash) {
      throw new Error(
        'Mismatched Databox scriptVersionHash provided. Should be SHA3 256 in Bech32m encoding.',
      );
    }

    this.checkVersionHistoryMatch(manifest);

    await this.savePackage(manifest, databoxTmpPath);
  }

  private checkDataboxRuntimeInstalled(name: string, version: string): void {
    let installedRuntimeVersion: string;
    try {
      // eslint-disable-next-line global-require,import/no-dynamic-require
      const databoxPackageJson = require(`${name}-core-runtime/package.json`);
      installedRuntimeVersion = databoxPackageJson.version;
    } catch (error) {
      throw new Error(
        `The requested Databox runtime (${name}) is not installed.\n${error.message}`,
      );
    }
    if (!isSemverSatisfied(version, installedRuntimeVersion)) {
      throw new Error(
        `The installed Databox Runtime Version (${installedRuntimeVersion}) is not compatible with the required version from your Databox Package (${name}).\n
Please try to re-upload after testing with the version available on this server.`,
      );
    }
  }

  private checkVersionHistoryMatch(manifest: IDataboxManifest): void {
    if (Object.keys(manifest.scriptVersionHashToCreatedDate).length <= 1) return;

    const storedPreviousVersions = this.databoxesDb.databoxVersions.getPreviousVersions(
      Object.keys(manifest.scriptVersionHashToCreatedDate),
    );

    let includesAllCurrentlyStoredVersions = true;
    for (const scriptHash of Object.keys(storedPreviousVersions)) {
      if (!manifest.scriptVersionHashToCreatedDate[scriptHash]) {
        includesAllCurrentlyStoredVersions = false;
        break;
      }
    }

    // if previous version is not already set to this one, or set to itself, we have a mismatch
    if (!includesAllCurrentlyStoredVersions) {
      const fullVersionHistory = Object.entries({
        ...manifest.scriptVersionHashToCreatedDate,
        ...storedPreviousVersions,
      });
      fullVersionHistory.sort((a, b) => b[1] - a[1]);
      throw new InvalidScriptVersionHistoryError(
        `The currently uploaded script has a different version history.`,
        // @ts-ignore
        Object.fromEntries(fullVersionHistory),
      );
    }
  }

  private getPathForHash(hash: string): string {
    return Path.resolve(this.storageDir, hash);
  }

  private getManifestPathForHash(hash: string): string {
    return Path.resolve(this.getPathForHash(hash), 'databox-manifest.json');
  }

  private getDataboxPathForHash(hash: string): string {
    return Path.resolve(this.getPathForHash(hash), 'databox.js');
  }

  private async savePackage(manifest: IDataboxManifest, tmpDir: string): Promise<string> {
    const hash = manifest.scriptVersionHash;
    const destination = this.getPathForHash(hash);

    if (await existsAsync(destination)) {
      await Fs.copyFile(`${tmpDir}/databox-manifest.json`, this.getManifestPathForHash(hash));
    } else {
      await Fs.rename(tmpDir, destination);
    }

    this.saveManifest(manifest);

    return hash;
  }

  private saveManifest(manifest: IDataboxManifest): IDataboxRecord {
    this.databoxesDb.databoxes.save(manifest);
    for (const [version, date] of Object.entries(manifest.scriptVersionHashToCreatedDate)) {
      this.databoxesDb.databoxVersions.save(version, date, manifest.scriptVersionHash);
    }
    return this.databoxesDb.databoxes.getByHash(manifest.scriptVersionHash);
  }
}
