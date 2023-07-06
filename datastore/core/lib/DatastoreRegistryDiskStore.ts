import { existsAsync, readFileAsJson } from '@ulixee/commons/lib/fileUtils';
import Logger from '@ulixee/commons/lib/Logger';
import { isSemverSatisfied } from '@ulixee/commons/lib/VersionUtils';
import { IDatastoreListEntry } from '@ulixee/platform-specification/services/DatastoreRegistryApis';
import IDatastoreManifest from '@ulixee/platform-specification/types/IDatastoreManifest';
import { promises as Fs } from 'fs';
import { nanoid } from 'nanoid';
import * as Path from 'path';
import DatastoresDb from '../db';
import IDatastoreRegistryStore, {
  IDatastoreManifestWithLatest,
} from '../interfaces/IDatastoreRegistryStore';
import DatastoreManifest from './DatastoreManifest';
import { IDatastoreManifestWithRuntime } from './DatastoreRegistry';
import DatastoreVm from './DatastoreVm';
import { packDbx, unpackDbx, unpackDbxFile } from './dbxUtils';
import { InvalidPermissionsError, MissingRequiredSettingError } from './errors';

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

  async list(
    count?: number,
    offset?: number,
  ): Promise<{ datastores: IDatastoreListEntry[]; total: number }> {
    const results: IDatastoreListEntry[] = [];
    const { datastores, total } = this.datastoresDb.versions.list(count, offset);
    for (const datastore of datastores) {
      const entry = await this.get(datastore.id, datastore.version);
      if (entry) {
        const {
          name,
          scriptEntrypoint,
          domain,
          id,
          version,
          description,
          versionTimestamp,
          isStarted,
        } = entry;
        results.push({
          description,
          id,
          version,
          versionTimestamp,
          isStarted,
          domain,
          scriptEntrypoint,
          name,
        });
      }
    }
    return { datastores: results, total };
  }

  public async getVersions(id: string): Promise<{ version: string; timestamp: number }[]> {
    return this.datastoresDb.versions.getDatastoreVersions(id);
  }

  async get(id: string, version: string): Promise<IDatastoreManifestWithLatest> {
    const versionRecord = this.datastoresDb.versions.get(id, version);

    if (!versionRecord?.dbxPath) {
      return null;
    }

    const dbxPath = versionRecord.dbxPath;
    const scriptPath = Path.join(dbxPath, 'datastore.js');
    let manifest = this.#openedManifestsByDbxPath.get(dbxPath);
    if (!manifest) {
      const manifestPath = Path.join(dbxPath, 'datastore-manifest.json');
      manifest = await readFileAsJson<IDatastoreManifest>(manifestPath).catch(() => null);
      if (
        manifest &&
        !DatastoreVm.doNotCacheList.has(scriptPath) &&
        !id.startsWith(DatastoreManifest.TemporaryIdPrefix)
      ) {
        this.#openedManifestsByDbxPath.set(dbxPath, manifest);
      }
    }

    if (!manifest) return null;

    const latestVersion = await this.getLatestVersion(id);
    return {
      ...manifest,
      isStarted: versionRecord.isStarted,
      latestVersion,
    };
  }

  getRuntime(id: string, version: string): Promise<{ runtimePath: string; isStarted: boolean }> {
    if (!version) return null;

    const versionRecord = this.datastoresDb.versions.get(id, version);
    if (!versionRecord?.dbxPath) return null;

    return Promise.resolve({
      runtimePath: Path.join(versionRecord.dbxPath, 'datastore.js'),
      isStarted: versionRecord.isStarted,
    });
  }

  async getCompressedDbx(
    id: string,
    version: string,
  ): Promise<{
    compressedDbx: Buffer;
    adminSignature: Buffer;
    adminIdentity: string;
  }> {
    if (!version) return null;

    const versionRecord = this.datastoresDb.versions.get(id, version);
    if (!versionRecord?.dbxPath) return null;

    const compressedDbx = await packDbx(versionRecord.dbxPath);
    return {
      compressedDbx,
      adminIdentity: versionRecord.adminIdentity,
      adminSignature: versionRecord.adminSignature,
    };
  }

  async installFromService(
    id: string,
    version: string,
    service: IDatastoreRegistryStore,
  ): Promise<{ runtimePath: string; isStarted: boolean }> {
    const { compressedDbx, adminIdentity, adminSignature } = await service.downloadDbx(id, version);
    const tmpDir = Path.join(this.datastoresDir, `${version}.dbx.tmp.${nanoid(3)}`);
    try {
      await Fs.mkdir(tmpDir, { recursive: true });
      await unpackDbx(compressedDbx, tmpDir);
      await this.install(
        tmpDir,
        {
          hasServerAdminIdentity: true,
        },
        {
          adminIdentity,
          adminSignature,
          source: service.source === 'cluster' ? 'cluster' : 'disk',
        },
      );
    } finally {
      // remove tmp dir in case of errors
      await Fs.rm(tmpDir, { recursive: true }).catch(() => null);
    }
    return this.getRuntime(id, version);
  }

  async getPreviousInstalledVersion(id: string, version: string): Promise<string> {
    const previousVersions = this.datastoresDb.versions
      .getDatastoreVersions(id)
      .map(x => x.version)
      .filter(x => x.localeCompare(version, undefined, { numeric: true, sensitivity: 'base' }) < 0);

    if (previousVersions.length) {
      previousVersions.sort((a, b) =>
        b.localeCompare(a, undefined, { numeric: true, sensitivity: 'base' }),
      );
      for (const previousVersion of previousVersions) {
        if (await this.get(id, previousVersion)) return previousVersion;
      }
    }
  }

  getLatestVersion(id: string): Promise<string> {
    const latestVersion = this.datastoresDb.versions.getLatestVersion(id);
    return Promise.resolve(latestVersion);
  }

  getLatestVersionForDomain(domain: string): Promise<{ id: string; version: string }> {
    const latestByDomain = this.datastoresDb.versions.findLatestByDomain(domain);
    return Promise.resolve(latestByDomain);
  }

  async install(
    datastoreTmpPath: string,
    adminOptions: {
      adminIdentity?: string;
      hasServerAdminIdentity?: boolean;
      datastoresMustHaveOwnAdminIdentity?: boolean;
    },
    sourceDetails?: IDatastoreSourceDetails,
  ): Promise<{ dbxPath: string; manifest: IDatastoreManifest; didInstall: boolean }> {
    if (!this.isSourceOfTruth && sourceDetails?.source === 'upload') {
      throw new Error(
        'Installations cannot be made directly against this DatastoreRegistryService. This should have been redirected to a cluster leader or network endpoint.',
      );
    }
    const manifest = await readFileAsJson<IDatastoreManifest>(
      `${datastoreTmpPath}/datastore-manifest.json`,
    );
    const storedPath = this.datastoresDb.versions.get(manifest.id, manifest.version)?.dbxPath;
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

    const dbxPath = this.createDbxPath(manifest);

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
    this.saveManifestMetadata(manifest, dbxPath, sourceDetails);

    await this.onInstalled(manifest, sourceDetails);

    return { dbxPath, manifest, didInstall: true };
  }

  async installOnDiskUploads(
    cloudAdminIdentities: string[],
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
          },
          {
            adminIdentity: cloudAdminIdentities?.[0],
            adminSignature: null,
            source: 'disk',
          },
        );
        if (install.didInstall) {
          installations.push(install);
          // move upload to same location
          if (path !== install.dbxPath && (await existsAsync(`${path}.tgz`))) {
            await Fs.rename(`${path}.tgz`, `${install.dbxPath}.tgz`);
          }
        }
      } catch (err) {
        await Fs.rm(path, { recursive: true }).catch(() => null);
        throw err;
      }
    }
    return installations;
  }

  async startAtPath(
    dbxPath: string,
    sourceHost: string,
    watch: boolean,
  ): Promise<IDatastoreManifest> {
    const scriptPath = Path.join(dbxPath, 'datastore.js');
    if (!(await existsAsync(scriptPath))) throw new Error("This script entrypoint doesn't exist");

    const manifest = await readFileAsJson<IDatastoreManifest>(`${dbxPath}/datastore-manifest.json`);
    this.checkDatastoreCoreInstalled(manifest.coreVersion);

    this.saveManifestMetadata(manifest, dbxPath);

    DatastoreVm.doNotCacheList.add(scriptPath);
    await this.onInstalled(manifest, { source: 'start' }, true, watch);
    return manifest;
  }

  stopAtPath(dbxPath: string): { version: string; id: string } {
    return this.datastoresDb.versions.setDbxStopped(dbxPath);
  }

  recordPublished(id: string, version: string, timestamp: number): void {
    this.datastoresDb.versions.recordPublishedToNetworkDate(id, version, timestamp);
  }

  async onInstalled(
    manifest: IDatastoreManifest,
    source: IDatastoreSourceDetails,
    clearExisting?: boolean,
    isWatching?: boolean,
  ): Promise<void> {
    if (!this.onInstallCallbackFn) return;

    const id = manifest.id;
    try {
      const previousVersionNumber = await this.getPreviousInstalledVersion(id, manifest.version);
      const previousRuntime = await this.getRuntime(id, previousVersionNumber);
      const previousVersion: IDatastoreManifestWithRuntime = previousVersionNumber
        ? ((await this.get(id, previousVersionNumber)) as any)
        : null;
      if (previousVersion) Object.assign(previousVersion, previousRuntime);

      const versionRuntime = await this.getRuntime(manifest.id, manifest.version);
      const latestVersion = await this.getLatestVersion(manifest.id);

      await this.onInstallCallbackFn(
        {
          ...manifest,
          ...versionRuntime,
          latestVersion,
        },
        source,
        previousVersion,
        { clearExisting, isWatching },
      );
    } catch (err) {
      // if install callback fails, we need to rollback
      const record = this.datastoresDb.versions.delete(id, manifest.version);
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
    // ensure admin is from the latest linked version
    const previousVersion = await this.getLatestVersion(manifest.id);
    if (previousVersion) {
      const previousVersionManifest = await this.get(manifest.id, previousVersion);
      // if there were admins, must be in previous list!
      if (
        previousVersionManifest &&
        previousVersionManifest.adminIdentities.length &&
        (!previousVersionManifest.adminIdentities.includes(adminIdentity) || !adminIdentity)
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

  private createDbxPath(manifest: IDatastoreManifest): string {
    return Path.resolve(this.datastoresDir, `${manifest.id}@${manifest.version}.dbx`);
  }

  private saveManifestMetadata(
    manifest: IDatastoreManifest,
    dbxPath: string,
    source?: IDatastoreSourceDetails,
  ): void {
    const existing = this.datastoresDb.versions.get(manifest.id, manifest.version);
    if (!existing) {
      this.datastoresDb.versions.save(
        manifest.id,
        manifest.version,
        manifest.scriptEntrypoint,
        manifest.versionTimestamp,
        dbxPath,
        manifest.domain,
        source?.source,
        source?.adminIdentity,
        source?.adminSignature,
      );
    } else {
      this.datastoresDb.versions.setDbxStarted(manifest.id, manifest.version);
    }
  }
}

export interface IDatastoreSourceDetails {
  source: 'disk' | 'upload' | 'upload:create-storage' | 'start' | 'cluster';
  adminIdentity?: string;
  adminSignature?: Buffer;
}
