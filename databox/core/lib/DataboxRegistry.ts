import { isSemverSatisfied } from '@ulixee/commons/lib/VersionUtils';
import { promises as Fs } from 'fs';
import * as HashUtils from '@ulixee/commons/lib/hashUtils';
import { encodeBuffer } from '@ulixee/commons/lib/bufferUtils';
import * as Path from 'path';
import IDataboxManifest from '@ulixee/specification/types/IDataboxManifest';
import { existsAsync, readFileAsJson } from '@ulixee/commons/lib/fileUtils';
import DataboxesDb from './DataboxesDb';
import { IDataboxRecord } from './DataboxesTable';
import {
  DataboxNotFoundError,
  InvalidScriptVersionHistoryError,
  MissingLinkedScriptVersionsError,
} from './errors';
import DataboxManifest from './DataboxManifest';
import { unpackDbxFile } from './dbxUtils';
import { IDataboxStatsRecord } from './DataboxStatsTable';

export interface IStatsByFunctionName {
  [functionName: string]: IDataboxStatsRecord;
}
export default class DataboxRegistry {
  private get databoxesDb(): DataboxesDb {
    this.#databoxesDb ??= new DataboxesDb(this.storageDir);
    return this.#databoxesDb;
  }

  #databoxesDb: DataboxesDb;

  constructor(readonly storageDir: string, readonly workingDir: string) {}

  public hasVersionHash(versionHash: string): boolean {
    return !!this.databoxesDb.databoxes.getByVersionHash(versionHash);
  }

  public getByVersionHash(versionHash: string): IDataboxRecord & {
    statsByFunction: IStatsByFunctionName;
    path: string;
    latestVersionHash: string;
  } {
    const path = this.getExtractedDataboxPath(versionHash);
    const entry = this.databoxesDb.databoxes.getByVersionHash(versionHash);
    const latestVersionHash = this.getLatestVersion(versionHash);

    if (!entry) {
      throw new DataboxNotFoundError('Databox package not found on Miner.', latestVersionHash);
    }
    const statsByFunction: IStatsByFunctionName = {};
    for (const name of Object.keys(entry.functionsByName)) {
      statsByFunction[name] = this.databoxesDb.databoxStats.getByVersionHash(versionHash, name);
    }
    return {
      path,
      statsByFunction,
      latestVersionHash,
      ...entry,
    };
  }

  public recordStats(
    versionHash: string,
    functionName: string,
    stats: { bytes: number; microgons: number; millis: number },
  ): void {
    this.databoxesDb.databoxStats.record(versionHash, functionName, stats.microgons, stats.bytes, stats.millis);
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

    await DataboxManifest.validate(manifest);

    if (!manifest) throw new Error('Could not read the provided .dbx manifest.');
    this.checkDataboxCoreInstalled(manifest.coreVersion);
    // validate hash
    const scriptBuffer = await Fs.readFile(`${databoxTmpPath}/databox.js`);
    const sha = HashUtils.sha3(Buffer.from(scriptBuffer));
    const expectedScriptHash = encodeBuffer(sha, 'scr');
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

  private checkDataboxCoreInstalled(requiredVersion: string): void {
    let installedVersion: string;
    try {
      // eslint-disable-next-line global-require,import/no-dynamic-require
      const databoxPackageJson = require(`@ulixee/databox-core/package.json`);
      installedVersion = databoxPackageJson.version;
    } catch (error) {
      throw new Error(`The requested Databox Core is not installed.\n${error.message}`);
    }
    if (!isSemverSatisfied(requiredVersion, installedVersion)) {
      throw new Error(
        `The installed Databox Core (${installedVersion}) is not compatible with the version required by your Databox Package (${requiredVersion}).\n
Please try to re-upload after testing with the version available on this Miner.`,
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
