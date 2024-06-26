import { IBoundLog } from '@ulixee/commons/interfaces/ILog';
import Logger from '@ulixee/commons/lib/Logger';
import TypedEventEmitter from '@ulixee/commons/lib/TypedEventEmitter';
import { bindFunctions } from '@ulixee/commons/lib/utils';
import { ConnectionToCore } from '@ulixee/net';
import {
  IDatastoreListEntry,
  IDatastoreRegistryApis,
} from '@ulixee/platform-specification/services/DatastoreRegistryApis';
import IDatastoreManifest from '@ulixee/platform-specification/types/IDatastoreManifest';
import { promises as Fs } from 'fs';
import IDatastoreCoreConfigureOptions from '../interfaces/IDatastoreCoreConfigureOptions';
import IDatastoreRegistryStore, {
  IDatastoreManifestWithLatest,
} from '../interfaces/IDatastoreRegistryStore';
import DatastoreRegistryDiskStore, { IDatastoreSourceDetails } from './DatastoreRegistryDiskStore';
import DatastoreRegistryServiceClient from './DatastoreRegistryServiceClient';
import { unpackDbx } from './dbxUtils';
import { DatastoreNotFoundError } from './errors';

export type IDatastoreManifestWithRuntime = IDatastoreManifestWithLatest & {
  runtimePath: string;
  isStarted: boolean;
};

type TOnDatastoreInstalledCallbackFn = (
  version: IDatastoreManifestWithRuntime,
  source: IDatastoreSourceDetails['source'],
  previous?: IDatastoreManifestWithRuntime,
  options?: {
    clearExisting?: boolean;
    isWatching?: boolean;
  },
) => Promise<void>;

const { log } = Logger(module);

export default class DatastoreRegistry extends TypedEventEmitter<{
  new: {
    datastore: IDatastoreManifestWithRuntime;
    activity: 'started' | 'uploaded';
  };
  stopped: { id: string; version: string };
}> {
  public diskStore: DatastoreRegistryDiskStore;
  public clusterStore: DatastoreRegistryServiceClient;

  public get sourceOfTruthAddress(): URL {
    return this.clusterStore?.hostAddress;
  }

  private readonly stores: IDatastoreRegistryStore[] = [];
  private logger: IBoundLog;

  constructor(
    datastoreDir: string,
    connectionToHostedServiceCore?: ConnectionToCore<IDatastoreRegistryApis, {}>,
    private config?: IDatastoreCoreConfigureOptions,
    private installCallbackFn?: TOnDatastoreInstalledCallbackFn,
  ) {
    super();
    bindFunctions(this);
    this.logger = log.createChild(module);
    this.diskStore = new DatastoreRegistryDiskStore(
      datastoreDir,
      !connectionToHostedServiceCore,
      config?.storageEngineHost,
      this.onDatastoreInstalled.bind(this),
    );

    if (connectionToHostedServiceCore) {
      this.clusterStore = new DatastoreRegistryServiceClient(connectionToHostedServiceCore);
    }

    this.stores = [this.diskStore, this.clusterStore].filter(Boolean);
  }

  public async close(): Promise<void> {
    await Promise.allSettled(this.stores.map(x => x.close()));
  }

  public async list(
    count = 100,
    offset = 0,
  ): Promise<{ datastores: IDatastoreListEntry[]; total: number }> {
    const service = this.clusterStore ?? this.diskStore;
    return await service.list(count, offset);
  }

  public async getVersions(id: string): Promise<{ version: string; timestamp: number }[]> {
    const service = this.clusterStore ?? this.diskStore;
    return await service.getVersions(id);
  }

  public async get(
    id: string,
    version?: string,
    throwIfNotExists = true,
  ): Promise<IDatastoreManifestWithRuntime> {
    let manifestWithLatest: IDatastoreManifestWithRuntime;
    const latestVersion = await this.getLatestVersion(id);
    version ??= latestVersion;
    for (const service of this.stores) {
      manifestWithLatest = (await service.get(id, version)) as IDatastoreManifestWithRuntime;
      if (manifestWithLatest) {
        try {
          // must install into local disk store
          let runtime = await this.diskStore.getRuntime(id, version);
          if (!runtime && service.source !== 'disk') {
            this.logger.info(`getByVersion:MissingRuntime`, {
              version,
              searchInService: service.source,
            });
            runtime = await this.diskStore.installFromService(id, version, service);
          }
          Object.assign(manifestWithLatest, runtime);
          break;
        } catch (error) {
          this.logger.warn(`getByVersion:ErrorInstallingRuntime`, {
            version,
            searchInService: service.source,
            error,
          });
        }
      }
    }

    if (manifestWithLatest) return manifestWithLatest;
    if (throwIfNotExists) {
      throw new DatastoreNotFoundError(`Datastore version (${version}) not found on Cloud.`, {
        latestVersion,
        version,
      });
    }
    return null;
  }

  public async getLatestVersion(id: string): Promise<string> {
    for (const service of this.stores) {
      const latestVersion = await service.getLatestVersion(id);
      if (latestVersion) return latestVersion;
    }
  }

  public async saveDbx(
    details: TDatastoreUpload,
    sourceHost?: string,
    source: IDatastoreSourceDetails['source'] = 'upload',
  ): Promise<{ didInstall: boolean; dbxPath: string; manifest: IDatastoreManifest }> {
    const { compressedDbx, adminIdentity, adminSignature } = details;
    const { cloudAdminIdentities, datastoresMustHaveOwnAdminIdentity, datastoresTmpDir } =
      this.config;
    const tmpDir = await Fs.mkdtemp(`${datastoresTmpDir}/`);

    try {
      await unpackDbx(compressedDbx, tmpDir);
      return await this.save(
        tmpDir,
        {
          adminIdentity,
          hasServerAdminIdentity: cloudAdminIdentities.includes(adminIdentity ?? '-1'),
          datastoresMustHaveOwnAdminIdentity,
        },
        {
          source,
          adminIdentity,
          adminSignature,
        },
      );
    } finally {
      // remove tmp dir in case of errors
      await Fs.rm(tmpDir, { recursive: true }).catch(() => null);
    }
  }

  public uploadToSourceOfTruth(datastore: TDatastoreUpload): Promise<{ success: boolean }> {
    return this.clusterStore?.upload(datastore);
  }

  public async save(
    datastoreTmpPath: string,
    adminDetails?: {
      adminIdentity?: string;
      hasServerAdminIdentity?: boolean;
      datastoresMustHaveOwnAdminIdentity?: boolean;
    },
    uploaderSource?: IDatastoreSourceDetails,
  ): Promise<{ dbxPath: string; manifest: IDatastoreManifest; didInstall: boolean }> {
    adminDetails ??= {};
    return await this.diskStore.install(datastoreTmpPath, adminDetails, uploaderSource);
  }

  public async startAtPath(
    dbxPath: string,
    sourceHost: string,
    watch: boolean,
  ): Promise<IDatastoreManifest> {
    return await this.diskStore.startAtPath(dbxPath, sourceHost, watch);
  }

  public stopAtPath(dbxPath: string): void {
    const datastore = this.diskStore.stopAtPath(dbxPath);
    if (datastore) {
      this.emit('stopped', {
        id: datastore.id,
        version: datastore.version,
      });
    }
  }

  private async onDatastoreInstalled(
    version: IDatastoreManifestWithRuntime,
    source: IDatastoreSourceDetails,
    previous?: IDatastoreManifestWithRuntime,
    options?: {
      clearExisting?: boolean;
      isWatching?: boolean;
    },
  ): Promise<void> {
    await this.installCallbackFn?.(version, source?.source, previous, options);
    this.emit('new', {
      activity: source?.source === 'start' ? 'started' : 'uploaded',
      datastore: version,
    });
  }
}

export interface TDatastoreUpload {
  compressedDbx: Buffer;
  adminIdentity?: string;
  adminSignature?: Buffer;
}
