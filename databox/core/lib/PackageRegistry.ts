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
import { unpackDbxFile } from './dbxUtils';

export default class PackageRegistry {
  private readonly databoxesDb: DataboxesDb;

  constructor(readonly storageDir: string, readonly workingDir: string) {
    this.databoxesDb = new DataboxesDb(storageDir);
  }

  public hasVersionHash(versionHash: string): boolean {
    return !!this.databoxesDb.databoxes.getByVersionHash(versionHash);
  }

  public getByVersionHash(
    versionHash: string,
  ): IDataboxRecord & { path: string; latestVersionHash: string } {
    const path = this.getExtractedDataboxPath(versionHash);
    const entry = this.databoxesDb.databoxes.getByVersionHash(versionHash);
    const latestVersionHash = this.getLatestVersion(versionHash);

    if (!entry) {
      throw new DataboxNotFoundError('Databox package not found on server.', latestVersionHash);
    }
    return {
      path,
      latestVersionHash,
      ...entry,
    };
  }

  public async openDbx(manifest: IDataboxManifest): Promise<void> {
    const dbxPath = this.getDbxPath(manifest);
    const workingDir = this.getDataboxWorkingDirectory(manifest.versionHash);
    if (await existsAsync(workingDir)) return;
    await Fs.mkdir(workingDir, { recursive: true });
    await unpackDbxFile(dbxPath, workingDir);
  }

  public getLatestVersion(hash: string): string {
    return this.databoxesDb.databoxVersions.getLatestVersion(hash);
  }

  public async save(
    databoxTmpPath: string,
    rawBuffer: Buffer,
    allowNewLinkedVersionHistory = false,
  ): Promise<{ dbxPath: string }> {
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

    const dbxPath = this.getDbxPath(manifest);
    if (this.hasVersionHash(manifest.versionHash)) return { dbxPath };

    if (!allowNewLinkedVersionHistory) this.checkMatchingEntrypointVersions(manifest);

    this.checkVersionHistoryMatch(manifest);

    // move to an active working dir path
    const workingDirectory = this.getDataboxWorkingDirectory(manifest.versionHash);
    if (!(await existsAsync(workingDirectory))) {
      await Fs.rename(databoxTmpPath, workingDirectory);
    }

    if (!(await existsAsync(dbxPath))) {
      await Fs.writeFile(dbxPath, rawBuffer);
    }

    this.saveManifestMetadata(manifest);

    return { dbxPath };
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

  private getDbxPath(manifest: IDataboxManifest): string {
    const entrypoint = Path.basename(
      manifest.scriptEntrypoint,
      Path.extname(manifest.scriptEntrypoint),
    );
    return Path.resolve(this.storageDir, `${entrypoint}@${manifest.versionHash}.dbx`);
  }

  private getDataboxWorkingDirectory(versionHash: string): string {
    return Path.resolve(this.workingDir, versionHash);
  }

  private getExtractedDataboxPath(versionHash: string): string {
    return Path.resolve(this.getDataboxWorkingDirectory(versionHash), 'databox.js');
  }

  private saveManifestMetadata(manifest: IDataboxManifest): IDataboxRecord {
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
