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
import DataboxManifest from './DataboxManifest';
import MissingLinkedScriptVersionsError from './MissingLinkedScriptVersionsError';

export default class PackageRegistry {
  private readonly databoxesDb: DataboxesDb;

  constructor(readonly storageDir: string) {
    this.databoxesDb = new DataboxesDb(storageDir);
  }

  public getByHash(hash: string): IDataboxRecord & { path: string; latestVersionHash: string } {
    const path = this.getDataboxPathForHash(hash);
    const entry = this.databoxesDb.databoxes.getByVersionHash(hash);
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

  public async save(databoxTmpPath: string, allowNewLinkedVersionHistory = false): Promise<void> {
    const manifest = await readFileAsJson<IDataboxManifest>(
      `${databoxTmpPath}/databox-manifest.json`,
    );
    if (!manifest) throw new Error('Could not read the provided .dbx manifest.');

    this.checkDataboxRuntimeInstalled(manifest.runtimeName, manifest.runtimeVersion);
    // validate hash
    const scriptBuffer = await Fs.readFile(`${databoxTmpPath}/databox.js`);
    const expectedScriptHash = Hasher.hash(scriptBuffer, 'scr');
    if (manifest.scriptHash !== expectedScriptHash) {
      throw new Error(
        'Mismatched Databox scriptHash provided. Should be SHA3 256 in Bech32m encoding.',
      );
    }
    const expectedVersionHash = DataboxManifest.createVersionHash(manifest);
    if (expectedVersionHash !== manifest.versionHash) {
      throw new Error(
        'Mismatched Databox versionHash provided. Should be SHA3 256 in Bech32m encoding.',
      );
    }

    if (!allowNewLinkedVersionHistory) this.checkMatchingEntrypointVersions(manifest);

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

  private checkMatchingEntrypointVersions(manifest: IDataboxManifest): void {
    if (manifest.linkedVersions.length) return;
    const versionWithEntrypoint = this.databoxesDb.databoxes.findWithEntrypoint(
      manifest.scriptEntrypoint,
    );
    if (versionWithEntrypoint) {
      const baseHash = this.databoxesDb.databoxVersions.getBaseHash(
        versionWithEntrypoint.versionHash,
      );
      const fullVersionHistory = this.databoxesDb.databoxVersions.getPreviousVersions(baseHash);
      throw new MissingLinkedScriptVersionsError(
        `You uploaded a script without any link to previous version history.`,
        fullVersionHistory,
      );
    }
  }

  private checkVersionHistoryMatch(manifest: IDataboxManifest): void {
    const versions = manifest.linkedVersions;
    if (!versions.length) return;

    const storedPreviousVersions = this.databoxesDb.databoxVersions.getPreviousVersions(
      versions[versions.length - 1]?.versionHash,
    );

    let includesAllCurrentlyStoredVersions = true;
    const fullVersionHistory = [...manifest.linkedVersions];
    for (const versionEntry of storedPreviousVersions) {
      fullVersionHistory.push(versionEntry);
      if (!manifest.linkedVersions.some(x => x.versionHash === versionEntry.versionHash)) {
        includesAllCurrentlyStoredVersions = false;
      }
    }

    // if previous version is not already set to this one, or set to itself, we have a mismatch
    if (!includesAllCurrentlyStoredVersions) {
      fullVersionHistory.sort((a, b) => b.versionTimestamp - a.versionTimestamp);
      throw new InvalidScriptVersionHistoryError(
        `The uploaded Databox has a different version history than your local version.`,
        fullVersionHistory,
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
    const hash = manifest.versionHash;
    const destination = this.getPathForHash(hash);

    if (await existsAsync(destination)) {
      await Fs.copyFile(`${tmpDir}/databox-manifest.json`, this.getManifestPathForHash(hash));
    } else {
      try {
        // Windows has issues renaming cross-drive, so we need to fallback to copying.
        await Fs.rename(tmpDir, destination);
      } catch (error) {
        await Fs.mkdir(destination, { recursive: true });
        await Promise.all([
          Fs.copyFile(`${tmpDir}/databox.js`, this.getDataboxPathForHash(hash)),
          Fs.copyFile(`${tmpDir}/databox.js.map`, `${this.getDataboxPathForHash(hash)}.map`).catch(
            () => null,
          ),
          Fs.copyFile(`${tmpDir}/databox-manifest.json`, this.getManifestPathForHash(hash)),
        ]);
        await Fs.rm(tmpDir, { recursive: true });
      }
    }

    this.saveManifest(manifest);

    return hash;
  }

  private saveManifest(manifest: IDataboxManifest): IDataboxRecord {
    this.databoxesDb.databoxes.save(manifest);
    if (manifest.linkedVersions.length) {
      const baseVersionHash =
        manifest.linkedVersions[manifest.linkedVersions.length - 1].versionHash;
      for (const version of manifest.linkedVersions) {
        if (version.versionHash === baseVersionHash) continue;
        this.databoxesDb.databoxVersions.save(
          version.versionHash,
          version.versionTimestamp,
          baseVersionHash,
        );
      }
      this.databoxesDb.databoxVersions.save(
        manifest.versionHash,
        manifest.versionTimestamp,
        baseVersionHash,
      );
    } else {
      this.databoxesDb.databoxVersions.save(
        manifest.versionHash,
        manifest.versionTimestamp,
        manifest.versionHash,
      );
    }
    return this.databoxesDb.databoxes.getByVersionHash(manifest.versionHash);
  }
}
