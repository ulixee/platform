import { isSemverSatisfied } from '@ulixee/commons/lib/VersionUtils';
import { promises as Fs } from 'fs';
import * as HashUtils from '@ulixee/commons/lib/hashUtils';
import { encodeBuffer } from '@ulixee/commons/lib/bufferUtils';
import * as Path from 'path';
import IDatastoreManifest from '@ulixee/platform-specification/types/IDatastoreManifest';
import { existsAsync, readFileAsJson } from '@ulixee/commons/lib/fileUtils';
import DatastoreStorage from '@ulixee/datastore/lib/DatastoreStorage';
import Logger from '@ulixee/commons/lib/Logger';
import DatastoresDb from '../db';
import { IDatastoreStatsRecord } from '../db/DatastoreStatsTable';
import { IDatastoreVersionRecord } from '../db/DatastoreVersionsTable';
import {
  DatastoreNotFoundError,
  InvalidPermissionsError,
  InvalidScriptVersionHistoryError,
  MissingLinkedScriptVersionsError,
} from './errors';
import DatastoreManifest from './DatastoreManifest';

const datastorePackageJson = require(`../package.json`);
const { log } = Logger(module);

export interface IStatsByName {
  [name: string]: IDatastoreStatsRecord;
}

export type IDatastoreManifestWithStats = IDatastoreManifest & {
  statsByName: IStatsByName;
  path: string;
  latestVersionHash: string;
};

export default class DatastoreRegistry {
  private get datastoresDb(): DatastoresDb {
    this.#datastoresDb ??= new DatastoresDb(this.datastoresDir);
    return this.#datastoresDb;
  }

  #datastoresDb: DatastoresDb;
  #storageByPath = new Map<string, DatastoreStorage>();
  #openedManifestsByPath = new Map<string, IDatastoreManifest>();

  constructor(readonly datastoresDir: string) {}

  public close(): void {
    this.#datastoresDb?.close();
    for (const storage of this.#storageByPath.values()) {
      storage.db.close();
    }
    this.#openedManifestsByPath.clear();
    this.#storageByPath.clear();
  }

  public hasVersionHash(versionHash: string): boolean {
    return !!this.datastoresDb.datastoreVersions.getByHash(versionHash);
  }

  public async all(): Promise<IDatastoreManifestWithStats[]> {
    const results: IDatastoreManifestWithStats[] = [];
    for (const datastore of this.datastoresDb.datastoreVersions.all()) {
      const entry = await this.getByVersionHash(datastore.versionHash);
      if (entry) results.push(entry);
    }
    return results;
  }

  public async getByVersionHash(versionHash: string): Promise<IDatastoreManifestWithStats> {
    const versionRecord = this.datastoresDb.datastoreVersions.getByHash(versionHash);

    if (!versionRecord) return null;

    const path = Path.join(versionRecord.path, 'datastore.js');
    let manifest = this.#openedManifestsByPath.get(path);

    if (!(await existsAsync(path))) return null;

    if (!manifest) {
      manifest = await readFileAsJson(Path.join(Path.dirname(path), 'datastore-manifest.json'));
      this.#openedManifestsByPath.set(path, manifest);
    }
    const latestVersionHash = this.getLatestVersion(versionHash);

    if (!manifest) {
      throw new DatastoreNotFoundError('Datastore package not found on Cloud.', latestVersionHash);
    }
    const statsByName: IStatsByName = {};
    for (const name of Object.keys(manifest.runnersByName)) {
      statsByName[name] = this.datastoresDb.datastoreStats.getByVersionHash(versionHash, name);
    }
    return {
      path,
      statsByName,
      latestVersionHash,
      ...manifest,
    };
  }

  public recordStats(
    versionHash: string,
    name: string,
    stats: { bytes: number; microgons: number; milliseconds: number },
  ): void {
    this.datastoresDb.datastoreStats.record(
      versionHash,
      name,
      stats.microgons,
      stats.bytes,
      stats.milliseconds,
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
      if (!filepath.isDirectory() || !filepath.name.endsWith('.dbx')) continue;

      const file = filepath.name;
      const path = Path.join(this.datastoresDir, file);

      log.info('Found Compressed .dbx file in datastores directory. Checking for import.', {
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
  ): Promise<{ dbxPath: string }> {
    const manifest = await readFileAsJson<IDatastoreManifest>(
      `${datastoreTmpPath}/datastore-manifest.json`,
    );
    const storedPath = this.datastoresDb.datastoreVersions.getByHash(manifest.versionHash)?.path;
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

    if (!hasServerAdminIdentity) await this.verifyAdminIdentity(manifest, adminIdentity);

    if (dbxPath !== datastoreTmpPath) {
      // remove any existing folder at dbxPath
      if (await existsAsync(dbxPath)) await Fs.rm(dbxPath, { recursive: true });

      await Fs.rename(datastoreTmpPath, dbxPath);
    }

    this.saveManifestMetadata(manifest, dbxPath);

    return { dbxPath };
  }

  public async watchDbxPath(dbxPath: string): Promise<void> {
    const manifest = await readFileAsJson<IDatastoreManifest>(`${dbxPath}/datastore-manifest.json`);
    this.#openedManifestsByPath.set(dbxPath, manifest);
    this.datastoresDb.datastoreVersions.cache(
      manifest.versionHash,
      manifest.scriptEntrypoint,
      manifest.versionTimestamp,
      dbxPath,
      manifest.versionHash,
      manifest.domain,
    );
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
      const previousEntry = await this.getByVersionHash(previous.versionHash);
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
    const dbxPath = this.datastoresDb.datastoreVersions.getByHash(versionHash)?.path;
    if (!dbxPath) return null;
    return Path.join(dbxPath, 'storage.db');
  }

  private createDbxPath(manifest: IDatastoreManifest): string {
    const entrypoint = manifest.scriptEntrypoint;
    const filename = Path.basename(entrypoint, Path.extname(entrypoint));
    return Path.resolve(this.datastoresDir, `${filename}@${manifest.versionHash}.dbx`);
  }

  private saveManifestMetadata(manifest: IDatastoreManifest, path: string): void {
    this.#openedManifestsByPath.set(path, manifest);
    const baseVersionHash =
      manifest.linkedVersions[manifest.linkedVersions.length - 1]?.versionHash ??
      manifest.versionHash;

    for (const version of manifest.linkedVersions) {
      if (version.versionHash === baseVersionHash) continue;
      this.datastoresDb.datastoreVersions.save(
        version.versionHash,
        manifest.scriptEntrypoint,
        version.versionTimestamp,
        this.datastoresDb.datastoreVersions.getByHash(version.versionHash)?.path,
        baseVersionHash,
        manifest.domain,
      );
    }

    this.datastoresDb.datastoreVersions.save(
      manifest.versionHash,
      manifest.scriptEntrypoint,
      manifest.versionTimestamp,
      path,
      baseVersionHash,
      manifest.domain,
    );
  }
}
