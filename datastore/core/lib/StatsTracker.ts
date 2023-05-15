import IDatastoreManifest from '@ulixee/platform-specification/types/IDatastoreManifest';
import TypedEventEmitter from '@ulixee/commons/lib/TypedEventEmitter';
import { IStatsTrackerApiTypes } from '@ulixee/platform-specification/services/StatsTrackerApis';
import { IDatastoreStatsRecord } from '../db/DatastoreStatsTable';
import StatsTrackerDiskStore from './StatsTrackerDiskStore';
import StatsTrackerClusterStore from './StatsTrackerClusterStore';

export type IDatastoreStats = IStatsTrackerApiTypes['StatsTracker.get']['result'];

export default class StatsTracker extends TypedEventEmitter<{
  stats: IDatastoreStatsRecord;
  query: { versionHash: string };
}> {
  public diskStore?: StatsTrackerDiskStore;
  public clusterStore?: StatsTrackerClusterStore;

  constructor(readonly datastoresDir: string, statsEndpoint?: URL) {
    super();
    if (statsEndpoint) {
      this.clusterStore = new StatsTrackerClusterStore(statsEndpoint);
    } else {
      this.diskStore = new StatsTrackerDiskStore(datastoresDir);
      this.diskStore.addEventEmitter(this, ['stats']);
    }
  }

  async close(): Promise<void> {
    await this.clusterStore?.close();
    await this.diskStore?.close();
  }

  public async getForDatastore(manifest: IDatastoreManifest): Promise<IDatastoreStats> {
    if (this.clusterStore) return this.clusterStore.getForDatastore(manifest.versionHash);
    return this.diskStore.getForDatastore(manifest);
  }

  public async recordEntityStats(
    details: IStatsTrackerApiTypes['StatsTracker.recordEntityStats']['args'],
  ): Promise<void> {
    if (this.clusterStore) await this.clusterStore.recordEntityStats(details);
    else this.diskStore.recordEntityStats(details);
  }

  public async recordQuery(
    details: IStatsTrackerApiTypes['StatsTracker.recordQuery']['args'],
  ): Promise<void> {
    this.emit('query', { versionHash: details.versionHash });
    if (this.clusterStore) await this.clusterStore.recordQuery(details);
    else this.diskStore.recordQuery(details);
  }
}
