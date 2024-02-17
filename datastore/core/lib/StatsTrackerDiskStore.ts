import TypedEventEmitter from '@ulixee/commons/lib/TypedEventEmitter';
import { IStatsTrackerApiTypes } from '@ulixee/platform-specification/services/StatsTrackerApis';
import IDatastoreManifest from '@ulixee/platform-specification/types/IDatastoreManifest';
import { IDatastoreStatsRecord } from '../db/DatastoreStatsTable';
import QueryLogDb from '../db/QueryLogDb';
import StatsDb from '../db/StatsDb';
import { IDatastoreStats } from './StatsTracker';
import { translateStats } from './translateDatastoreMetadata';

export default class StatsTrackerDiskStore extends TypedEventEmitter<{
  stats: IDatastoreStatsRecord;
}> {
  public get statsDb(): StatsDb {
    this.#statsDb ??= new StatsDb(this.datastoresDir);
    return this.#statsDb;
  }

  public get queryLogDb(): QueryLogDb {
    this.#queryLogDb ??= new QueryLogDb(this.datastoresDir);
    return this.#queryLogDb;
  }

  #statsDb: StatsDb;
  #queryLogDb: QueryLogDb;

  constructor(readonly datastoresDir: string) {
    super();
  }

  async close(): Promise<void> {
    this.#statsDb?.close();
    this.#queryLogDb?.close();
    this.#statsDb = null;
    this.#queryLogDb = null;
    return Promise.resolve();
  }

  public getForDatastoreVersion(manifest: IDatastoreManifest): IDatastoreStats {
    const { version, id } = manifest;
    const statsByEntityName: IDatastoreStats['statsByEntityName'] = {};
    for (const [type, name] of [
      ...Object.keys(manifest.extractorsByName).map(x => ['Extractor', x]),
      ...Object.keys(manifest.tablesByName).map(x => ['Table', x]),
      ...Object.keys(manifest.crawlersByName).map(x => ['Crawler', x]),
    ]) {
      statsByEntityName[name] = {
        name,
        type: type as any,
        stats: translateStats(
          this.statsDb.datastoreEntities.getByVersion(id, version, name),
        ),
      };
    }

    return {
      stats: translateStats(this.statsDb.datastores.getByVersion(id, version)),
      statsByEntityName,
    };
  }

  public getForDatastore(manifest: IDatastoreManifest): IDatastoreStats {
    const { id } = manifest;
    const statsByEntityName: IDatastoreStats['statsByEntityName'] = {};
    for (const [type, name] of [
      ...Object.keys(manifest.extractorsByName).map(x => ['Extractor', x]),
      ...Object.keys(manifest.tablesByName).map(x => ['Table', x]),
      ...Object.keys(manifest.crawlersByName).map(x => ['Crawler', x]),
    ]) {
      statsByEntityName[name] = {
        name,
        type: type as any,
        stats: translateStats(this.statsDb.datastoreEntities.getByDatastore(id, name)),
      };
    }

    return {
      stats: translateStats(this.statsDb.datastores.get(id)),
      statsByEntityName,
    };
  }

  public getDatastoreSummary(id: string): { stats: IDatastoreStats['stats'] } {
    return {
      stats: translateStats(this.statsDb.datastores.get(id)),
    };
  }

  public recordEntityStats(
    details: IStatsTrackerApiTypes['StatsTracker.recordEntityStats']['args'],
  ): void {
    this.statsDb.datastoreEntities.record(
      details.datastoreId,
      details.version,
      details.entityName,
      details.microgons,
      details.bytes,
      details.milliseconds,
      details.didUseCredits ? details.microgons : 0,
      !!details.error,
    );
  }

  public recordQuery(details: IStatsTrackerApiTypes['StatsTracker.recordQuery']['args']): void {
    const { datastoreStats } = this.statsDb.datastores.record(
      details.datastoreId,
      details.version,
      details.microgons,
      details.bytes,
      details.milliseconds,
      details.creditId ? details.microgons : 0,
      !!details.error,
    );
    this.emit('stats', datastoreStats);
    this.queryLogDb.logTable.record(
      details.queryId,
      details.datastoreId,
      details.version,
      details.query,
      details.startTime,
      details.affiliateId,
      details.input,
      details.outputs,
      details.error,
      details.escrowId,
      details.creditId,
      details.microgons,
      details.bytes,
      details.milliseconds,
      details.heroSessionIds,
      details.cloudNodeHost,
      details.cloudNodeIdentity,
    );
  }
}
