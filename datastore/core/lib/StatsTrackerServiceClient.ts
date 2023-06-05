import { ConnectionToCore } from '@ulixee/net';
import { IStatsTrackerApis, IStatsTrackerApiTypes } from '@ulixee/platform-specification/services/StatsTrackerApis';
import { IDatastoreStats } from './StatsTracker';

export default class StatsTrackerServiceClient {
  constructor(public client: ConnectionToCore<IStatsTrackerApis, {}>) {}

  async close(): Promise<void> {
    await this.client.disconnect();
  }

  public async getForDatastore(versionHash: string): Promise<IDatastoreStats> {
    return await this.client.sendRequest({
      command: 'StatsTracker.get',
      args: [{ versionHash }],
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
