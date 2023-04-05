import { isSemverSatisfied } from '@ulixee/commons/lib/VersionUtils';
import { promises as Fs } from 'fs';
import * as HashUtils from '@ulixee/commons/lib/hashUtils';
import { encodeBuffer } from '@ulixee/commons/lib/bufferUtils';
import * as Path from 'path';
import IDatastoreManifest from '@ulixee/platform-specification/types/IDatastoreManifest';
import { existsAsync, readFileAsJson } from '@ulixee/commons/lib/fileUtils';
import DatastoreStorage from '@ulixee/datastore/lib/DatastoreStorage';
import Logger from '@ulixee/commons/lib/Logger';
import TypedEventEmitter from '@ulixee/commons/lib/TypedEventEmitter';
import DatastoresDb from '../db';
import { IDatastoreItemStatsRecord } from '../db/DatastoreItemStatsTable';
import { IDatastoreVersionRecord } from '../db/DatastoreVersionsTable';
import {
  DatastoreNotFoundError,
  InvalidPermissionsError,
  InvalidScriptVersionHistoryError,
  MissingLinkedScriptVersionsError,
} from './errors';
import DatastoreManifest from './DatastoreManifest';
import { IDatastoreStatsRecord } from '../db/DatastoreStatsTable';
import QueryLogDb from '../db/QueryLogDb';
import DatastoreVm from './DatastoreVm';
import { unpackDbxFile } from './dbxUtils';

const datastorePackageJson = require(`../package.json`);
const { log } = Logger(module);

export interface IStatsByName {
  [name: string]: IDatastoreItemStatsRecord;
}

export type IDatastoreManifestWithStats = IDatastoreManifest & {
  stats: IDatastoreStatsRecord;
  statsByItemName: IStatsByName;
  path: string;
  isStarted: boolean;
  latestVersionHash: string;
};

export default class DatastoreRegistry extends TypedEventEmitter<{
  new: {
    datastore: IDatastoreManifestWithStats;
    activity: 'started' | 'uploaded';
  };
  stopped: { versionHash: string };
  stats: IDatastoreStatsRecord;
}> {
  private get datastoresDb(): DatastoresDb {
    this.#datastoresDb ??= new DatastoresDb(this.datastoresDir);
    return this.#datastoresDb;
  }

  private get queryLogDb(): QueryLogDb {
    this.#queryLogDb ??= new QueryLogDb(this.datastoresDir);
    return this.#queryLogDb;
  }

  #datastoresDb: DatastoresDb;
  #queryLogDb: QueryLogDb;
  #storageByPath = new Map<string, DatastoreStorage>();
  #openedManifestsByDbxPath = new Map<string, IDatastoreManifest>();

  constructor(readonly datastoresDir: string) {
    super();
  }

  public close(): void {
    this.#datastoresDb?.close();
    this.#queryLogDb?.close();
    for (const storage of this.#storageByPath.values()) {
      storage.db.close();
    }
    this.#openedManifestsByDbxPath.clear();
    this.#storageByPath.clear();
  }

  public hasVersionHash(versionHash: string): boolean {
    return !!this.datastoresDb.datastoreVersions.getByHash(versionHash);
  }

  public count(): number {
    const hashesSet = new Set<string>();
    for (const datastore of this.datastoresDb.datastoreVersions.all()) {
      if (datastore.dbxPath) hashesSet.add(datastore.versionHash);
    }
    for (const datastore of this.datastoresDb.datastoreVersions.allCached()) {
      if (datastore.dbxPath) hashesSet.add(datastore.versionHash);
    }
    return hashesSet.size;
  }

  public async all(): Promise<IDatastoreManifestWithStats[]> {
    const results: IDatastoreManifestWithStats[] = [];
    const hashesSet = new Set<string>();
    for (const datastore of this.datastoresDb.datastoreVersions.all()) {
      const entry = await this.getByVersionHash(datastore.versionHash, false);
      if (entry) {
        results.push(entry);
        hashesSet.add(entry.versionHash);
      }
    }
    for (const datastore of this.datastoresDb.datastoreVersions.allCached()) {
      if (!datastore || hashesSet.has(datastore.versionHash)) continue;
      const entry = await this.getByVersionHash(datastore.versionHash, false);
      // check that it's still on disk
      if (entry) {
        results.push(entry);
      }
    }
    return results;
  }

  public async getByVersionHash(
    versionHash: string,
    throwIfNotExists = true,
  ): Promise<IDatastoreManifestWithStats> {
    const versionRecord = this.datastoresDb.datastoreVersions.getByHash(versionHash);
    const latestVersionHash = this.getLatestVersion(versionHash);

    if (!versionRecord?.dbxPath) {
      if (throwIfNotExists) {
        throw new DatastoreNotFoundError('Datastore not found on Cloud.', latestVersionHash);
      }
      return null;
    }

    const scriptPath = Path.join(versionRecord.dbxPath, 'datastore.js');
    let manifest = this.#openedManifestsByDbxPath.get(versionRecord.dbxPath);

    if (!manifest) {
      const manifestPath = Path.join(versionRecord.dbxPath, 'datastore-manifest.json');
      manifest = await readFileAsJson<IDatastoreManifest>(manifestPath).catch(() => null);
      if (manifest && !DatastoreVm.doNotCacheList.has(scriptPath)) {
        this.#openedManifestsByDbxPath.set(versionRecord.dbxPath, manifest);
      }
    }

    if (!manifest) {
      if (throwIfNotExists) {
        throw new DatastoreNotFoundError('Datastore not found on Cloud.', latestVersionHash);
      }
      return null;
    }
    const statsByItemName: IStatsByName = {};
    for (const name of [
      ...Object.keys(manifest.runnersByName),
      ...Object.keys(manifest.tablesByName),
      ...Object.keys(manifest.crawlersByName),
    ]) {
      statsByItemName[name] = this.datastoresDb.datastoreItemStats.getByVersionHash(
        versionHash,
        name,
      );
    }
    return {
      path: scriptPath,
      stats: this.datastoresDb.datastoreStats.getByVersionHash(versionHash),
      isStarted: versionRecord.isStarted,
      statsByItemName,
      latestVersionHash,
      ...manifest,
    };
  }

  public recordItemStats(
    versionHash: string,
    name: string,
    stats: { bytes: number; microgons: number; milliseconds: number; isCredits: boolean },
    error: Error,
  ): void {
    this.datastoresDb.datastoreItemStats.record(
      versionHash,
      name,
      stats.microgons,
      stats.bytes,
      stats.milliseconds,
      stats.isCredits ? stats.microgons : 0,
      !!error,
    );
  }

  public recordQuery(
    id: string,
    query: string,
    startTime: number,
    input: any,
    outputs: any[],
    datastoreVersionHash: string,
    stats: { bytes: number; microgons: number; milliseconds: number; isCredits: boolean },
    affiliateId: string,
    error?: Error,
    heroSessionIds?: string[],
  ): void {
    const newStats = this.datastoresDb.datastoreStats.record(
      datastoreVersionHash,
      stats.microgons,
      stats.bytes,
      stats.milliseconds,
      stats.isCredits ? stats.microgons : 0,
      !!error,
    );
    this.emit('stats', newStats);
    this.queryLogDb.logTable.record(
      id,
      datastoreVersionHash,
      query,
      startTime,
      affiliateId,
      input,
      outputs,
      error,
      stats.microgons,
      stats.bytes,
      stats.milliseconds,
      stats.isCredits,
      heroSessionIds,
    );
  }

  public getStorage(versionHash: string): DatastoreStorage {
    const storagePath = this.getStoragePath(versionHash);
    if (this.#storageByPath.has(storagePath)) return this.#storageByPath.get(storagePath);
    const storage = new DatastoreStorage(storagePath);
    this.#storageByPath.set(storagePath, storage);
    return storage;
  }

  public getLatestVersion(hash: string): string {
    return this.datastoresDb.datastoreVersions.getLatestVersion(hash);
  }

  public getByDomain(domain: string): IDatastoreVersionRecord {
    return this.datastoresDb.datastoreVersions.findLatestByDomain(domain);
  }

  public async installManuallyUploadedDbxFiles(): Promise<void> {
    if (!(await existsAsync(this.datastoresDir))) return;

    for (const filepath of await Fs.readdir(this.datastoresDir, { withFileTypes: true })) {
      const file = filepath.name;
      let path = Path.join(this.datastoresDir, file);

      if (!filepath.isDirectory()) {
        if (file.endsWith('.dbx.tgz')) {
          const destPath = path.replace('.dbx.tgz', '.dbx');
          if (await existsAsync(destPath)) continue;
          await Fs.mkdir(destPath);
          await unpackDbxFile(path, destPath);
          path = destPath;
        } else if (!file.endsWith('.dbx')) {
          continue;
        }
      }

      log.info('Found Datastore folder in datastores directory. Checking for import.', {
        file,
        sessionId: null,
      });

      await this.save(path, null, true, true);
    }
  }

  public async save(
    datastoreTmpPath: string,
    adminIdentity?: string,
    allowNewLinkedVersionHistory = false,
    hasServerAdminIdentity = false,
    requireAdmin = false,
  ): Promise<{ dbxPath: string }> {
    const manifest = await readFileAsJson<IDatastoreManifest>(
      `${datastoreTmpPath}/datastore-manifest.json`,
    );
    const storedPath = this.datastoresDb.datastoreVersions.getByHash(manifest.versionHash)?.dbxPath;
    if (storedPath) {
      return { dbxPath: storedPath };
    }

    await DatastoreManifest.validate(manifest);

    if (!manifest) throw new Error('Could not read the provided Datastore manifest.');
    this.checkDatastoreCoreInstalled(manifest.coreVersion);

    // validate hash
    const scriptBuffer = await Fs.readFile(`${datastoreTmpPath}/datastore.js`);
    const sha = HashUtils.sha256(Buffer.from(scriptBuffer));
    const expectedScriptHash = encodeBuffer(sha, 'scr');
    if (manifest.scriptHash !== expectedScriptHash) {
      throw new Error(
        'Mismatched Datastore scriptHash provided. Should be sha256 256 in Bech32m encoding.',
      );
    }
    const expectedVersionHash = DatastoreManifest.createVersionHash(manifest);
    if (expectedVersionHash !== manifest.versionHash) {
      throw new Error(
        'Mismatched Datastore versionHash provided. Should be sha256 256 in Bech32m encoding.',
      );
    }

    const dbxPath = this.createDbxPath(manifest);
    const storagePath = Path.join(dbxPath, 'storage.db');
    // make sure to close any existing db
    this.#storageByPath.get(storagePath)?.db?.close();
    try {
      await Fs.unlink(storagePath);
    } catch (e) {}

    if (!allowNewLinkedVersionHistory) this.checkMatchingEntrypointVersions(manifest);

    this.checkVersionHistoryMatch(manifest);

    if (!hasServerAdminIdentity && requireAdmin && !manifest.adminIdentities?.length) {
      throw new Error('This Cloud requires Datastores to include an AdminIdentity');
    }
    if (!hasServerAdminIdentity) await this.verifyAdminIdentity(manifest, adminIdentity);

    if (dbxPath !== datastoreTmpPath) {
      // remove any existing folder at dbxPath
      if (await existsAsync(dbxPath)) await Fs.rm(dbxPath, { recursive: true });

      await Fs.rename(datastoreTmpPath, dbxPath);
    }

    this.#openedManifestsByDbxPath.set(dbxPath, manifest);
    this.saveManifestMetadata(manifest, dbxPath);

    this.emit('new', {
      activity: 'uploaded',
      datastore: await this.getByVersionHash(manifest.versionHash),
    });

    return { dbxPath };
  }

  public async startAtPath(dbxPath: string): Promise<void> {
    const manifest = await readFileAsJson<IDatastoreManifest>(`${dbxPath}/datastore-manifest.json`);
    this.checkDatastoreCoreInstalled(manifest.coreVersion);

    this.saveManifestMetadata(manifest, dbxPath);
    const scriptPath = Path.join(dbxPath, 'datastore.js');
    const storagePath = Path.join(dbxPath, 'storage.db');
    this.#storageByPath.get(storagePath)?.db?.close();
    this.#storageByPath.delete(storagePath);
    DatastoreVm.doNotCacheList.add(scriptPath);
    this.emit('new', {
      activity: 'started',
      datastore: await this.getByVersionHash(manifest.versionHash),
    });
  }

  public stopAtPath(dbxPath: string): void {
    const datastore = this.datastoresDb.datastoreVersions.setDbxStopped(dbxPath);
    if (datastore) {
      this.emit('stopped', {
        versionHash: datastore.versionHash,
      });
    }
  }

  private async verifyAdminIdentity(
    manifest: IDatastoreManifest,
    adminIdentity: string,
  ): Promise<void> {
    // ensure admin is in the new list
    if (manifest.adminIdentities.length && !manifest.adminIdentities.includes(adminIdentity)) {
      if (adminIdentity)
        throw new InvalidPermissionsError(
          `Your AdminIdentity is not authorized to upload Datastores to this Cloud (${adminIdentity}).`,
        );
      else {
        throw new InvalidPermissionsError(
          `You must sign this request with an AdminIdentity authorized for this Datastore or Cloud.`,
        );
      }
    }
    // ensure admin is from the previous linked version
    if (manifest.linkedVersions?.length) {
      const previous = manifest.linkedVersions[manifest.linkedVersions.length - 1];
      const previousEntry = await this.getByVersionHash(previous.versionHash, false);
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
Please try to re-upload after testing with the version available on this Cloud.`,
      );
    }
  }

  private checkMatchingEntrypointVersions(manifest: IDatastoreManifest): void {
    if (manifest.linkedVersions.length) return;
    const versionWithEntrypoint = this.datastoresDb.datastoreVersions.findAnyWithEntrypoint(
      manifest.scriptEntrypoint,
    );
    if (versionWithEntrypoint) {
      const fullVersionHistory = this.datastoresDb.datastoreVersions.getPreviousVersions(
        versionWithEntrypoint.baseVersionHash,
      );
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

  private getStoragePath(versionHash: string): string {
    const dbxPath = this.datastoresDb.datastoreVersions.getByHash(versionHash)?.dbxPath;
    if (!dbxPath) return null;
    return Path.join(dbxPath, 'storage.db');
  }

  private createDbxPath(manifest: IDatastoreManifest): string {
    const entrypoint = manifest.scriptEntrypoint;
    const filename = Path.basename(entrypoint, Path.extname(entrypoint));
    return Path.resolve(this.datastoresDir, `${filename}@${manifest.versionHash}.dbx`);
  }

  private saveManifestMetadata(manifest: IDatastoreManifest, dbxPath: string): void {
    const baseVersionHash =
      manifest.linkedVersions[manifest.linkedVersions.length - 1]?.versionHash ??
      manifest.versionHash;

    for (const version of manifest.linkedVersions) {
      if (version.versionHash === baseVersionHash) continue;
      this.datastoresDb.datastoreVersions.save(
        version.versionHash,
        manifest.scriptEntrypoint,
        version.versionTimestamp,
        this.datastoresDb.datastoreVersions.getByHash(version.versionHash)?.dbxPath,
        baseVersionHash,
        manifest.domain,
      );
    }

    this.datastoresDb.datastoreVersions.save(
      manifest.versionHash,
      manifest.scriptEntrypoint,
      manifest.versionTimestamp,
      dbxPath,
      baseVersionHash,
      manifest.domain,
    );
  }
}
