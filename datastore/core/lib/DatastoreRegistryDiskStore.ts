import Logger from '@ulixee/commons/lib/Logger';
import { isSemverSatisfied } from '@ulixee/commons/lib/VersionUtils';
import { encodeBuffer } from '@ulixee/commons/lib/bufferUtils';
import { existsAsync, readFileAsJson } from '@ulixee/commons/lib/fileUtils';
import * as HashUtils from '@ulixee/commons/lib/hashUtils';
import IDatastoreManifest from '@ulixee/platform-specification/types/IDatastoreManifest';
import { promises as Fs } from 'fs';
import * as Path from 'path';
import DatastoresDb from '../db';
import IDatastoreRegistryStore, {
  IDatastoreManifestWithLatest,
} from '../interfaces/IDatastoreRegistryStore';
import DatastoreManifest from './DatastoreManifest';
import { IDatastoreManifestWithRuntime } from './DatastoreRegistry';
import DatastoreVm from './DatastoreVm';
import { packDbx, unpackDbx, unpackDbxFile } from './dbxUtils';
import {
  InvalidPermissionsError,
  InvalidScriptVersionHistoryError,
  MissingLinkedScriptVersionsError,
  MissingRequiredSettingError,
} from './errors';

const datastorePackageJson = require(`../package.json`);
const { log } = Logger(module);

export type TInstallDatastoreCallbackFn = (
  version: IDatastoreManifestWithRuntime,
  source: IDatastoreSourceDetails,
  previous?: IDatastoreManifestWithRuntime,
  options?: {
    clearExisting?: boolean;
    isWatching?: boolean;
  },
) => Promise<void>;

export default class DatastoreRegistryDiskStore implements IDatastoreRegistryStore {
  public source = 'disk' as const;

  private get datastoresDb(): DatastoresDb {
    this.#datastoresDb ??= new DatastoresDb(this.datastoresDir);
    return this.#datastoresDb;
  }

  #datastoresDb: DatastoresDb;

  #openedManifestsByDbxPath = new Map<string, IDatastoreManifest>();

  constructor(
    readonly datastoresDir: string,
    readonly isSourceOfTruth: boolean,
    readonly defaultStorageEngineHost: string,
    readonly onInstallCallbackFn: TInstallDatastoreCallbackFn,
  ) {}

  close(): Promise<void> {
    this.#datastoresDb?.close();
    this.#openedManifestsByDbxPath.clear();
    this.#datastoresDb = null;
    return Promise.resolve();
  }

  async all(count?: number, offset?: number): Promise<IDatastoreManifestWithLatest[]> {
    const results: IDatastoreManifestWithLatest[] = [];
    for (const datastore of this.datastoresDb.versions.paginate(count, offset)) {
      const entry = await this.get(datastore.versionHash);
      if (entry) {
        results.push(entry);
      }
    }
    return results;
  }

  async isHostingExpired(versionHash: string): Promise<boolean> {
    const versionRecord = this.datastoresDb.versions.getByHash(versionHash);
    if (versionRecord?.expiresTimestamp && versionRecord.expiresTimestamp < Date.now()) {
      if (versionRecord.dbxPath) {
        this.#openedManifestsByDbxPath.delete(versionRecord.dbxPath);
        await Fs.rm(versionRecord.dbxPath, { recursive: true });
        this.datastoresDb.versions.cleanup(versionHash);
      }
      return true;
    }
    return false;
  }

  async get(versionHash: string): Promise<IDatastoreManifestWithLatest> {
    const versionRecord = this.datastoresDb.versions.getByHash(versionHash);
    const latestVersionHash = await this.getLatestVersion(versionHash);

    if (!versionRecord?.dbxPath) {
      return null;
    }

    const dbxPath = versionRecord.dbxPath;
    const scriptPath = Path.join(dbxPath, 'datastore.js');
    let manifest = this.#openedManifestsByDbxPath.get(dbxPath);
    if (!manifest) {
      const manifestPath = Path.join(dbxPath, 'datastore-manifest.json');
      manifest = await readFileAsJson<IDatastoreManifest>(manifestPath).catch(() => null);
      if (manifest && !DatastoreVm.doNotCacheList.has(scriptPath)) {
        this.#openedManifestsByDbxPath.set(dbxPath, manifest);
      }
    }

    if (!manifest) return null;

    return {
      ...manifest,
      isStarted: versionRecord.isStarted,
      latestVersionHash,
    };
  }

  getRuntime(versionHash: string): Promise<{ runtimePath: string; isStarted: boolean }> {
    if (!versionHash) return null;

    const versionRecord = this.datastoresDb.versions.getByHash(versionHash);
    if (!versionRecord?.dbxPath) return null;

    return Promise.resolve({
      runtimePath: Path.join(versionRecord.dbxPath, 'datastore.js'),
      isStarted: versionRecord.isStarted,
    });
  }

  async getCompressedDbx(versionHash: string): Promise<{
    compressedDbx: Buffer;
    allowNewLinkedVersionHistory: boolean;
    adminSignature: Buffer;
    adminIdentity: string;
  }> {
    if (!versionHash) return null;

    const versionRecord = this.datastoresDb.versions.getByHash(versionHash);
    if (!versionRecord?.dbxPath) return null;

    const compressedDbx = await packDbx(versionRecord.dbxPath);
    return {
      compressedDbx,
      allowNewLinkedVersionHistory: versionRecord.installAllowedNewLinkedVersionHistory,
      adminIdentity: versionRecord.adminIdentity,
      adminSignature: versionRecord.adminSignature,
    };
  }

  async installFromService(
    versionHash: string,
    service: IDatastoreRegistryStore,
    expirationTimestamp?: number,
  ): Promise<{ runtimePath: string; isStarted: boolean }> {
    const { compressedDbx, adminIdentity, adminSignature, ulixeeApiHost } =
      await service.downloadDbx(versionHash);
    const tmpDir = Path.join(this.datastoresDir, `${versionHash}.dbx`);
    try {
      await unpackDbx(compressedDbx, tmpDir);
      await this.install(
        tmpDir,
        {
          hasServerAdminIdentity: true,
          allowNewLinkedVersionHistory: true,
        },
        {
          adminIdentity,
          adminSignature,
          source: service.source === 'cluster' ? 'cluster' : 'network',
          expirationTimestamp,
          host: ulixeeApiHost,
        },
      );
    } finally {
      // remove tmp dir in case of errors
      await Fs.rm(tmpDir, { recursive: true }).catch(() => null);
    }
    return this.getRuntime(versionHash);
  }

  async getPreviousInstalledVersion(versionHash: string): Promise<string> {
    const baseVersionHash = this.datastoresDb.versions.getBaseHash(versionHash);
    const previousVersions = this.datastoresDb.versions
      .getLinkedVersions(baseVersionHash)
      .map(x => x.versionHash)
      .filter(x => x !== versionHash);

    if (previousVersions.length) {
      previousVersions.reverse();
      for (const previousVersion of previousVersions) {
        if (await this.get(previousVersion)) return previousVersion;
      }
    }
  }

  getLatestVersion(versionHash: string): Promise<string> {
    const latestVersionHash = this.datastoresDb.versions.getLatestVersion(versionHash);
    return Promise.resolve(latestVersionHash);
  }

  getLatestVersionForDomain(domain: string): Promise<string> {
    const latestByDomain = this.datastoresDb.versions.findLatestByDomain(domain);
    return Promise.resolve(latestByDomain);
  }

  async install(
    datastoreTmpPath: string,
    adminOptions: {
      adminIdentity?: string;
      allowNewLinkedVersionHistory?: boolean;
      hasServerAdminIdentity?: boolean;
      datastoresMustHaveOwnAdminIdentity?: boolean;
    },
    sourceDetails?: IDatastoreSourceDetails,
  ): Promise<{ dbxPath: string; manifest: IDatastoreManifest; didInstall: boolean }> {
    if (!this.isSourceOfTruth) {
      throw new Error(
        'Installations cannot be made directly against this DatastoreRegistryService. This should have been redirected to a cluster leader or network endpoint.',
      );
    }
    const manifest = await readFileAsJson<IDatastoreManifest>(
      `${datastoreTmpPath}/datastore-manifest.json`,
    );
    const storedPath = this.datastoresDb.versions.getByHash(manifest.versionHash)?.dbxPath;
    if (storedPath) {
      return { dbxPath: storedPath, manifest, didInstall: false };
    }

    if (!manifest.storageEngineHost && !!this.defaultStorageEngineHost) {
      throw new MissingRequiredSettingError(
        'This cloud requires a storage engine host to be specified.',
        'storageEngineHost',
        this.defaultStorageEngineHost,
      );
    }

    DatastoreManifest.validate(manifest);

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

    if (!adminOptions.allowNewLinkedVersionHistory) this.checkMatchingEntrypointVersions(manifest);

    this.checkVersionHistoryMatch(manifest);

    if (
      !adminOptions.hasServerAdminIdentity &&
      adminOptions.datastoresMustHaveOwnAdminIdentity &&
      !manifest.adminIdentities?.length
    ) {
      throw new Error('This Cloud requires Datastores to include an AdminIdentity');
    }
    if (!adminOptions.hasServerAdminIdentity)
      await this.verifyAdminIdentity(manifest, adminOptions.adminIdentity);

    if (dbxPath !== datastoreTmpPath) {
      // remove any existing folder at dbxPath
      if (await existsAsync(dbxPath)) await Fs.rm(dbxPath, { recursive: true });
      await Fs.rename(datastoreTmpPath, dbxPath);
    }

    this.#openedManifestsByDbxPath.set(dbxPath, manifest);
    this.saveManifestMetadata(
      manifest,
      dbxPath,
      adminOptions.allowNewLinkedVersionHistory,
      sourceDetails,
    );

    await this.onInstalled(manifest, sourceDetails);

    return { dbxPath, manifest, didInstall: true };
  }

  async installManualUploads(
    cloudAdminIdentities: string[],
    cloudNodeHost: string,
  ): Promise<{ dbxPath: string; manifest: IDatastoreManifest }[]> {
    const installations: { dbxPath: string; manifest: IDatastoreManifest }[] = [];

    if (!(await existsAsync(this.datastoresDir))) return installations;

    for (const filepath of await Fs.readdir(this.datastoresDir, { withFileTypes: true })) {
      const file = filepath.name;
      let path = Path.join(this.datastoresDir, file);

      if (!filepath.isDirectory()) {
        if (file.endsWith('.dbx.tgz')) {
          if (!this.isSourceOfTruth) {
            log.warn(
              'A Datastore DBX was uploaded to this server, but this server cannot process installations. ' +
                'If this Datastore was also uploaded to the cluster lead, this message can be ignored.',
              {
                dbxPath: path,
                sessionId: null,
              },
            );
            continue;
          }

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
        const install = await this.install(
          path,
          {
            hasServerAdminIdentity: true,
            allowNewLinkedVersionHistory: true,
          },
          {
            adminIdentity: cloudAdminIdentities?.[0],
            adminSignature: null,
            host: cloudNodeHost,
            source: 'manual',
          },
        );
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

  async startAtPath(dbxPath: string, watch: boolean): Promise<IDatastoreManifest> {
    const scriptPath = Path.join(dbxPath, 'datastore.js');
    if (!(await existsAsync(scriptPath))) throw new Error("This script entrypoint doesn't exist");

    const manifest = await readFileAsJson<IDatastoreManifest>(`${dbxPath}/datastore-manifest.json`);
    this.checkDatastoreCoreInstalled(manifest.coreVersion);

    this.saveManifestMetadata(manifest, dbxPath, true);

    DatastoreVm.doNotCacheList.add(scriptPath);
    await this.onInstalled(manifest, null, true, watch);
    return manifest;
  }

  stopAtPath(dbxPath: string): { versionHash: string } {
    return this.datastoresDb.versions.setDbxStopped(dbxPath);
  }

  async onInstalled(
    manifest: IDatastoreManifest,
    source: IDatastoreSourceDetails,
    clearExisting?: boolean,
    isWatching?: boolean,
  ): Promise<void> {
    if (!this.onInstallCallbackFn) return;

    try {
      const previousVersionHash = await this.getPreviousInstalledVersion(manifest.versionHash);
      const previousRuntime = await this.getRuntime(previousVersionHash);
      const previousVersion: IDatastoreManifestWithRuntime = previousVersionHash
        ? ((await this.get(previousVersionHash)) as any)
        : null;
      if (previousVersion) Object.assign(previousVersion, previousRuntime);

      const versionRuntime = await this.getRuntime(manifest.versionHash);
      const latestVersionHash = await this.getLatestVersion(manifest.versionHash);

      await this.onInstallCallbackFn(
        {
          ...manifest,
          ...versionRuntime,
          latestVersionHash,
        },
        source,
        previousVersion,
        { clearExisting, isWatching },
      );
    } catch (err) {
      // if intall callback fails, we need to rollback
      const record = this.datastoresDb.versions.delete(manifest.versionHash);
      await Fs.rm(record.dbxPath, { recursive: true }).catch(() => null);
      throw err;
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
      const previousEntry = await this.get(previous.versionHash);
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

  private saveManifestMetadata(
    manifest: IDatastoreManifest,
    dbxPath: string,
    installAllowedNewLinkedVersionHistory: boolean,
    source?: IDatastoreSourceDetails,
  ): void {
    const baseVersionHash =
      manifest.linkedVersions[manifest.linkedVersions.length - 1]?.versionHash ??
      manifest.versionHash;

    for (const version of manifest.linkedVersions) {
      if (version.versionHash === baseVersionHash) continue;
      const existing = this.datastoresDb.versions.getByHash(version.versionHash);
      if (existing) {
        this.datastoresDb.versions.update(
          version.versionHash,
          version.versionTimestamp,
          baseVersionHash,
          source?.expirationTimestamp,
        );
      } else {
        this.datastoresDb.versions.save(
          version.versionHash,
          manifest.scriptEntrypoint,
          version.versionTimestamp,
          null,
          baseVersionHash,
          manifest.domain,
          source?.source,
          source?.host,
          installAllowedNewLinkedVersionHistory,
          source?.adminIdentity,
          source?.adminSignature,
          source?.expirationTimestamp,
        );
      }
    }

    this.datastoresDb.versions.save(
      manifest.versionHash,
      manifest.scriptEntrypoint,
      manifest.versionTimestamp,
      dbxPath,
      baseVersionHash,
      manifest.domain,
      source?.source,
      source?.host,
      installAllowedNewLinkedVersionHistory,
      source?.adminIdentity,
      source?.adminSignature,
      source?.expirationTimestamp,
    );
  }
}

export interface IDatastoreSourceDetails {
  host: string;
  source: 'manual' | 'upload' | 'cluster' | 'network';
  adminIdentity?: string;
  adminSignature?: Buffer;
  expirationTimestamp?: number;
}
