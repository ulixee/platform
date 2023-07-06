import { ConnectionToCore } from '@ulixee/net';
import {
  IStatsTrackerApis,
  IStatsTrackerApiTypes,
} from '@ulixee/platform-specification/services/StatsTrackerApis';
import { IDatastoreStats } from './StatsTracker';

export default class StatsTrackerServiceClient {
  constructor(public client: ConnectionToCore<IStatsTrackerApis, {}>) {}

  async close(): Promise<void> {
    await this.client.disconnect();
  }

  public async getForDatastoreVersion(
    datastoreId: string,
    version: string,
  ): Promise<IDatastoreStats> {
    return await this.client.sendRequest({
      command: 'StatsTracker.getByVersion',
      args: [{ datastoreId, version }],
    });
  }

  public async getForDatastore(datastoreId: string): Promise<IDatastoreStats> {
    return await this.client.sendRequest({
      command: 'StatsTracker.get',
      args: [{ datastoreId }],
    });
  }

  public async getDatastoreSummary(datastoreId: string): Promise<Pick<IDatastoreStats, 'stats'>> {
    return await this.client.sendRequest({
      command: 'StatsTracker.getSummary',
      args: [{ datastoreId }],
    });
  }

  public async recordEntityStats(
    details: IStatsTrackerApiTypes['StatsTracker.recordEntityStats']['args'],
  ): Promise<void> {
    await this.client.sendRequest({
      command: 'StatsTracker.recordEntityStats',
      args: [details],
    });
  }

  public async recordQuery(
    details: IStatsTrackerApiTypes['StatsTracker.recordQuery']['args'],
  ): Promise<void> {
    await this.client.sendRequest({
      command: 'StatsTracker.recordQuery',
      args: [details],
    });
  }
}
