import IDatastoreManifest from '@ulixee/platform-specification/types/IDatastoreManifest';
import TypedEventEmitter from '@ulixee/commons/lib/TypedEventEmitter';
import { IStatsTrackerApiTypes } from '@ulixee/platform-specification/services/StatsTrackerApis';
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

  public getForDatastore(manifest: IDatastoreManifest): IDatastoreStats {
    const versionHash = manifest.versionHash;
    const statsByEntityName: IDatastoreStats['statsByEntityName'] = {};
    for (const name of [
      ...Object.keys(manifest.extractorsByName),
      ...Object.keys(manifest.tablesByName),
      ...Object.keys(manifest.crawlersByName),
    ]) {
      statsByEntityName[name] = translateStats(
        this.statsDb.datastoreEntities.getByVersionHash(versionHash, name),
      );
    }

    return {
      stats: translateStats(this.statsDb.datastores.getByVersionHash(versionHash)),
      statsByEntityName,
    };
  }

  public recordEntityStats(
    details: IStatsTrackerApiTypes['StatsTracker.recordEntityStats']['args'],
  ): void {
    this.statsDb.datastoreEntities.record(
      details.versionHash,
      details.entityName,
      details.microgons,
      details.bytes,
      details.milliseconds,
      details.didUseCredits ? details.microgons : 0,
      !!details.error,
    );
  }

  public recordQuery(details: IStatsTrackerApiTypes['StatsTracker.recordQuery']['args']): void {
    const newStats = this.statsDb.datastores.record(
      details.versionHash,
      details.microgons,
      details.bytes,
      details.milliseconds,
      details.creditId ? details.microgons : 0,
      !!details.error,
    );
    this.emit('stats', newStats);
    this.queryLogDb.logTable.record(
      details.id,
      details.versionHash,
      details.query,
      details.startTime,
      details.affiliateId,
      details.input,
      details.outputs,
      details.error,
      details.micronoteId,
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
