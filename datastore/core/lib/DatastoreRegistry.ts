import TypedEventEmitter from '@ulixee/commons/lib/TypedEventEmitter';
import { encodeBuffer } from '@ulixee/commons/lib/bufferUtils';
import { bindFunctions } from '@ulixee/commons/lib/utils';
import IDatastoreManifest from '@ulixee/platform-specification/types/IDatastoreManifest';
import IPeerNetwork from '@ulixee/platform-specification/types/IPeerNetwork';
import { IDatastoreEntityStatsRecord } from '../db/DatastoreEntityStatsTable';
import IDatastoreRegistryStore, {
  IDatastoreManifestWithLatest,
} from '../interfaces/IDatastoreRegistryStore';
import DatastoreApiClients from './DatastoreApiClients';
import DatastoreRegistryClusterStore from './DatastoreRegistryClusterStore';
import DatastoreRegistryDiskStore, { IDatastoreSourceDetails } from './DatastoreRegistryDiskStore';
import DatastoreRegistryNetworkStore from './DatastoreRegistryNetworkStore';
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
  previous?: IDatastoreManifestWithRuntime,
  options?: {
    clearExisting?: boolean;
    isWatching?: boolean;
  },
) => Promise<void>;

export default class DatastoreRegistry extends TypedEventEmitter<{
  new: {
    datastore: IDatastoreManifestWithRuntime;
    activity: 'started' | 'uploaded';
  };
  stopped: { versionHash: string };
}> {
  public diskStore: DatastoreRegistryDiskStore;
  public clusterStore: DatastoreRegistryClusterStore;
  public networkStore: DatastoreRegistryNetworkStore;
  public networkCacheTimeMins = 48 * 60; // 48 hours

  public get sourceOfTruthAddress(): URL {
    return this.clusterStore?.hostAddress;
  }

  private readonly stores: IDatastoreRegistryStore[] = [];

  constructor(
    datastoreDir: string,
    apiClients?: DatastoreApiClients,
    datastoreRegistryEndpoint?: URL,
    peerNetwork?: IPeerNetwork,
    defaultStorageEngineHost?: string,
    private installCallbackFn?: TOnDatastoreInstalledCallbackFn,
  ) {
    super();
    bindFunctions(this);

    this.diskStore = new DatastoreRegistryDiskStore(
      datastoreDir,
      !datastoreRegistryEndpoint,
      defaultStorageEngineHost,
      this.onDatastoreInstalled.bind(this),
    );

    if (datastoreRegistryEndpoint) {
      this.clusterStore = new DatastoreRegistryClusterStore(datastoreRegistryEndpoint);
    }

    if (peerNetwork) {
      this.networkStore = new DatastoreRegistryNetworkStore(peerNetwork, apiClients);
      this.networkStore.peerNetwork.on('provide-expired', this.onProvideExpired);
    }

    this.stores = [this.diskStore, this.clusterStore, this.networkStore].filter(Boolean);
  }

  public async close(): Promise<void> {
    this.networkStore?.peerNetwork.off('provide-expired', this.onProvideExpired);
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
      manifestWithLatest = (await service.get(versionHash)) as any;
      if (manifestWithLatest) {
        // must install into local disk store
        let runtime = await this.diskStore.getRuntime(versionHash);
        if (!runtime) {
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
      }
    }

    if (manifestWithLatest) return manifestWithLatest;
    if (throwIfNotExists) {
      const latestVersionHash = await this.getLatestVersion(versionHash);
      throw new DatastoreNotFoundError('Datastore not found on Cloud.', {
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

  public async startAtPath(dbxPath: string, watch: boolean): Promise<IDatastoreManifest> {
    return await this.diskStore.startAtPath(dbxPath, watch);
  }

  public stopAtPath(dbxPath: string): void {
    const datastore = this.diskStore.stopAtPath(dbxPath);
    if (datastore) {
      this.emit('stopped', {
        versionHash: datastore.versionHash,
      });
    }
  }

  private async onProvideExpired(provided: { hash: Buffer }): Promise<void> {
    const versionHash = encodeBuffer(provided.hash, 'dbx');
    if (!(await this.diskStore.isHostingExpired(versionHash))) {
      await this.networkStore.publish(versionHash);
    }
  }

  private async onDatastoreInstalled(
    version: IDatastoreManifestWithRuntime,
    _source: IDatastoreSourceDetails,
    previous?: IDatastoreManifestWithRuntime,
    options?: {
      clearExisting?: boolean;
      isWatching?: boolean;
    },
  ): Promise<void> {
    await this.installCallbackFn?.(version, previous, options);
    this.emit('new', {
      activity: version.isStarted ? 'started' : 'uploaded',
      datastore: await this.getByVersionHash(version.versionHash),
    });
    await this.networkStore?.publish(version.versionHash);
  }
}
