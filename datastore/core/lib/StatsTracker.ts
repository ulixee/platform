import IDatastoreManifest from '@ulixee/platform-specification/types/IDatastoreManifest';
import TypedEventEmitter from '@ulixee/commons/lib/TypedEventEmitter';
import { IDatastoreEntityStatsRecord } from '../db/DatastoreEntityStatsTable';
import { IDatastoreStatsRecord } from '../db/DatastoreStatsTable';
import QueryLogDb from '../db/QueryLogDb';
import StatsDb from '../db/StatsDb';

export interface IStatsByName {
  [name: string]: IDatastoreEntityStatsRecord;
}

export type IDatastoreStats = {
  stats: IDatastoreStatsRecord;
  statsByEntityName: IStatsByName;
};

export default class StatsTracker extends TypedEventEmitter<{
  stats: IDatastoreStatsRecord;
}> {
  private get statsDb(): StatsDb {
    this.#statsDb ??= new StatsDb(this.datastoresDir);
    return this.#statsDb;
  }

  private get queryLogDb(): QueryLogDb {
    this.#queryLogDb ??= new QueryLogDb(this.datastoresDir);
    return this.#queryLogDb;
  }

  #statsDb: StatsDb;
  #queryLogDb: QueryLogDb;

  constructor(readonly datastoresDir: string) {
    super();
  }

  public close(): Promise<void> {
    this.#statsDb.close();
    this.#queryLogDb?.close();
    this.#statsDb = null;
    this.#queryLogDb = null;
    return Promise.resolve();
  }

  public getForDatastore(manifest: IDatastoreManifest): IDatastoreStats {
    const versionHash = manifest.versionHash;
    const statsByEntityName: IStatsByName = {};
    for (const name of [
      ...Object.keys(manifest.extractorsByName),
      ...Object.keys(manifest.tablesByName),
      ...Object.keys(manifest.crawlersByName),
    ]) {
      statsByEntityName[name] = this.statsDb.datastoreEntities.getByVersionHash(versionHash, name);
    }

    return {
      stats: this.statsDb.datastores.getByVersionHash(versionHash),
      statsByEntityName,
    };
  }

  public recordEntityStats(
    versionHash: string,
    name: string,
    stats: { bytes: number; microgons: number; milliseconds: number; isCredits: boolean },
    error: Error,
  ): void {
    this.statsDb.datastoreEntities.record(
      versionHash,
      name,
      stats.microgons,
      stats.bytes,
      stats.milliseconds,
      stats.isCredits ? stats.microgons : 0,
      !!error,
    );
  }

  public recordQuery(
    id: string,
    query: string,
    startTime: number,
    input: any,
    outputs: any[],
    datastoreVersionHash: string,
    stats: { bytes: number; microgons: number; milliseconds: number; isCredits: boolean },
    micronoteId: string,
    creditId: string,
    affiliateId: string,
    error?: Error,
    heroSessionIds?: string[],
  ): void {
    const newStats = this.statsDb.datastores.record(
      datastoreVersionHash,
      stats.microgons,
      stats.bytes,
      stats.milliseconds,
      stats.isCredits ? stats.microgons : 0,
      !!error,
    );
    this.emit('stats', newStats);
    this.queryLogDb.logTable.record(
      id,
      datastoreVersionHash,
      query,
      startTime,
      affiliateId,
      input,
      outputs,
      error,
      micronoteId,
      creditId,
      stats.microgons,
      stats.bytes,
      stats.milliseconds,
      heroSessionIds,
    );
  }
}
