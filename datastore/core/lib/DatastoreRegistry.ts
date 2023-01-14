import { isSemverSatisfied } from '@ulixee/commons/lib/VersionUtils';
import { promises as Fs } from 'fs';
import * as HashUtils from '@ulixee/commons/lib/hashUtils';
import { encodeBuffer } from '@ulixee/commons/lib/bufferUtils';
import * as Path from 'path';
import IDatastoreManifest from '@ulixee/specification/types/IDatastoreManifest';
import { existsAsync, readFileAsJson } from '@ulixee/commons/lib/fileUtils';
import DatastoresDb from './DatastoresDb';
import { IDatastoreRecord } from './DatastoresTable';
import {
  DatastoreNotFoundError,
  InvalidPermissionsError,
  InvalidScriptVersionHistoryError,
  MissingLinkedScriptVersionsError,
} from './errors';
import DatastoreManifest from './DatastoreManifest';
import { unpackDbxFile } from './dbxUtils';
import { IDatastoreStatsRecord } from './DatastoreStatsTable';
import DatastoreStorage from './DatastoreStorage';

const datastorePackageJson = require(`../package.json`);

export interface IStatsByFunctionName {
  [functionName: string]: IDatastoreStatsRecord;
}

type TDatastoreRecordAndStats = IDatastoreRecord & {
  statsByFunction: IStatsByFunctionName;
  path: string;
  latestVersionHash: string;
};

export default class DatastoreRegistry {
  private get datastoresDb(): DatastoresDb {
    this.#datastoresDb ??= new DatastoresDb(this.storageDir);
    return this.#datastoresDb;
  }

  #datastoresDb: DatastoresDb;

  constructor(readonly storageDir: string, readonly workingDir: string) {}

  public close(): void {
    this.#datastoresDb?.close();
  }

  public hasVersionHash(versionHash: string): boolean {
    return !!this.datastoresDb.datastores.getByVersionHash(versionHash);
  }

  public async loadVersion(
    versionHash: string,
  ): Promise<{ registryEntry: TDatastoreRecordAndStats; manifest: IDatastoreManifest }> {
    const registryEntry = this.getByVersionHash(versionHash);

    const manifest: IDatastoreManifest = {
      ...registryEntry,
      linkedVersions: [],
    };

    if (!(await existsAsync(registryEntry.path))) {
      await this.openDbx(manifest);
    }
    return { registryEntry, manifest };
  }

  public getByVersionHash(versionHash: string): TDatastoreRecordAndStats {
    const path = this.getExtractedDatastorePath(versionHash);
    const entry = this.datastoresDb.datastores.getByVersionHash(versionHash);
    const latestVersionHash = this.getLatestVersion(versionHash);

    if (!entry) {
      throw new DatastoreNotFoundError('Datastore package not found on Miner.', latestVersionHash);
    }
    const statsByFunction: IStatsByFunctionName = {};
    for (const name of Object.keys(entry.functionsByName)) {
      statsByFunction[name] = this.datastoresDb.datastoreStats.getByVersionHash(versionHash, name);
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
    stats: { bytes: number; microgons: number; milliseconds: number },
  ): void {
    this.datastoresDb.datastoreStats.record(
      versionHash,
      functionName,
      stats.microgons,
      stats.bytes,
      stats.milliseconds,
    );
  }

  public async openDbx(manifest: IDatastoreManifest): Promise<void> {
    const dbxPath = this.getDbxPath(manifest);
    const workingDir = this.getDatastoreWorkingDirectory(manifest.versionHash);
    if (await existsAsync(workingDir)) return;
    await Fs.mkdir(workingDir, { recursive: true });
    await unpackDbxFile(dbxPath, workingDir);
  }

  public getStoragePath(versionHash: string): string {
    const workingDir = this.getDatastoreWorkingDirectory(versionHash);
    return Path.join(workingDir, 'storage.db');
  }

  public getLatestVersion(hash: string): string {
    return this.datastoresDb.datastoreVersions.getLatestVersion(hash);
  }

  public async save(
    datastoreTmpPath: string,
    rawBuffer: Buffer,
    adminIdentity?: string,
    allowNewLinkedVersionHistory = false,
    hasServerAdminIdentity = false,
  ): Promise<{ dbxPath: string }> {
    const manifest = await readFileAsJson<IDatastoreManifest>(
      `${datastoreTmpPath}/datastore-manifest.json`,
    );

    await DatastoreManifest.validate(manifest);

    if (!manifest) throw new Error('Could not read the provided .dbx manifest.');
    this.checkDatastoreCoreInstalled(manifest.coreVersion);

    // validate hash
    const scriptBuffer = await Fs.readFile(`${datastoreTmpPath}/datastore.js`);
    const sha = HashUtils.sha3(Buffer.from(scriptBuffer));
    const expectedScriptHash = encodeBuffer(sha, 'scr');
    if (manifest.scriptHash !== expectedScriptHash) {
      throw new Error(
        'Mismatched Datastore scriptHash provided. Should be SHA3 256 in Bech32m encoding.',
      );
    }
    const expectedVersionHash = DatastoreManifest.createVersionHash(manifest);
    if (expectedVersionHash !== manifest.versionHash) {
      throw new Error(
        'Mismatched Datastore versionHash provided. Should be SHA3 256 in Bech32m encoding.',
      );
    }

    const storagePath = this.getStoragePath(manifest.versionHash);
    DatastoreStorage.close(storagePath);
    try {
      await Fs.unlink(storagePath);
    } catch (e) {}

    const dbxPath = this.getDbxPath(manifest);
    if (this.hasVersionHash(manifest.versionHash)) {
      return { dbxPath };
    }

    if (!allowNewLinkedVersionHistory) this.checkMatchingEntrypointVersions(manifest);

    this.checkVersionHistoryMatch(manifest);

    if (!hasServerAdminIdentity) this.verifyAdminIdentity(manifest, adminIdentity);

    // move to an active working dir path
    const workingDirectory = this.getDatastoreWorkingDirectory(manifest.versionHash);
    if (!(await existsAsync(workingDirectory))) {
      await Fs.rename(datastoreTmpPath, workingDirectory);
    }

    if (!(await existsAsync(dbxPath))) {
      await Fs.writeFile(dbxPath, rawBuffer);
    }

    this.saveManifestMetadata(manifest);

    return { dbxPath };
  }

  private verifyAdminIdentity(manifest: IDatastoreManifest, adminIdentity: string): void {
    // ensure admin is in the new list
    if (manifest.adminIdentities.length && !manifest.adminIdentities.includes(adminIdentity)) {
      if (adminIdentity)
        throw new InvalidPermissionsError(
          `Your AdminIdentity is not authorized to upload Datastores to this Miner (${adminIdentity}).`,
        );
      else {
        throw new InvalidPermissionsError(
          `You must sign this request with an AdminIdentity authorized for this Datastore or Miner.`,
        );
      }
    }
    // ensure admin is from the previous linked version
    if (manifest.linkedVersions?.length) {
      const previous = manifest.linkedVersions[manifest.linkedVersions.length - 1];
      const previousEntry = this.datastoresDb.datastores.getByVersionHash(previous.versionHash);
      // if there were admins, must be in previous list!
      if (
        previousEntry &&
        previousEntry.adminIdentities.length &&
        (!previousEntry.adminIdentities.includes(adminIdentity) || !adminIdentity)
      ) {
        throw new InvalidPermissionsError(
          'You are trying to overwrite a previous version of this Datastore with an AdminIdentity that was not present in the previous version.\n\n' +
            'You must sign this version with a previous AdminIdentity, or use an authorized Server AdminIdentity.',
        );
      }
    }
  }

  private checkDatastoreCoreInstalled(requiredVersion: string): void {
    const installedVersion = datastorePackageJson.version;
    if (!isSemverSatisfied(requiredVersion, installedVersion)) {
      throw new Error(
        `The installed Datastore Core (${installedVersion}) is not compatible with the version required by your Datastore Package (${requiredVersion}).\n
Please try to re-upload after testing with the version available on this Miner.`,
      );
    }
  }

  private checkMatchingEntrypointVersions(manifest: IDatastoreManifest): void {
    if (manifest.linkedVersions.length) return;
    const versionWithEntrypoint = this.datastoresDb.datastores.findWithEntrypoint(
      manifest.scriptEntrypoint,
    );
    if (versionWithEntrypoint) {
      const baseHash = this.datastoresDb.datastoreVersions.getBaseHash(
        versionWithEntrypoint.versionHash,
      );
      const fullVersionHistory = this.datastoresDb.datastoreVersions.getPreviousVersions(baseHash);
      throw new MissingLinkedScriptVersionsError(
        `You uploaded a script without any link to previous version history.`,
        fullVersionHistory,
      );
    }
  }

  private checkVersionHistoryMatch(manifest: IDatastoreManifest): void {
    const versions = manifest.linkedVersions;
    if (!versions.length) return;

    const storedPreviousVersions = this.datastoresDb.datastoreVersions.getPreviousVersions(
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
        `The uploaded Datastore has a different version history than your local version.`,
        fullVersionHistory,
      );
    }
  }

  private getDbxPath(manifest: IDatastoreManifest): string {
    const entrypoint = Path.basename(
      manifest.scriptEntrypoint,
      Path.extname(manifest.scriptEntrypoint),
    );
    return Path.resolve(this.storageDir, `${entrypoint}@${manifest.versionHash}.dbx`);
  }

  private getDatastoreWorkingDirectory(versionHash: string): string {
    return Path.resolve(this.workingDir, versionHash);
  }

  private getExtractedDatastorePath(versionHash: string): string {
    return Path.resolve(this.getDatastoreWorkingDirectory(versionHash), 'datastore.js');
  }

  private saveManifestMetadata(manifest: IDatastoreManifest): IDatastoreRecord {
    this.datastoresDb.datastores.save(manifest);
    if (manifest.linkedVersions.length) {
      const baseVersionHash =
        manifest.linkedVersions[manifest.linkedVersions.length - 1].versionHash;
      for (const version of manifest.linkedVersions) {
        if (version.versionHash === baseVersionHash) continue;
        this.datastoresDb.datastoreVersions.save(
          version.versionHash,
          version.versionTimestamp,
          baseVersionHash,
        );
      }
      this.datastoresDb.datastoreVersions.save(
        manifest.versionHash,
        manifest.versionTimestamp,
        baseVersionHash,
      );
    } else {
      this.datastoresDb.datastoreVersions.save(
        manifest.versionHash,
        manifest.versionTimestamp,
        manifest.versionHash,
      );
    }
    return this.datastoresDb.datastores.getByVersionHash(manifest.versionHash);
  }
}
