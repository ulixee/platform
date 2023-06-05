import { ConnectionToCore } from '@ulixee/net';
import IDatastoreManifest from '@ulixee/platform-specification/types/IDatastoreManifest';
import TypedEventEmitter from '@ulixee/commons/lib/TypedEventEmitter';
import {
  IStatsTrackerApis,
  IStatsTrackerApiTypes,
} from '@ulixee/platform-specification/services/StatsTrackerApis';
import { IDatastoreStatsRecord } from '../db/DatastoreStatsTable';
import StatsTrackerDiskStore from './StatsTrackerDiskStore';
import StatsTrackerServiceClient from './StatsTrackerServiceClient';

export type IDatastoreStats = IStatsTrackerApiTypes['StatsTracker.get']['result'];

export default class StatsTracker extends TypedEventEmitter<{
  stats: IDatastoreStatsRecord;
  query: { versionHash: string };
}> {
  public diskStore?: StatsTrackerDiskStore;
  public serviceClient?: StatsTrackerServiceClient;

  constructor(
    readonly datastoresDir: string,
    connectionToServiceCore?: ConnectionToCore<IStatsTrackerApis, {}>,
  ) {
    super();
    if (connectionToServiceCore) {
      this.serviceClient = new StatsTrackerServiceClient(connectionToServiceCore);
    } else {
      this.diskStore = new StatsTrackerDiskStore(datastoresDir);
      this.diskStore.addEventEmitter(this, ['stats']);
    }
  }

  async close(): Promise<void> {
    await this.diskStore?.close();
  }

  public async getForDatastore(manifest: IDatastoreManifest): Promise<IDatastoreStats> {
    if (this.serviceClient) return this.serviceClient.getForDatastore(manifest.versionHash);
    return this.diskStore.getForDatastore(manifest);
  }

  public async recordEntityStats(
    details: IStatsTrackerApiTypes['StatsTracker.recordEntityStats']['args'],
  ): Promise<void> {
    if (this.serviceClient) await this.serviceClient.recordEntityStats(details);
    else this.diskStore.recordEntityStats(details);
  }

  public async recordQuery(
    details: IStatsTrackerApiTypes['StatsTracker.recordQuery']['args'],
  ): Promise<void> {
    this.emit('query', { versionHash: details.versionHash });
    if (this.serviceClient) await this.serviceClient.recordQuery(details);
    else this.diskStore.recordQuery(details);
  }
}
