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
import { IDatastoreEntityStatsRecord } from '../db/DatastoreEntityStatsTable';
import { IDatastoreVersionRecord } from '../db/DatastoreVersionsTable';
import {
  DatastoreNotFoundError,
  InvalidPermissionsError,
  InvalidScriptVersionHistoryError,
  MissingLinkedScriptVersionsError,
} from './errors';
import DatastoreManifest from './DatastoreManifest';
import DatastoreVm from './DatastoreVm';
import { unpackDbxFile } from './dbxUtils';

const datastorePackageJson = require(`../package.json`);
const { log } = Logger(module);

export interface IStatsByName {
  [name: string]: IDatastoreEntityStatsRecord;
}

export type IDatastoreManifestWithRuntime = IDatastoreManifest & {
  entrypointPath: string;
  isStarted: boolean;
  latestVersionHash: string;
};

export default class DatastoreRegistry extends TypedEventEmitter<{
  new: {
    datastore: IDatastoreManifestWithRuntime;
    activity: 'started' | 'uploaded';
  };
  stopped: { versionHash: string };
}> {
  private get datastoresDb(): DatastoresDb {
    this.#datastoresDb ??= new DatastoresDb(this.datastoresDir);
    return this.#datastoresDb;
  }

  #datastoresDb: DatastoresDb;
  #openedManifestsByDbxPath = new Map<string, IDatastoreManifest>();

  constructor(readonly datastoresDir: string, readonly externalStorageEngineEndpoint?: string) {
    super();
  }

  public close(): Promise<void> {
    this.#datastoresDb?.close();
    this.#openedManifestsByDbxPath.clear();
    this.#datastoresDb = null;
    return Promise.resolve();
  }

  public async all(): Promise<IDatastoreManifestWithRuntime[]> {
    const results: IDatastoreManifestWithRuntime[] = [];
    const hashesSet = new Set<string>();
    for (const datastore of this.datastoresDb.versions.all()) {
      const entry = await this.getByVersionHash(datastore.versionHash, false);
      if (entry) {
        results.push(entry);
        hashesSet.add(entry.versionHash);
      }
    }
    for (const datastore of this.datastoresDb.versions.allCached()) {
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
  ): Promise<IDatastoreManifestWithRuntime> {
    const versionRecord = this.datastoresDb.versions.getByHash(versionHash);
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

    if (!manifest) return null;

    return {
      entrypointPath: Path.join(versionRecord.dbxPath, 'datastore.js'),
      isStarted: versionRecord.isStarted,
      latestVersionHash,
      ...manifest,
    };
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
    return this.datastoresDb.versions.getLatestVersion(hash);
  }

  public getByDomain(domain: string): Promise<IDatastoreVersionRecord> {
    return Promise.resolve(this.datastoresDb.versions.findLatestByDomain(domain));
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
    const baseVersionHash = this.datastoresDb.versions.getBaseHash(versionHash);
    const previousVersions = this.datastoresDb.versions
      .getLinkedVersions(baseVersionHash)
      .map(x => x.versionHash)
      .filter(x => x !== versionHash);

    if (previousVersions.length) {
      previousVersions.reverse();
      for (const previousVersion of previousVersions) {
        const version = this.datastoresDb.versions.getByHash(previousVersion);
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
    const storedPath = this.datastoresDb.versions.getByHash(manifest.versionHash)?.dbxPath;
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
    const datastore = this.datastoresDb.versions.setDbxStopped(dbxPath);
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
    const versionWithEntrypoint = this.datastoresDb.versions.findAnyWithEntrypoint(
      manifest.scriptEntrypoint,
    );
    if (versionWithEntrypoint) {
      const fullVersionHistory = this.datastoresDb.versions.getLinkedVersions(
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

    const storedPreviousVersions = this.datastoresDb.versions.getLinkedVersions(
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
      this.datastoresDb.versions.save(
        version.versionHash,
        manifest.scriptEntrypoint,
        version.versionTimestamp,
        this.datastoresDb.versions.getByHash(version.versionHash)?.dbxPath,
        baseVersionHash,
        manifest.domain,
      );
    }

    this.datastoresDb.versions.save(
      manifest.versionHash,
      manifest.scriptEntrypoint,
      manifest.versionTimestamp,
      dbxPath,
      baseVersionHash,
      manifest.domain,
    );
  }
}
