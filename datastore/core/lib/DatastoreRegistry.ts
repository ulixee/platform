import { IBoundLog } from '@ulixee/commons/interfaces/ILog';
import Logger from '@ulixee/commons/lib/Logger';
import TypedEventEmitter from '@ulixee/commons/lib/TypedEventEmitter';
import { bindFunctions } from '@ulixee/commons/lib/utils';
import { ConnectionToCore } from '@ulixee/net';
import IDatastoreManifest from '@ulixee/platform-specification/types/IDatastoreManifest';
import { IDatastoreRegistryApis } from '@ulixee/platform-specification/services/DatastoreRegistryApis';
import IKad from '@ulixee/platform-specification/types/IKad';
import { promises as Fs } from 'fs';
import { IDatastoreEntityStatsRecord } from '../db/DatastoreEntityStatsTable';
import IDatastoreCoreConfigureOptions from '../interfaces/IDatastoreCoreConfigureOptions';
import IDatastoreRegistryStore, {
  IDatastoreManifestWithLatest,
} from '../interfaces/IDatastoreRegistryStore';
import DatastoreApiClients from './DatastoreApiClients';
import DatastoreRegistryServiceClient from './DatastoreRegistryServiceClient';
import DatastoreRegistryDiskStore, { IDatastoreSourceDetails } from './DatastoreRegistryDiskStore';
import DatastoreRegistryNetworkStore from './DatastoreRegistryNetworkStore';
import { unpackDbx } from './dbxUtils';
import { DatastoreNotFoundError } from './errors';

export interface IStatsByName {
  [name: string]: IDatastoreEntityStatsRecord;
}

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
  stopped: { versionHash: string };
}> {
  public diskStore: DatastoreRegistryDiskStore;
  public clusterStore: DatastoreRegistryServiceClient;
  public networkStore: DatastoreRegistryNetworkStore;
  public networkCacheTimeMins = 48 * 60; // 48 hours

  public get sourceOfTruthAddress(): URL {
    return this.clusterStore?.hostAddress;
  }

  private readonly stores: IDatastoreRegistryStore[] = [];
  private logger: IBoundLog;

  constructor(
    datastoreDir: string,
    apiClients?: DatastoreApiClients,
    connectionToHostedServiceCore?: ConnectionToCore<IDatastoreRegistryApis, {}>,
    kad?: IKad,
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

    if (kad) {
      this.networkStore = new DatastoreRegistryNetworkStore(kad, apiClients);
      this.networkStore.kad.on('provide-expired', this.onProvideExpired);
    }

    this.stores = [this.diskStore, this.clusterStore, this.networkStore].filter(Boolean);
  }

  public async close(): Promise<void> {
    this.networkStore?.kad.off('provide-expired', this.onProvideExpired);
    await Promise.allSettled(this.stores.map(x => x.close()));
  }

  public async all(
    source: 'disk' | 'cluster' = 'cluster',
  ): Promise<IDatastoreManifestWithLatest[]> {
    const service = (source === 'cluster' && this.clusterStore) ?? this.diskStore;
    return await service.all();
  }

  public async getByVersionHash(
    versionHash: string,
    throwIfNotExists = true,
  ): Promise<IDatastoreManifestWithRuntime> {
    let manifestWithLatest: IDatastoreManifestWithRuntime;
    for (const service of this.stores) {
      manifestWithLatest = (await service.get(versionHash)) as IDatastoreManifestWithRuntime;
      if (manifestWithLatest) {
        try {
          // must install into local disk store
          let runtime = await this.diskStore.getRuntime(versionHash);
          if (!runtime && service.source !== 'disk') {
            this.logger.info(`getByVersionHash:MissingRuntime`, {
              versionHash,
              searchInService: service.source,
            });
            let expirationTimestamp: number;
            if (service.source === 'network') {
              expirationTimestamp = Date.now() + this.networkCacheTimeMins * 60e3;
            }
            runtime = await this.diskStore.installFromService(
              versionHash,
              service,
              expirationTimestamp,
            );
          }
          Object.assign(manifestWithLatest, runtime);
          break;
        } catch (error) {
          this.logger.warn(`getByVersionHash:ErrorInstallingRuntime`, {
            versionHash,
            searchInService: service.source,
            error,
          });
        }
      }
    }

    if (manifestWithLatest) return manifestWithLatest;
    if (throwIfNotExists) {
      const latestVersionHash = await this.getLatestVersion(versionHash);
      throw new DatastoreNotFoundError(`Datastore version (${versionHash}) not found on Cloud.`, {
        latestVersionHash,
        versionHash,
      });
    }
    return null;
  }

  public async getByDomain(domain: string): Promise<string> {
    for (const service of this.stores) {
      const latestVersion = await service.getLatestVersionForDomain(domain);
      if (latestVersion) return latestVersion;
    }
  }

  public async getLatestVersion(versionHash: string): Promise<string> {
    for (const service of this.stores) {
      const latestVersion = await service.getLatestVersion(versionHash);
      if (latestVersion) return latestVersion;
    }
  }

  public async getInstalledPreviousVersion(
    versionHash: string,
  ): Promise<IDatastoreManifestWithRuntime> {
    const previousVersionHash = await this.diskStore.getPreviousInstalledVersion(versionHash);
    if (previousVersionHash) {
      return this.getByVersionHash(previousVersionHash);
    }
  }

  public async saveDbx(
    details: TDatastoreUpload,
    sourceHost?: string,
    source: IDatastoreSourceDetails['source'] = 'upload',
  ): Promise<{ success: boolean }> {
    const { compressedDbx, adminIdentity, adminSignature, allowNewLinkedVersionHistory } = details;
    const { cloudAdminIdentities, datastoresMustHaveOwnAdminIdentity, datastoresTmpDir } =
      this.config;
    const tmpDir = await Fs.mkdtemp(`${datastoresTmpDir}/`);

    try {
      await unpackDbx(compressedDbx, tmpDir);
      const { didInstall } = await this.save(
        tmpDir,
        {
          adminIdentity,
          allowNewLinkedVersionHistory,
          hasServerAdminIdentity: cloudAdminIdentities.includes(adminIdentity ?? '-1'),
          datastoresMustHaveOwnAdminIdentity,
        },
        {
          host: sourceHost,
          source,
          adminIdentity,
          adminSignature,
        },
      );
      return { success: didInstall };
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
      allowNewLinkedVersionHistory?: boolean;
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
        versionHash: datastore.versionHash,
      });
    }
  }

  private async onProvideExpired(provided: { key: Buffer, providerNodeId: string }): Promise<void> {
    const result = await this.diskStore.didExpireNetworkHosting(provided.key);
    if (!result.isExpired) {
      this.diskStore.recordPublished(result.versionHash, Date.now());
      await this.networkStore.publish(result.versionHash);
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
    if (this.networkStore) {
      await this.networkStore?.publish(version.versionHash);
      this.diskStore.recordPublished(version.versionHash, Date.now());
    }
  }
}

export interface TDatastoreUpload {
  compressedDbx: Buffer;
  allowNewLinkedVersionHistory: boolean;
  adminIdentity?: string;
  adminSignature?: Buffer;
}
