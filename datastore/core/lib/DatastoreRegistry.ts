import { isSemverSatisfied } from '@ulixee/commons/lib/VersionUtils';
import { promises as Fs } from 'fs';
import * as HashUtils from '@ulixee/commons/lib/hashUtils';
import { encodeBuffer } from '@ulixee/commons/lib/bufferUtils';
import * as Path from 'path';
import IDatastoreManifest from '@ulixee/platform-specification/types/IDatastoreManifest';
import { existsAsync, readFileAsJson } from '@ulixee/commons/lib/fileUtils';
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
  #openedManifestsByDbxPath = new Map<string, IDatastoreManifest>();

  constructor(readonly datastoresDir: string) {
    super();
  }

  public close(): Promise<void> {
    this.#datastoresDb?.close();
    this.#queryLogDb?.close();
    this.#openedManifestsByDbxPath.clear();
    this.#datastoresDb = null;
    this.#queryLogDb = null;
    return Promise.resolve();
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

    const manifest = await this.getManifest(versionRecord.dbxPath);
    if (!manifest && throwIfNotExists) {
      throw new DatastoreNotFoundError('Datastore not found on Cloud.', latestVersionHash);
    }

    const statsByItemName: IStatsByName = {};
    for (const name of [
      ...Object.keys(manifest.extractorsByName),
      ...Object.keys(manifest.tablesByName),
      ...Object.keys(manifest.crawlersByName),
    ]) {
      statsByItemName[name] = this.datastoresDb.datastoreItemStats.getByVersionHash(
        versionHash,
        name,
      );
    }

    return {
      path: Path.join(versionRecord.dbxPath, 'datastore.js'),
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
    micronoteId: string,
    creditId: string,
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
      micronoteId,
      creditId,
      stats.microgons,
      stats.bytes,
      stats.milliseconds,
      heroSessionIds,
    );
  }

  public async getManifest(dbxPath: string): Promise<IDatastoreManifest> {
    const scriptPath = Path.join(dbxPath, 'datastore.js');
    let manifest = this.#openedManifestsByDbxPath.get(dbxPath);
    if (manifest) return manifest;

    const manifestPath = Path.join(dbxPath, 'datastore-manifest.json');
    manifest = await readFileAsJson<IDatastoreManifest>(manifestPath).catch(() => null);
    if (manifest && !DatastoreVm.doNotCacheList.has(scriptPath)) {
      this.#openedManifestsByDbxPath.set(dbxPath, manifest);
    }
    if (manifest) return manifest;

    return null;
  }

  public getLatestVersion(hash: string): string {
    return this.datastoresDb.datastoreVersions.getLatestVersion(hash);
  }

  public getByDomain(domain: string): IDatastoreVersionRecord {
    return this.datastoresDb.datastoreVersions.findLatestByDomain(domain);
  }

  public async installManuallyUploadedDbxFiles(): Promise<
    { dbxPath: string; manifest: IDatastoreManifest }[]
  > {
    const installations: { dbxPath: string; manifest: IDatastoreManifest }[] = [];

    if (!(await existsAsync(this.datastoresDir))) return installations;

    for (const filepath of await Fs.readdir(this.datastoresDir, { withFileTypes: true })) {
      const file = filepath.name;
      let path = Path.join(this.datastoresDir, file);

      if (!filepath.isDirectory()) {
        if (file.endsWith('.dbx.tgz')) {
          const destPath = path.replace('.dbx.tgz', '.dbx');
          if (!(await existsAsync(destPath))) {
            await Fs.mkdir(destPath);
            await unpackDbxFile(path, destPath);
          }
          path = destPath;
        } else {
          continue;
        }
      }

      if (!path.endsWith('.dbx')) {
        continue;
      }

      log.info('Found Datastore folder in datastores directory. Checking for import.', {
        file,
        sessionId: null,
      });

      try {
        const install = await this.save(path, null, true, true);
        if (install.didInstall) {
          installations.push(install);
        }
      } catch (err) {
        await Fs.rm(path, { recursive: true }).catch(() => null);
        throw err;
      }
    }
    return installations;
  }

  public async getPreviousVersion(
    versionHash: string,
  ): Promise<{ manifest: IDatastoreManifest; dbxPath: string }> {
    const baseVersionHash = this.datastoresDb.datastoreVersions.getBaseHash(versionHash);
    const previousVersions = this.datastoresDb.datastoreVersions
      .getLinkedVersions(baseVersionHash)
      .map(x => x.versionHash)
      .filter(x => x !== versionHash);

    if (previousVersions.length) {
      previousVersions.reverse();
      for (const previousVersion of previousVersions) {
        const version = this.datastoresDb.datastoreVersions.getByHash(previousVersion);
        if (version.dbxPath) {
          const manifest = await this.getManifest(version.dbxPath);
          if (!manifest) continue;

          return { manifest, dbxPath: version.dbxPath };
        }
      }
    }
  }

  public async save(
    datastoreTmpPath: string,
    adminIdentity?: string,
    allowNewLinkedVersionHistory = false,
    hasServerAdminIdentity = false,
    requireAdmin = false,
  ): Promise<{ dbxPath: string; manifest: IDatastoreManifest; didInstall: boolean }> {
    const manifest = await readFileAsJson<IDatastoreManifest>(
      `${datastoreTmpPath}/datastore-manifest.json`,
    );
    const storedPath = this.datastoresDb.datastoreVersions.getByHash(manifest.versionHash)?.dbxPath;
    if (storedPath) {
      return { dbxPath: storedPath, manifest, didInstall: false };
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

    return { dbxPath, manifest, didInstall: true };
  }

  public async publishDatastore(
    versionHash: string,
    activity: 'uploaded' | 'started' = 'uploaded',
  ): Promise<void> {
    this.emit('new', {
      activity,
      datastore: await this.getByVersionHash(versionHash),
    });
  }

  public async startAtPath(dbxPath: string): Promise<IDatastoreManifest> {
    const scriptPath = Path.join(dbxPath, 'datastore.js');
    if (!(await existsAsync(scriptPath))) throw new Error("This script entrypoint doesn't exist");

    const manifest = await readFileAsJson<IDatastoreManifest>(`${dbxPath}/datastore-manifest.json`);
    this.checkDatastoreCoreInstalled(manifest.coreVersion);

    this.saveManifestMetadata(manifest, dbxPath);

    DatastoreVm.doNotCacheList.add(scriptPath);
    return manifest;
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
      const fullVersionHistory = this.datastoresDb.datastoreVersions.getLinkedVersions(
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

    const storedPreviousVersions = this.datastoresDb.datastoreVersions.getLinkedVersions(
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
